import type { Observation } from '#modules/statistics/domain/series'
import {
  type BacktestMetric,
  type ForecastIntervalPoint,
  type ForecastRun,
  assertForecastBeatsBaseline,
} from '#modules/statistics/domain/forecast'
import ApiError from '#shared/errors/api_error'

export interface BacktestEvaluationParams {
  readonly seriesId: string
  readonly targetVintageId: string
  readonly observations: readonly Observation[]
  readonly splitIndex: number // índice a partir del cual se evalúa en test
  readonly modelName: string
  readonly predictFn: (trainHistory: readonly number[], horizon: number) => number[]
  readonly metric: BacktestMetric
  readonly horizon: number
  readonly limitations: readonly string[]
}

export function computeMae(actual: readonly number[], predicted: readonly number[]): number {
  if (actual.length === 0 || actual.length !== predicted.length) {
    throw new ApiError('E_EVALUATION', 'Cannot compute MAE with empty or mismatched vectors', 422)
  }
  let sum = 0
  for (const [i, act] of actual.entries()) {
    sum += Math.abs(act - predicted[i]!)
  }
  return Number((sum / actual.length).toFixed(4))
}

export function computeRmse(actual: readonly number[], predicted: readonly number[]): number {
  if (actual.length === 0 || actual.length !== predicted.length) {
    throw new ApiError('E_EVALUATION', 'Cannot compute RMSE with empty or mismatched vectors', 422)
  }
  let sum = 0
  for (const [i, act] of actual.entries()) {
    const diff = act - predicted[i]!
    sum += diff * diff
  }
  return Number(Math.sqrt(sum / actual.length).toFixed(4))
}

export class ForecastEvaluator {
  /**
   * Ejecuta backtesting retrospectivo de un modelo contra el baseline ingenuo (naive persistence).
   * Si el modelo propuesto supera al baseline, genera el ForecastRun con bandas de incertidumbre.
   */
  public evaluateAndBuildForecast(params: BacktestEvaluationParams): ForecastRun {
    const values = params.observations.map((o) => o.value)
    if (values.length < 6) {
      throw new ApiError(
        'E_EVALUATION',
        'Insufficient historical observations for split backtesting (min: 6)',
        422
      )
    }

    if (params.splitIndex <= 2 || params.splitIndex >= values.length) {
      throw new ApiError(
        'E_EVALUATION',
        `Invalid splitIndex: must be between 3 and ${values.length - 1}`,
        422
      )
    }

    const train = values.slice(0, params.splitIndex)
    const test = values.slice(params.splitIndex)

    // 1. Predicción del Baseline (Persistencia ingenua: valor del último periodo de entrenamiento)
    const lastTrainValue = train[train.length - 1]
    const baselinePredictions = test.map(() => lastTrainValue)

    // 2. Predicción del Modelo Candidato sobre el tramo de test
    const modelTestPredictions = params.predictFn(train, test.length)

    // 3. Cálculo de Error según la métrica elegida
    let baselineError: number
    let modelError: number

    if (params.metric === 'mae') {
      baselineError = computeMae(test, baselinePredictions)
      modelError = computeMae(test, modelTestPredictions)
    } else {
      baselineError = computeRmse(test, baselinePredictions)
      modelError = computeRmse(test, modelTestPredictions)
    }

    const beatsBaseline = modelError < baselineError

    // 4. Proyección futura con abanico de incertidumbre P10 - P50 - P90
    // Estimamos la desviación estándar de los residuos de test para calibrar las bandas
    const residuals = test.map((actual, idx) => actual - modelTestPredictions[idx])
    const meanResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length
    const variance =
      residuals.reduce((acc, r) => acc + Math.pow(r - meanResidual, 2), 0) /
      Math.max(1, residuals.length - 1)
    const stdDev = Math.sqrt(variance) || 0.1

    // Proyección hacia el horizonte futuro utilizando toda la historia conocida
    const futurePredictions = params.predictFn(values, params.horizon)

    const forecastPoints: ForecastIntervalPoint[] = futurePredictions.map((pred, i) => {
      // La incertidumbre crece proporcionalmente a la raíz del paso de horizonte
      const stepUncertainty = stdDev * Math.sqrt(i + 1) * 1.28 // aprox. percentiles 10 y 90 (z=1.28)
      const p50 = Number(pred.toFixed(2))
      const p10 = Number((pred - stepUncertainty).toFixed(2))
      const p90 = Number((pred + stepUncertainty).toFixed(2))
      return {
        period: `t+${i + 1}`,
        p10,
        p50,
        p90,
      }
    })

    const run: ForecastRun = {
      id: `forecast-${params.seriesId}-${Date.now()}`,
      seriesId: params.seriesId,
      targetVintageId: params.targetVintageId,
      modelName: params.modelName,
      baselineModel: 'naive_persistence',
      splitPeriod: params.observations[params.splitIndex].period,
      metric: params.metric,
      modelMetricValue: modelError,
      baselineMetricValue: baselineError,
      beatsBaseline,
      forecastHorizon: params.horizon,
      forecastPoints,
      epistemicStatus: 'forecast',
      limitations: [
        ...params.limitations,
        `Evaluación retrospectiva contra baseline con split en ${params.observations[params.splitIndex].period}.`,
        `Error del modelo: ${modelError} ${params.metric.toUpperCase()} vs Baseline: ${baselineError} ${params.metric.toUpperCase()}.`,
      ],
      generatedAt: new Date().toISOString(),
    }

    // Aplica el Gate innegociable de salida del Hito 5: si no supera el baseline, arroja E_BASELINE_NOT_BEATEN
    assertForecastBeatsBaseline(run)

    return run
  }
}
