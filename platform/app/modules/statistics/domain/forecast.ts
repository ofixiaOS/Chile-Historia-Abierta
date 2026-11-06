import ApiError from '#shared/errors/api_error'

export type BacktestMetric = 'mae' | 'rmse' | 'mape'

export interface ForecastIntervalPoint {
  readonly period: string
  readonly p10: number
  readonly p50: number
  readonly p90: number
}

export interface ForecastRun {
  readonly id: string
  readonly seriesId: string
  readonly targetVintageId: string
  readonly modelName: string
  readonly baselineModel: string
  readonly splitPeriod: string
  readonly metric: BacktestMetric
  readonly modelMetricValue: number
  readonly baselineMetricValue: number
  readonly beatsBaseline: boolean
  readonly forecastHorizon: number
  readonly forecastPoints: readonly ForecastIntervalPoint[]
  readonly epistemicStatus: 'forecast'
  readonly limitations: readonly string[]
  readonly generatedAt: string
}

export function assertForecastIntervalsValid(points: readonly ForecastIntervalPoint[]): void {
  if (points.length === 0) {
    throw new ApiError('E_INVALID_FORECAST', 'Forecast must contain at least one point', 422)
  }
  for (const pt of points) {
    if (!Number.isFinite(pt.p10) || !Number.isFinite(pt.p50) || !Number.isFinite(pt.p90)) {
      throw new ApiError(
        'E_INVALID_FORECAST',
        `Forecast intervals for period ${pt.period} must be finite numbers`,
        422
      )
    }
    if (pt.p10 > pt.p50 || pt.p50 > pt.p90) {
      throw new ApiError(
        'E_INVALID_FORECAST',
        `Forecast interval inconsistency for period ${pt.period}: expected p10 <= p50 <= p90 (got p10=${pt.p10}, p50=${pt.p50}, p90=${pt.p90})`,
        422
      )
    }
  }
}

/**
 * Gate de salida innegociable del Hito 5:
 * Un modelo no se publica como predictivo si no supera el baseline bajo criterio definido.
 */
export function assertForecastBeatsBaseline(run: ForecastRun): void {
  if (run.epistemicStatus !== 'forecast') {
    throw new ApiError(
      'E_EPISTEMIC_VIOLATION',
      `Forecast epistemicStatus must be strictly "forecast" (got "${run.epistemicStatus}")`,
      422
    )
  }

  assertForecastIntervalsValid(run.forecastPoints)

  if (!Number.isFinite(run.modelMetricValue) || !Number.isFinite(run.baselineMetricValue)) {
    throw new ApiError('E_INVALID_FORECAST', 'Backtest metrics must be finite numbers', 422)
  }

  // En métricas de error (MAE, RMSE, MAPE), menor valor indica mejor desempeño
  const margin = run.baselineMetricValue - run.modelMetricValue
  if (margin <= 0 || !run.beatsBaseline) {
    throw new ApiError(
      'E_BASELINE_NOT_BEATEN',
      `Model performance (${run.modelName}: ${run.modelMetricValue} ${run.metric.toUpperCase()}) does not outperform baseline (${run.baselineModel}: ${run.baselineMetricValue} ${run.metric.toUpperCase()}). Gate de Salida Hito 5 incumplido: publicación rechazada.`,
      422
    )
  }
}
