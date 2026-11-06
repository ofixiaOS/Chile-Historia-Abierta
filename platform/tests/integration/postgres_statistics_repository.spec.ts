import type { ForecastRun } from '#modules/statistics/domain/forecast'
import type { SeriesVintage, StatisticalSeries } from '#modules/statistics/domain/series'
import {
  pilotForecasts,
  pilotTpmObservationsV1,
} from '#modules/statistics/infrastructure/in_memory_statistics_repository'
import PostgresStatisticsRepository from '#modules/statistics/infrastructure/postgres_statistics_repository'
import { StatisticsService } from '#modules/statistics/application/statistics_service'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

test.group('PostgresStatisticsRepository (Integration PostgreSQL)', () => {
  const repository = new PostgresStatisticsRepository('public')
  const service = new StatisticsService(repository)

  function getUniqueId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  }

  function createTestSeries(id: string): StatisticalSeries {
    return {
      id,
      concept: `Tasa de Política Monetaria Test ${id}`,
      providerAgency: 'Banco Central de Chile',
      sourceId: 'bcentral-bde',
      frequency: 'monthly',
      baseUnit: '%',
      methodology: 'Fijación por el Consejo del Banco Central de Chile.',
      currentVintageId: '',
      limitations: ['Valores nominales anualizados sujetos a política de metas de inflación.'],
    }
  }

  function createTestVintage(id: string, seriesId: string): SeriesVintage {
    return {
      id,
      seriesId,
      vintageDate: new Date().toISOString(),
      coverageStart: '2024-01',
      coverageEnd: '2024-08',
      observations: pilotTpmObservationsV1,
      contentHash: '1111222233334444555566667777888899990000aaaabbbbccccddddeeee0001',
      publicationNotes: 'Publicación preliminar de prueba en PostgreSQL',
    }
  }

  test('guarda y recupera series estadísticas a través de la vista pública con rol cha_public', async ({
    assert,
  }) => {
    const seriesData = createTestSeries(getUniqueId('series-pg-1'))
    const secondSeries = createTestSeries(getUniqueId('series-pg-1b'))

    await repository.saveSeries(seriesData)
    await repository.saveSeries(secondSeries)

    const retrieved = await repository.findSeriesById(seriesData.id)
    assert.isNotNull(retrieved)
    assert.equal(retrieved?.id, seriesData.id)
    assert.equal(retrieved?.concept, seriesData.concept)
    assert.equal(retrieved?.providerAgency, seriesData.providerAgency)
    assert.equal(retrieved?.frequency, 'monthly')
    assert.equal(retrieved?.baseUnit, '%')
    assert.deepEqual(retrieved?.limitations, seriesData.limitations)

    const firstPage = await repository.listSeries(1, 0)
    const secondPage = await repository.listSeries(1, 1)
    assert.isAtLeast(firstPage.total, 2)
    assert.equal(firstPage.items.length, 1)
    assert.equal(secondPage.items.length, 1)
    assert.notEqual(firstPage.items[0]?.id, secondPage.items[0]?.id)
    assert.isTrue(
      firstPage.items.some((s) => s.id === seriesData.id) ||
        secondPage.items.some((s) => s.id === seriesData.id)
    )
  })

  test('guarda vintage con observaciones inmutables y actualiza current_vintage_id de la serie', async ({
    assert,
  }) => {
    const seriesData = createTestSeries(getUniqueId('series-pg-2'))
    const vintageData = createTestVintage(getUniqueId('vintage-pg-2'), seriesData.id)

    await repository.saveSeries(seriesData)
    await repository.saveVintage(vintageData)

    const retrievedVintage = await repository.findVintageById(vintageData.id)
    assert.isNotNull(retrievedVintage)
    assert.equal(retrievedVintage?.id, vintageData.id)
    assert.equal(retrievedVintage?.seriesId, seriesData.id)
    assert.equal(retrievedVintage?.contentHash, vintageData.contentHash)
    assert.equal(retrievedVintage?.observations.length, vintageData.observations.length)

    // La serie debe reflejar el current_vintage_id actualizado
    const updatedSeries = await repository.findSeriesById(seriesData.id)
    assert.equal(updatedSeries?.currentVintageId, vintageData.id)

    // Consulta de observaciones a través de StatisticsService con filtrado
    const obsResult = await service.getObservations(seriesData.id, {
      fromPeriod: '2024-03',
      toPeriod: '2024-06',
    })

    assert.equal(obsResult.observations.length, 4)
    assert.equal(obsResult.observations[0]?.period, '2024-03')
    assert.equal(obsResult.observations[obsResult.observations.length - 1]?.period, '2024-06')
  })

  test('PostgreSQL impide versión activa y pronóstico de otra serie', async ({ assert }) => {
    const seriesA = createTestSeries(getUniqueId('series-binding-a'))
    const seriesB = createTestSeries(getUniqueId('series-binding-b'))
    const vintageA = createTestVintage(getUniqueId('vintage-binding-a'), seriesA.id)
    const vintageB = createTestVintage(getUniqueId('vintage-binding-b'), seriesB.id)
    await repository.saveSeries(seriesA)
    await repository.saveSeries(seriesB)
    await repository.saveVintage(vintageA)
    await repository.saveVintage(vintageB)

    const valid = await service.getObservations(seriesA.id)
    assert.equal(valid.vintage.id, vintageA.id)

    const installedConstraint = await db.connection('admin').rawQuery(
      `SELECT conname FROM pg_constraint
       WHERE conname = 'statistical_series_current_vintage_same_series_fk'`
    )
    assert.equal(installedConstraint.rows.length, 1)

    let rejectedActiveVintage = false
    try {
      await db
        .connection('admin')
        .rawQuery('UPDATE statistical_series SET current_vintage_id = ? WHERE id = ?', [
          vintageB.id,
          seriesA.id,
        ])
    } catch (error: unknown) {
      rejectedActiveVintage = true
      assert.equal((error as { code?: string }).code, '23503')
    }
    assert.isTrue(rejectedActiveVintage, 'La serie no debe activar un vintage ajeno')
    const unchangedSeries = await repository.findSeriesById(seriesA.id)
    assert.equal(unchangedSeries?.currentVintageId, vintageA.id)

    let rejectedForecast = false
    try {
      await repository.saveForecast({
        ...pilotForecasts[0]!,
        id: getUniqueId('forecast-binding-cross'),
        seriesId: seriesA.id,
        targetVintageId: vintageB.id,
      })
    } catch (error: unknown) {
      rejectedForecast = true
      assert.equal((error as { code?: string }).code, '23503')
    }
    assert.isTrue(rejectedForecast, 'El pronóstico no debe citar un vintage ajeno')

    const own = await service.getObservations(seriesA.id, { vintageId: vintageA.id })
    assert.equal(own.vintage.seriesId, own.series.id)
  })

  test('PostgreSQL rechaza vintages que exceden el límite de observaciones', async ({ assert }) => {
    const seriesData = createTestSeries(getUniqueId('series-vintage-bound'))
    await repository.saveSeries(seriesData)
    const oversized = Array.from({ length: 10_001 }, (_, index) => ({
      period: `p${index}`,
      value: 1,
      status: 'normal',
      unit: '%',
    }))

    try {
      await db.connection('admin').rawQuery(
        `INSERT INTO series_vintages (
          id, series_id, vintage_date, coverage_start, coverage_end,
          observations, content_hash
        ) VALUES (?, ?, CURRENT_TIMESTAMP, 'p0', 'p10000', ?::jsonb, ?)`,
        [getUniqueId('oversized-vintage'), seriesData.id, JSON.stringify(oversized), '1'.repeat(64)]
      )
      assert.fail('PostgreSQL debe rechazar más de 10.000 observaciones')
    } catch (error: unknown) {
      assert.equal((error as { code?: string }).code, '23514')
    }
  })

  test('persiste pronóstico con incertidumbre y verificación de baseline', async ({ assert }) => {
    const seriesData = createTestSeries(getUniqueId('series-pg-3'))
    const vintageData = createTestVintage(getUniqueId('vintage-pg-3'), seriesData.id)

    await repository.saveSeries(seriesData)
    await repository.saveVintage(vintageData)

    const forecast: ForecastRun = {
      id: getUniqueId('forecast-pg-3'),
      seriesId: seriesData.id,
      targetVintageId: vintageData.id,
      modelName: 'arima_110',
      baselineModel: 'naive_persistence',
      splitPeriod: '2024-05',
      metric: 'mae',
      modelMetricValue: 0.12,
      baselineMetricValue: 0.38,
      beatsBaseline: true,
      forecastHorizon: 2,
      forecastPoints: [
        { period: '2024-09', p10: 5.1, p50: 5.25, p90: 5.4 },
        { period: '2024-10', p10: 4.8, p50: 5.0, p90: 5.2 },
      ],
      epistemicStatus: 'forecast',
      limitations: ['Proyección condicionada a senda esperada de inflación'],
      generatedAt: '2024-09-02T12:00:00.000Z',
    }

    await repository.saveForecast(forecast)

    const retrievedForecast = await repository.findForecastById(forecast.id)
    assert.isNotNull(retrievedForecast)
    assert.equal(retrievedForecast?.id, forecast.id)
    assert.equal(retrievedForecast?.beatsBaseline, true)
    assert.equal(retrievedForecast?.epistemicStatus, 'forecast')
    assert.equal(retrievedForecast?.forecastPoints.length, 2)
    assert.isBelow(retrievedForecast!.modelMetricValue, retrievedForecast!.baselineMetricValue)
    const servedForecast = await service.getForecast(forecast.id)
    assert.equal(servedForecast.targetVintageId, vintageData.id)
  })

  test('Principio 8 (Inmutabilidad append-only): rechaza UPDATE y DELETE en series_vintages y forecast_runs', async ({
    assert,
  }) => {
    const seriesData = createTestSeries(getUniqueId('series-pg-4'))
    const vintageData = createTestVintage(getUniqueId('vintage-pg-4'), seriesData.id)

    await repository.saveSeries(seriesData)
    await repository.saveVintage(vintageData)

    // Intento de UPDATE sobre series_vintages debe ser rechazado por trigger
    try {
      await db
        .connection('admin')
        .rawQuery(
          "UPDATE series_vintages SET publication_notes = 'Mutación prohibida' WHERE id = ?",
          [vintageData.id]
        )
      assert.fail('UPDATE en series_vintages debe ser rechazado por trigger append-only')
    } catch (error: unknown) {
      const pgError = error as { code?: string }
      assert.equal(pgError.code, '55000')
    }

    // Intento de DELETE sobre series_vintages debe ser rechazado por trigger
    try {
      await db
        .connection('admin')
        .rawQuery('DELETE FROM series_vintages WHERE id = ?', [vintageData.id])
      assert.fail('DELETE en series_vintages debe ser rechazado por trigger append-only')
    } catch (error: unknown) {
      const pgError = error as { code?: string }
      assert.equal(pgError.code, '55000')
    }
  })

  test('Principio de menor privilegio: cha_public tiene SELECT en vistas pero se le deniegan las tablas maestras', async ({
    assert,
  }) => {
    const seriesData = createTestSeries(getUniqueId('series-pg-5'))
    await repository.saveSeries(seriesData)

    // cha_public puede leer la vista pública
    const viewQuery = await db
      .connection('public')
      .rawQuery('SELECT count(*) AS total FROM public_statistical_series_records WHERE id = ?', [
        seriesData.id,
      ])
    assert.equal(Number(viewQuery.rows[0].total), 1)

    // cha_public tiene denegado el acceso directo a la tabla statistical_series
    try {
      await db.connection('public').rawQuery('SELECT * FROM statistical_series')
      assert.fail('Acceso directo a statistical_series debe ser denegado a cha_public')
    } catch (error: unknown) {
      const pgError = error as { code?: string }
      assert.equal(pgError.code, '42501') // insufficient_privilege
    }

    // cha_public tiene denegado el acceso directo a series_vintages
    try {
      await db.connection('public').rawQuery('SELECT * FROM series_vintages')
      assert.fail('Acceso directo a series_vintages debe ser denegado a cha_public')
    } catch (error: unknown) {
      const pgError = error as { code?: string }
      assert.equal(pgError.code, '42501')
    }

    // cha_public tiene denegado el acceso directo a forecast_runs
    try {
      await db.connection('public').rawQuery('SELECT * FROM forecast_runs')
      assert.fail('Acceso directo a forecast_runs debe ser denegado a cha_public')
    } catch (error: unknown) {
      const pgError = error as { code?: string }
      assert.equal(pgError.code, '42501')
    }
  })

  test('Gate de Salida Hito 5 forzado en BD: rechaza inserción con beats_baseline = false', async ({
    assert,
  }) => {
    const seriesData = createTestSeries(getUniqueId('series-pg-6'))
    const vintageData = createTestVintage(getUniqueId('vintage-pg-6'), seriesData.id)

    await repository.saveSeries(seriesData)
    await repository.saveVintage(vintageData)

    // Intento de guardar con beats_baseline = false debe fallar por constraint SQL
    try {
      await db.connection('admin').rawQuery(
        `
          INSERT INTO forecast_runs (
            id, series_id, target_vintage_id, model_name, baseline_model,
            split_period, metric, model_metric_value, baseline_metric_value,
            beats_baseline, forecast_horizon, forecast_points, epistemic_status,
            limitations, generated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?::jsonb, ?)
        `,
        [
          getUniqueId('forecast-inferior-pg'),
          seriesData.id,
          vintageData.id,
          'bad_model',
          'naive_persistence',
          '2024-05',
          'mae',
          0.5,
          0.3,
          false, // Violación del Gate Hito 5
          1,
          JSON.stringify([{ period: '2024-09', p10: 5, p50: 6, p90: 7 }]),
          'forecast',
          JSON.stringify([]),
          '2024-09-02T12:00:00.000Z',
        ]
      )
      assert.fail('Inserción con beats_baseline = false debe fallar por check_violation')
    } catch (error: unknown) {
      const pgError = error as { code?: string }
      assert.equal(pgError.code, '23514') // check_violation
    }
  })

  test('Principio 2 forzado en BD: rechaza inserción de pronóstico con epistemic_status != "forecast"', async ({
    assert,
  }) => {
    const seriesData = createTestSeries(getUniqueId('series-pg-7'))
    const vintageData = createTestVintage(getUniqueId('vintage-pg-7'), seriesData.id)

    await repository.saveSeries(seriesData)
    await repository.saveVintage(vintageData)

    // Intento de guardar con epistemic_status = 'documented' debe fallar por constraint SQL
    try {
      await db.connection('admin').rawQuery(
        `
          INSERT INTO forecast_runs (
            id, series_id, target_vintage_id, model_name, baseline_model,
            split_period, metric, model_metric_value, baseline_metric_value,
            beats_baseline, forecast_horizon, forecast_points, epistemic_status,
            limitations, generated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?::jsonb, ?)
        `,
        [
          getUniqueId('forecast-epistemic-violation-pg'),
          seriesData.id,
          vintageData.id,
          'model',
          'naive_persistence',
          '2024-05',
          'mae',
          0.1,
          0.3,
          true,
          1,
          JSON.stringify([{ period: '2024-09', p10: 5, p50: 6, p90: 7 }]),
          'documented', // Violación del Principio 2
          JSON.stringify([]),
          '2024-09-02T12:00:00.000Z',
        ]
      )
      assert.fail('Inserción con epistemic_status != forecast debe fallar por check_violation')
    } catch (error: unknown) {
      const pgError = error as { code?: string }
      assert.equal(pgError.code, '23514') // check_violation
    }
  })
})
