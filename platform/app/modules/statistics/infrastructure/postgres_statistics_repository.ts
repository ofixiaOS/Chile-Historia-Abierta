import type {
  SeriesPage,
  StatisticsRepository,
  VintagePage,
} from '#modules/statistics/application/statistics_service'
import type { ForecastIntervalPoint, ForecastRun } from '#modules/statistics/domain/forecast'
import {
  assertVintageIntegrity,
  type Observation,
  type ObservationStatus,
  type SeriesVintage,
  type SeriesVintageSummary,
  type StatisticalFrequency,
  type StatisticalSeries,
} from '#modules/statistics/domain/series'
import db from '@adonisjs/lucid/services/db'

interface PublicStatisticalSeriesRow {
  id: string
  concept: string
  provider_agency: string
  source_id: string
  frequency: string
  base_unit: string
  methodology: string
  current_vintage_id: string | null
  limitations: string[] | string
  created_at: Date | string
  updated_at: Date | string
}

interface PublicSeriesVintageRow {
  id: string
  series_id: string
  vintage_date: Date | string
  coverage_start: string
  coverage_end: string
  observations: Observation[] | string
  content_hash: string
  publication_notes: string | null
  created_at: Date | string
}

interface PublicSeriesVintageSummaryRow {
  id: string
  series_id: string
  vintage_date: Date | string
  coverage_start: string
  coverage_end: string
  observation_count: number | string
  content_hash: string
  publication_notes: string | null
}

interface PublicForecastRunRow {
  id: string
  series_id: string
  target_vintage_id: string
  model_name: string
  baseline_model: string
  split_period: string
  metric: string
  model_metric_value: number | string
  baseline_metric_value: number | string
  beats_baseline: boolean
  forecast_horizon: number | string
  forecast_points: ForecastIntervalPoint[] | string
  epistemic_status: string
  limitations: string[] | string
  generated_at: Date | string
  created_at: Date | string
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function parseJsonField<T>(field: T | string | null | undefined, defaultValue: T): T {
  if (field === null || field === undefined) {
    return defaultValue
  }
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T
    } catch {
      return defaultValue
    }
  }
  return field
}

function mapRowToSeries(row: PublicStatisticalSeriesRow): StatisticalSeries {
  const limitations = parseJsonField<string[]>(row.limitations, [])

  return {
    id: row.id,
    concept: row.concept,
    providerAgency: row.provider_agency,
    sourceId: row.source_id,
    frequency: row.frequency as StatisticalFrequency,
    baseUnit: row.base_unit,
    methodology: row.methodology,
    currentVintageId: row.current_vintage_id ?? '',
    limitations,
  }
}

function mapRowToVintage(row: PublicSeriesVintageRow): SeriesVintage {
  const rawObservations = parseJsonField<Observation[]>(row.observations, [])
  const observations: readonly Observation[] = rawObservations.map((obs) => ({
    period: obs.period,
    value: Number(obs.value),
    status: obs.status as ObservationStatus,
    unit: obs.unit,
    ...(obs.locator ? { locator: obs.locator } : {}),
  }))

  return {
    id: row.id,
    seriesId: row.series_id,
    vintageDate: toIsoString(row.vintage_date),
    coverageStart: row.coverage_start,
    coverageEnd: row.coverage_end,
    observations,
    contentHash: row.content_hash.trim(),
    ...(row.publication_notes ? { publicationNotes: row.publication_notes } : {}),
  }
}

function mapRowToVintageSummary(row: PublicSeriesVintageSummaryRow): SeriesVintageSummary {
  return {
    id: row.id,
    seriesId: row.series_id,
    vintageDate: toIsoString(row.vintage_date),
    coverageStart: row.coverage_start,
    coverageEnd: row.coverage_end,
    observationCount: Number(row.observation_count),
    contentHash: row.content_hash,
    ...(row.publication_notes ? { publicationNotes: row.publication_notes } : {}),
  }
}

