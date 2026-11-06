import {
  assertVintageIntegrity,
  type Observation,
  type SeriesVintage,
  type SeriesVintageSummary,
  type StatisticalSeries,
} from '#modules/statistics/domain/series'
import type { ForecastRun } from '#modules/statistics/domain/forecast'
import type {
  SeriesPage,
  StatisticsRepository,
  VintagePage,
} from '#modules/statistics/application/statistics_service'

export const pilotTpmObservationsV1: readonly Observation[] = [
  { period: '2024-01', value: 8.25, status: 'normal', unit: '%', locator: 'obs-01' },
  { period: '2024-02', value: 7.25, status: 'normal', unit: '%', locator: 'obs-02' },
  { period: '2024-03', value: 7.25, status: 'normal', unit: '%', locator: 'obs-03' },
  { period: '2024-04', value: 6.5, status: 'normal', unit: '%', locator: 'obs-04' },
  { period: '2024-05', value: 6.0, status: 'normal', unit: '%', locator: 'obs-05' },
  { period: '2024-06', value: 5.75, status: 'normal', unit: '%', locator: 'obs-06' },
  { period: '2024-07', value: 5.75, status: 'normal', unit: '%', locator: 'obs-07' },
  { period: '2024-08', value: 5.5, status: 'provisional', unit: '%', locator: 'obs-08' },
]

export const pilotTpmObservationsV2: readonly Observation[] = [
  { period: '2024-01', value: 8.25, status: 'normal', unit: '%', locator: 'obs-01' },
  { period: '2024-02', value: 7.25, status: 'normal', unit: '%', locator: 'obs-02' },
  { period: '2024-03', value: 7.25, status: 'normal', unit: '%', locator: 'obs-03' },
  { period: '2024-04', value: 6.5, status: 'normal', unit: '%', locator: 'obs-04' },
  { period: '2024-05', value: 6.0, status: 'normal', unit: '%', locator: 'obs-05' },
  { period: '2024-06', value: 5.75, status: 'normal', unit: '%', locator: 'obs-06' },
  { period: '2024-07', value: 5.75, status: 'normal', unit: '%', locator: 'obs-07' },
  { period: '2024-08', value: 5.5, status: 'revised', unit: '%', locator: 'obs-08' },
]

export const pilotVintages: readonly SeriesVintage[] = [
  {
    id: 'vintage-bcentral-tpm-2024-v1',
    seriesId: 'bcentral-tpm',
    vintageDate: '2024-08-15T00:00:00.000Z',
    coverageStart: '2024-01',
    coverageEnd: '2024-08',
    observations: pilotTpmObservationsV1,
    contentHash: '1111222233334444555566667777888899990000aaaabbbbccccddddeeee0001',
    publicationNotes: 'Publicación preliminar con dato provisional de agosto 2024',
  },
  {
    id: 'vintage-bcentral-tpm-2024-v2',
    seriesId: 'bcentral-tpm',
    vintageDate: '2024-09-01T00:00:00.000Z',
    coverageStart: '2024-01',
    coverageEnd: '2024-08',
    observations: pilotTpmObservationsV2,
    contentHash: '1111222233334444555566667777888899990000aaaabbbbccccddddeeee0002',
    publicationNotes: 'Revisión consolidada de agosto 2024',
  },
]

export const pilotSeries: readonly StatisticalSeries[] = [
  {
    id: 'bcentral-tpm',
    concept: 'Tasa de Política Monetaria (TPM)',
    providerAgency: 'Banco Central de Chile',
    sourceId: 'bcentral-bde',
    frequency: 'monthly',
    baseUnit: '%',
    methodology: 'Fijación por el Consejo del Banco Central de Chile en RPM.',
    currentVintageId: 'vintage-bcentral-tpm-2024-v2',
    limitations: ['Valores nominales anualizados sujetos a política de metas de inflación de 3%.'],
  },
]

