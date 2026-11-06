import type {
  Observation,
  SeriesVintage,
  SeriesVintageSummary,
  StatisticalSeries,
} from '#modules/statistics/domain/series'
import type { ForecastRun } from '#modules/statistics/domain/forecast'
import ApiError from '#shared/errors/api_error'

export interface ObservationQueryOptions {
  readonly vintageId?: string
  readonly fromPeriod?: string
  readonly toPeriod?: string
  readonly limit?: number
  readonly offset?: number
}

export interface ObservationsResult {
  readonly series: StatisticalSeries
  readonly vintage: SeriesVintage
  readonly observations: readonly Observation[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

export interface VintagePage {
  readonly items: readonly SeriesVintageSummary[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

export interface SeriesPage {
  readonly items: readonly StatisticalSeries[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

export const DEFAULT_OBSERVATION_PAGE_SIZE = 500
export const MAX_OBSERVATION_PAGE_SIZE = 1000
export const DEFAULT_VINTAGE_PAGE_SIZE = 100
export const MAX_VINTAGE_PAGE_SIZE = 500
export const MAX_VINTAGE_PAGE_OFFSET = 10_000
export const DEFAULT_SERIES_PAGE_SIZE = 100
export const MAX_SERIES_PAGE_SIZE = 500

export interface StatisticsRepository {
  findSeriesById(id: string): Promise<StatisticalSeries | null>
  listSeries(limit: number, offset: number): Promise<SeriesPage>
  findVintageById(vintageId: string): Promise<SeriesVintage | null>
  findVintageSeriesId(vintageId: string): Promise<string | null>
  listVintages(seriesId: string, limit: number, offset: number): Promise<VintagePage>
  saveSeries(series: StatisticalSeries): Promise<void>
  saveVintage(vintage: SeriesVintage): Promise<void>
  saveForecast(forecast: ForecastRun): Promise<void>
  findForecastById(id: string): Promise<ForecastRun | null>
}

export class StatisticsService {
  constructor(private readonly repository: StatisticsRepository) {}

  public async getSeries(id: string): Promise<StatisticalSeries> {
    const series = await this.repository.findSeriesById(id)
    if (!series) {
      throw new ApiError('E_NOT_FOUND', `Statistical series "${id}" was not found`, 404)
    }
    return series
  }

  public async listSeries(limit = DEFAULT_SERIES_PAGE_SIZE, offset = 0): Promise<SeriesPage> {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_SERIES_PAGE_SIZE ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > MAX_VINTAGE_PAGE_OFFSET
    ) {
      throw new ApiError('E_VALIDATION', 'Invalid series pagination', 422)
    }
    const page = await this.repository.listSeries(limit, offset)
    return { ...page, limit, offset }
  }

  public async listVintages(
    seriesId: string,
    limit = DEFAULT_VINTAGE_PAGE_SIZE,
    offset = 0
  ): Promise<VintagePage> {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_VINTAGE_PAGE_SIZE ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > MAX_VINTAGE_PAGE_OFFSET
    ) {
      throw new ApiError('E_VALIDATION', 'Invalid vintage pagination', 422)
    }
    // Verificar que la serie existe primero
    await this.getSeries(seriesId)
    const page = await this.repository.listVintages(seriesId, limit, offset)
    return { ...page, limit, offset }
  }

  public async getObservations(
    seriesId: string,
    options: ObservationQueryOptions = {}
  ): Promise<ObservationsResult> {
    const series = await this.getSeries(seriesId)

    const targetVintageId = options.vintageId ?? series.currentVintageId
    const vintage = await this.repository.findVintageById(targetVintageId)
    if (!vintage || vintage.seriesId !== seriesId) {
      throw new ApiError(
        'E_NOT_FOUND',
        `Vintage "${targetVintageId}" for series "${seriesId}" was not found`,
        404
      )
    }

    let filtered = vintage.observations

    if (options.fromPeriod) {
      filtered = filtered.filter((o) => o.period >= options.fromPeriod!)
    }

    if (options.toPeriod) {
      filtered = filtered.filter((o) => o.period <= options.toPeriod!)
    }

    const offset = options.offset ?? 0
    const limit = options.limit ?? DEFAULT_OBSERVATION_PAGE_SIZE
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_OBSERVATION_PAGE_SIZE ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > MAX_VINTAGE_PAGE_OFFSET
    ) {
      throw new ApiError('E_VALIDATION', 'Invalid observation pagination', 422)
    }
    const total = filtered.length
    const observations = filtered.slice(offset, offset + limit)

    return {
      series,
      vintage,
      observations,
      total,
      limit,
      offset,
    }
  }

  public async getForecast(id: string): Promise<ForecastRun> {
    const forecast = await this.repository.findForecastById(id)
    if (!forecast) {
      throw new ApiError('E_NOT_FOUND', `Forecast run "${id}" was not found`, 404)
    }
    const vintageSeriesId = await this.repository.findVintageSeriesId(forecast.targetVintageId)
    if (vintageSeriesId !== forecast.seriesId) {
      throw new ApiError('E_DATA_INTEGRITY', 'Forecast provenance is unavailable', 503)
    }
    return forecast
  }

  public async saveForecast(forecast: ForecastRun): Promise<void> {
    await this.repository.saveForecast(forecast)
  }
}