function mapRowToForecast(row: PublicForecastRunRow): ForecastRun {
  const limitations = parseJsonField<string[]>(row.limitations, [])
  const rawPoints = parseJsonField<ForecastIntervalPoint[]>(row.forecast_points, [])
  const forecastPoints: readonly ForecastIntervalPoint[] = rawPoints.map((pt) => ({
    period: pt.period,
    p10: Number(pt.p10),
    p50: Number(pt.p50),
    p90: Number(pt.p90),
  }))

  return {
    id: row.id,
    seriesId: row.series_id,
    targetVintageId: row.target_vintage_id,
    modelName: row.model_name,
    baselineModel: row.baseline_model,
    splitPeriod: row.split_period,
    metric: row.metric as 'mae' | 'rmse' | 'mape',
    modelMetricValue: Number(row.model_metric_value),
    baselineMetricValue: Number(row.baseline_metric_value),
    beatsBaseline: Boolean(row.beats_baseline),
    forecastHorizon: Number(row.forecast_horizon),
    forecastPoints,
    epistemicStatus: 'forecast',
    limitations,
    generatedAt: toIsoString(row.generated_at),
  }
}

export default class PostgresStatisticsRepository implements StatisticsRepository {
  constructor(private readonly readConnection: 'public' | 'admin' = 'public') {}

