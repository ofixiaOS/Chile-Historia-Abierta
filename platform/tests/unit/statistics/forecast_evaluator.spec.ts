import { test } from '@japa/runner'
import {
  ForecastEvaluator,
  computeMae,
  computeRmse,
} from '#modules/statistics/application/forecast_evaluator'
import {
  assertForecastBeatsBaseline,
  assertForecastIntervalsValid,
  type ForecastRun,
} from '#modules/statistics/domain/forecast'
import type { Observation } from '#modules/statistics/domain/series'

test.group('Statistics / ForecastEvaluator & Baseline Gate (Hito 5)', () => {
  const evaluator = new ForecastEvaluator()

  const mockObservations: readonly Observation[] = [
    { period: '2023-01', value: 10.0, status: 'normal', unit: '%' },
    { period: '2023-02', value: 9.5, status: 'normal', unit: '%' },
    { period: '2023-03', value: 9.0, status: 'normal', unit: '%' },
    { period: '2023-04', value: 8.5, status: 'normal', unit: '%' },
    { period: '2023-05', value: 8.0, status: 'normal', unit: '%' },
    { period: '2023-06', value: 7.5, status: 'normal', unit: '%' },
    { period: '2023-07', value: 7.0, status: 'normal', unit: '%' },
    { period: '2023-08', value: 6.5, status: 'normal', unit: '%' },
  ]

  test('computeMae and computeRmse calculate exact errors', ({ assert }) => {
    const actual = [10, 12, 14]
    const predicted = [11, 12, 16] // errors: 1, 0, 2

    assert.equal(computeMae(actual, predicted), 1.0)
    // sum squared errors = 1 + 0 + 4 = 5. sqrt(5/3) = sqrt(1.6667) = 1.291
    assert.equal(computeRmse(actual, predicted), 1.291)
  })

  test('computeMae rejects empty or mismatched vectors with E_EVALUATION', ({ assert }) => {
    assert.throws(() => computeMae([], []), /Cannot compute MAE/)
    assert.throws(() => computeMae([1, 2], [1]), /Cannot compute MAE/)
  })

  test('assertForecastIntervalsValid validates p10 <= p50 <= p90 and rejects inversions', ({
    assert,
  }) => {
    // Válido
    assert.doesNotThrow(() =>
      assertForecastIntervalsValid([{ period: '2024-09', p10: 5.0, p50: 6.0, p90: 7.0 }])
    )

    // Inválido: p10 > p50
    assert.throws(
      () => assertForecastIntervalsValid([{ period: '2024-09', p10: 6.5, p50: 6.0, p90: 7.0 }]),
      /Forecast interval inconsistency/
    )

    // Inválido: p50 > p90
    assert.throws(
      () => assertForecastIntervalsValid([{ period: '2024-09', p10: 5.0, p50: 7.5, p90: 7.0 }]),
      /Forecast interval inconsistency/
    )
  })

  test('Gate de Salida Hito 5: assertForecastBeatsBaseline rechaza modelo inferior o igual al baseline', ({
    assert,
  }) => {
    const superiorRun: ForecastRun = {
      id: 'f-1',
      seriesId: 's-1',
      targetVintageId: 'v-1',
      modelName: 'arima_110',
      baselineModel: 'naive_persistence',
      splitPeriod: '2023-05',
      metric: 'mae',
      modelMetricValue: 0.15,
      baselineMetricValue: 0.4,
      beatsBaseline: true,
      forecastHorizon: 2,
      forecastPoints: [
        { period: '2023-09', p10: 5.8, p50: 6.0, p90: 6.2 },
        { period: '2023-10', p10: 5.5, p50: 5.8, p90: 6.1 },
      ],
      epistemicStatus: 'forecast',
      limitations: ['Limitación metodológica'],
      generatedAt: new Date().toISOString(),
    }

    assert.doesNotThrow(() => assertForecastBeatsBaseline(superiorRun))

    // Fallo: error del modelo es mayor que el baseline
    const inferiorRun: ForecastRun = {
      ...superiorRun,
      modelMetricValue: 0.55,
      baselineMetricValue: 0.4,
      beatsBaseline: false,
    }

    assert.throws(() => assertForecastBeatsBaseline(inferiorRun), /does not outperform baseline/)

    // Fallo: empate exacto con el baseline tampoco supera el gate
    const tieRun: ForecastRun = {
      ...superiorRun,
      modelMetricValue: 0.4,
      baselineMetricValue: 0.4,
      beatsBaseline: false,
    }

    assert.throws(() => assertForecastBeatsBaseline(tieRun), /does not outperform baseline/)
  })

  test('evaluateAndBuildForecast produce ForecastRun válido cuando el modelo supera al baseline', ({
    assert,
  }) => {
    // Modelo de tendencia decreciente perfecta (-0.5 por periodo)
    const run = evaluator.evaluateAndBuildForecast({
      seriesId: 'tpm-test',
      targetVintageId: 'v-test',
      observations: mockObservations,
      splitIndex: 5, // test con observaciones 5, 6, 7 (valores: 7.5, 7.0, 6.5)
      modelName: 'perfect_linear_trend',
      predictFn: (trainHistory, horizon) => {
        const last = trainHistory[trainHistory.length - 1]
        return Array.from({ length: horizon }, (_, i) => last - 0.5 * (i + 1))
      },
      metric: 'mae',
      horizon: 3,
      limitations: ['Supuesto de tendencia decreciente uniforme'],
    })

    assert.isTrue(run.beatsBaseline)
    assert.isBelow(run.modelMetricValue, run.baselineMetricValue)
    assert.equal(run.epistemicStatus, 'forecast')
    assert.equal(run.forecastPoints.length, 3)

    // Verifica que los intervalos cumplan p10 <= p50 <= p90
    for (const pt of run.forecastPoints) {
      assert.isAtMost(pt.p10, pt.p50)
      assert.isAtMost(pt.p50, pt.p90)
    }
  })

  test('evaluateAndBuildForecast falla cerrado con E_BASELINE_NOT_BEATEN si el modelo es peor que baseline', ({
    assert,
  }) => {
    // Modelo pésimo que proyecta valores disparatados (+10 por periodo)
    assert.throws(
      () =>
        evaluator.evaluateAndBuildForecast({
          seriesId: 'tpm-test',
          targetVintageId: 'v-test',
          observations: mockObservations,
          splitIndex: 5,
          modelName: 'terrible_model',
          predictFn: (trainHistory, horizon) => {
            const last = trainHistory[trainHistory.length - 1]
            return Array.from({ length: horizon }, (_, i) => last + 10 * (i + 1))
          },
          metric: 'mae',
          horizon: 3,
          limitations: ['Modelo errático'],
        }),
      /does not outperform baseline/
    )
  })
})