export const pilotForecasts: readonly ForecastRun[] = [
  {
    id: 'forecast-bcentral-tpm-2024',
    seriesId: 'bcentral-tpm',
    targetVintageId: 'vintage-bcentral-tpm-2024-v2',
    modelName: 'damped_trend_v1',
    baselineModel: 'naive_persistence',
    splitPeriod: '2024-05',
    metric: 'mae',
    modelMetricValue: 0.18,
    baselineMetricValue: 0.35,
    beatsBaseline: true,
    forecastHorizon: 3,
    forecastPoints: [
      { period: '2024-09', p10: 5.15, p50: 5.35, p90: 5.55 },
      { period: '2024-10', p10: 4.95, p50: 5.2, p90: 5.45 },
      { period: '2024-11', p10: 4.8, p50: 5.1, p90: 5.4 },
    ],
    epistemicStatus: 'forecast',
    limitations: [
      'Modelo econométrico autoregresivo simple para verificación de gate.',
      'No incorpora shocks exógenos ni decisiones de la Reserva Federal estadounidense.',
    ],
    generatedAt: '2026-09-22T00:00:00.000Z',
  },
]

export default class InMemoryStatisticsRepository implements StatisticsRepository {
  private readonly series: Map<string, StatisticalSeries> = new Map()
  private readonly vintages: Map<string, SeriesVintage> = new Map()
  private readonly forecasts: Map<string, ForecastRun> = new Map()

  constructor(seedFixtures = true) {
    for (const s of seedFixtures ? pilotSeries : []) {
      this.series.set(s.id, s)
    }
    for (const v of seedFixtures ? pilotVintages : []) {
      this.vintages.set(v.id, v)
    }
    for (const f of seedFixtures ? pilotForecasts : []) {
      this.forecasts.set(f.id, f)
    }
  }

  async findSeriesById(id: string): Promise<StatisticalSeries | null> {
    return this.series.get(id) ?? null
  }

  async listSeries(limit: number, offset: number): Promise<SeriesPage> {
    const all = Array.from(this.series.values()).sort((left, right) =>
      left.id.localeCompare(right.id)
    )
    return { items: all.slice(offset, offset + limit), total: all.length, limit, offset }
  }

  async findVintageById(vintageId: string): Promise<SeriesVintage | null> {
    return this.vintages.get(vintageId) ?? null
  }

  async findVintageSeriesId(vintageId: string): Promise<string | null> {
    return this.vintages.get(vintageId)?.seriesId ?? null
  }

  async listVintages(seriesId: string, limit: number, offset: number): Promise<VintagePage> {
    const all = Array.from(this.vintages.values())
      .filter((vintage) => vintage.seriesId === seriesId)
      .sort((left, right) => {
        const byDate = right.vintageDate.localeCompare(left.vintageDate)
        return byDate || right.id.localeCompare(left.id)
      })
    const items: SeriesVintageSummary[] = all.slice(offset, offset + limit).map((vintage) => ({
      id: vintage.id,
      seriesId: vintage.seriesId,
      vintageDate: vintage.vintageDate,
      coverageStart: vintage.coverageStart,
      coverageEnd: vintage.coverageEnd,
      observationCount: vintage.observations.length,
      contentHash: vintage.contentHash,
      ...(vintage.publicationNotes ? { publicationNotes: vintage.publicationNotes } : {}),
    }))
    return { items, total: all.length, limit, offset }
  }

  async saveSeries(series: StatisticalSeries): Promise<void> {
    this.series.set(series.id, series)
  }

  async saveVintage(vintage: SeriesVintage): Promise<void> {
    assertVintageIntegrity(vintage)
    this.vintages.set(vintage.id, vintage)
    // Actualizar currentVintageId en la serie si corresponde
    const existingSeries = this.series.get(vintage.seriesId)
    if (existingSeries) {
      this.series.set(existingSeries.id, {
        ...existingSeries,
        currentVintageId: vintage.id,
      })
    }
  }

  async saveForecast(forecast: ForecastRun): Promise<void> {
    this.forecasts.set(forecast.id, forecast)
  }

  async findForecastById(id: string): Promise<ForecastRun | null> {
    return this.forecasts.get(id) ?? null
  }
}