  async findSeriesById(id: string): Promise<StatisticalSeries | null> {
    const result = await db.connection(this.readConnection).rawQuery(
      `
        SELECT *
        FROM public_statistical_series_records
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    )

    const row = result.rows[0] as PublicStatisticalSeriesRow | undefined
    return row ? mapRowToSeries(row) : null
  }

  async listSeries(limit: number, offset: number): Promise<SeriesPage> {
    const connection = db.connection(this.readConnection)
    const [result, countResult] = await Promise.all([
      connection.rawQuery(
        `SELECT * FROM public_statistical_series_records ORDER BY id ASC LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
      connection.rawQuery(
        'SELECT count(*)::bigint AS total FROM public_statistical_series_records'
      ),
    ])
    return {
      items: (result.rows as PublicStatisticalSeriesRow[]).map(mapRowToSeries),
      total: Number((countResult.rows[0] as { total: number | string }).total),
      limit,
      offset,
    }
  }

  async findVintageById(vintageId: string): Promise<SeriesVintage | null> {
    const result = await db.connection(this.readConnection).rawQuery(
      `
        SELECT *
        FROM public_series_vintage_records
        WHERE id = ?
        LIMIT 1
      `,
      [vintageId]
    )

    const row = result.rows[0] as PublicSeriesVintageRow | undefined
    return row ? mapRowToVintage(row) : null
  }

  async findVintageSeriesId(vintageId: string): Promise<string | null> {
    const result = await db
      .connection(this.readConnection)
      .rawQuery(`SELECT series_id FROM public_series_vintage_records WHERE id = ? LIMIT 1`, [
        vintageId,
      ])
    return (result.rows[0] as { series_id: string } | undefined)?.series_id ?? null
  }

  async listVintages(seriesId: string, limit: number, offset: number): Promise<VintagePage> {
    const connection = db.connection(this.readConnection)
    const [result, countResult] = await Promise.all([
      connection.rawQuery(
        `
        SELECT id, series_id, vintage_date, coverage_start, coverage_end,
               jsonb_array_length(observations) AS observation_count,
               content_hash, publication_notes
        FROM public_series_vintage_records
        WHERE series_id = ?
        ORDER BY vintage_date DESC, id DESC
        LIMIT ? OFFSET ?
      `,
        [seriesId, limit, offset]
      ),
      connection.rawQuery(
        'SELECT count(*)::bigint AS total FROM public_series_vintage_records WHERE series_id = ?',
        [seriesId]
      ),
    ])

    const total = Number((countResult.rows[0] as { total: number | string }).total)
    return {
      items: (result.rows as PublicSeriesVintageSummaryRow[]).map(mapRowToVintageSummary),
      total,
      limit,
      offset,
    }
  }

  async saveSeries(series: StatisticalSeries): Promise<void> {
    await db.connection('admin').transaction(async (trx) => {
      let targetVintageId: string | null = null
      if (series.currentVintageId) {
        const vintageCheck = await trx.rawQuery(
          'SELECT id FROM series_vintages WHERE id = ? LIMIT 1',
          [series.currentVintageId]
        )
        if (vintageCheck.rows.length > 0) {
          targetVintageId = series.currentVintageId
        }
      }

      const currentVintagePlaceholder = targetVintageId ? '?' : 'NULL'
      await trx.rawQuery(
        `
          INSERT INTO statistical_series (
            id, concept, provider_agency, source_id, frequency,
            base_unit, methodology, current_vintage_id, limitations, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ${currentVintagePlaceholder}, ?::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            concept = EXCLUDED.concept,
            provider_agency = EXCLUDED.provider_agency,
            source_id = EXCLUDED.source_id,
            frequency = EXCLUDED.frequency,
            base_unit = EXCLUDED.base_unit,
            methodology = EXCLUDED.methodology,
            current_vintage_id = COALESCE(EXCLUDED.current_vintage_id, statistical_series.current_vintage_id),
            limitations = EXCLUDED.limitations,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          series.id,
          series.concept,
          series.providerAgency,
          series.sourceId,
          series.frequency,
          series.baseUnit,
          series.methodology,
          ...(targetVintageId ? [targetVintageId] : []),
          JSON.stringify(series.limitations ?? []),
        ]
      )
    })
  }

  async saveVintage(vintage: SeriesVintage): Promise<void> {
    assertVintageIntegrity(vintage)
    await db.connection('admin').transaction(async (trx) => {
      const publicationNotesPlaceholder = vintage.publicationNotes ? '?' : 'NULL'

      await trx.rawQuery(
        `
          INSERT INTO series_vintages (
            id, series_id, vintage_date, coverage_start, coverage_end,
            observations, content_hash, publication_notes
          ) VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ${publicationNotesPlaceholder})
        `,
        [
          vintage.id,
          vintage.seriesId,
          vintage.vintageDate,
          vintage.coverageStart,
          vintage.coverageEnd,
          JSON.stringify(vintage.observations),
          vintage.contentHash,
          ...(vintage.publicationNotes ? [vintage.publicationNotes] : []),
        ]
      )

      await trx.rawQuery(
        `
          UPDATE statistical_series
          SET current_vintage_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [vintage.id, vintage.seriesId]
      )
    })
  }

  async saveForecast(forecast: ForecastRun): Promise<void> {
    await db.connection('admin').transaction(async (trx) => {
      await trx.rawQuery(
        `
          INSERT INTO forecast_runs (
            id, series_id, target_vintage_id, model_name, baseline_model,
            split_period, metric, model_metric_value, baseline_metric_value,
            beats_baseline, forecast_horizon, forecast_points, epistemic_status,
            limitations, generated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?::jsonb, ?)
        `,
        [
          forecast.id,
          forecast.seriesId,
          forecast.targetVintageId,
          forecast.modelName,
          forecast.baselineModel,
          forecast.splitPeriod,
          forecast.metric,
          forecast.modelMetricValue,
          forecast.baselineMetricValue,
          forecast.beatsBaseline,
          forecast.forecastHorizon,
          JSON.stringify(forecast.forecastPoints),
          forecast.epistemicStatus,
          JSON.stringify(forecast.limitations ?? []),
          forecast.generatedAt,
        ]
      )
    })
  }

  async findForecastById(id: string): Promise<ForecastRun | null> {
    const result = await db.connection(this.readConnection).rawQuery(
      `
        SELECT *
        FROM public_forecast_run_records
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    )

    const row = result.rows[0] as PublicForecastRunRow | undefined
    return row ? mapRowToForecast(row) : null
  }
}
