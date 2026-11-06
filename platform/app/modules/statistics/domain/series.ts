import ApiError from '#shared/errors/api_error'

export type StatisticalFrequency = 'daily' | 'monthly' | 'quarterly' | 'annual'

export type ObservationStatus = 'normal' | 'provisional' | 'revised' | 'estimated' | 'imputed'

export interface Observation {
  readonly period: string
  readonly value: number
  readonly status: ObservationStatus
  readonly unit: string
  readonly locator?: string
}

export interface SeriesVintage {
  readonly id: string
  readonly seriesId: string
  readonly vintageDate: string
  readonly coverageStart: string
  readonly coverageEnd: string
  readonly observations: readonly Observation[]
  readonly contentHash: string
  readonly publicationNotes?: string
}

export interface SeriesVintageSummary {
  readonly id: string
  readonly seriesId: string
  readonly vintageDate: string
  readonly coverageStart: string
  readonly coverageEnd: string
  readonly observationCount: number
  readonly contentHash: string
  readonly publicationNotes?: string
}

export const MAX_VINTAGE_OBSERVATIONS = 10_000
export const MAX_VINTAGE_OBSERVATIONS_JSON_BYTES = 2 * 1024 * 1024
export const MAX_OBSERVATION_PERIOD_LENGTH = 32
export const MAX_OBSERVATION_UNIT_LENGTH = 128
export const MAX_OBSERVATION_LOCATOR_LENGTH = 512

export interface StatisticalSeries {
  readonly id: string
  readonly concept: string
  readonly providerAgency: string
  readonly sourceId: string
  readonly frequency: StatisticalFrequency
  readonly baseUnit: string
  readonly methodology: string
  readonly currentVintageId: string
  readonly limitations: readonly string[]
}

const sha256Pattern = /^[a-f0-9]{64}$/

function hasText(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function assertObservationIsValid(obs: Observation): void {
  if (!hasText(obs.period)) {
    throw new ApiError('E_INVALID_OBSERVATION', 'Observation period cannot be empty', 422)
  }
  if (!Number.isFinite(obs.value)) {
    throw new ApiError('E_INVALID_OBSERVATION', 'Observation value must be a finite number', 422)
  }
  const validStatuses: readonly ObservationStatus[] = [
    'normal',
    'provisional',
    'revised',
    'estimated',
    'imputed',
  ]
  if (!validStatuses.includes(obs.status)) {
    throw new ApiError(
      'E_INVALID_OBSERVATION',
      `Observation status "${obs.status}" is not a valid SDMX status`,
      422
    )
  }
  if (!hasText(obs.unit)) {
    throw new ApiError('E_INVALID_OBSERVATION', 'Observation unit cannot be empty', 422)
  }
  if (
    obs.period.length > MAX_OBSERVATION_PERIOD_LENGTH ||
    obs.unit.length > MAX_OBSERVATION_UNIT_LENGTH ||
    (obs.locator !== undefined && obs.locator.length > MAX_OBSERVATION_LOCATOR_LENGTH)
  ) {
    throw new ApiError(
      'E_INVALID_OBSERVATION',
      'Observation text field exceeds its size limit',
      422
    )
  }
}

export function assertSeriesIsValid(series: StatisticalSeries): void {
  if (!hasText(series.id)) {
    throw new ApiError('E_INVALID_SERIES', 'Series ID cannot be empty', 422)
  }
  if (!hasText(series.concept)) {
    throw new ApiError('E_INVALID_SERIES', 'Series concept cannot be empty', 422)
  }
  if (!hasText(series.providerAgency)) {
    throw new ApiError('E_INVALID_SERIES', 'Series provider agency cannot be empty', 422)
  }
  if (!hasText(series.sourceId)) {
    throw new ApiError('E_INVALID_SERIES', 'Series sourceId cannot be empty', 422)
  }
  const validFrequencies: readonly StatisticalFrequency[] = [
    'daily',
    'monthly',
    'quarterly',
    'annual',
  ]
  if (!validFrequencies.includes(series.frequency)) {
    throw new ApiError(
      'E_INVALID_SERIES',
      `Series frequency "${series.frequency}" is not a valid frequency`,
      422
    )
  }
  if (!hasText(series.baseUnit)) {
    throw new ApiError('E_INVALID_SERIES', 'Series base unit cannot be empty', 422)
  }
  if (!hasText(series.methodology)) {
    throw new ApiError('E_INVALID_SERIES', 'Series methodology must be documented', 422)
  }
  if (!hasText(series.currentVintageId)) {
    throw new ApiError('E_INVALID_SERIES', 'Series currentVintageId cannot be empty', 422)
  }
}

export function assertVintageIntegrity(vintage: SeriesVintage): void {
  if (!hasText(vintage.id)) {
    throw new ApiError('E_INVALID_VINTAGE', 'Vintage ID cannot be empty', 422)
  }
  if (!hasText(vintage.seriesId)) {
    throw new ApiError('E_INVALID_VINTAGE', 'Vintage seriesId cannot be empty', 422)
  }
  if (!sha256Pattern.test(vintage.contentHash)) {
    throw new ApiError(
      'E_INVALID_VINTAGE',
      'Vintage contentHash must be a valid 64-char hex SHA-256',
      422
    )
  }
  if (vintage.observations.length === 0) {
    throw new ApiError('E_INVALID_VINTAGE', 'Vintage must contain at least one observation', 422)
  }
  if (vintage.observations.length > MAX_VINTAGE_OBSERVATIONS) {
    throw new ApiError(
      'E_INVALID_VINTAGE',
      `Vintage cannot contain more than ${MAX_VINTAGE_OBSERVATIONS} observations`,
      422
    )
  }
  for (const obs of vintage.observations) {
    assertObservationIsValid(obs)
  }
  let observationsBytes: number
  try {
    observationsBytes = Buffer.byteLength(JSON.stringify(vintage.observations), 'utf8')
  } catch {
    throw new ApiError('E_INVALID_VINTAGE', 'Vintage observations cannot be serialized', 422)
  }
  if (observationsBytes > MAX_VINTAGE_OBSERVATIONS_JSON_BYTES) {
    throw new ApiError(
      'E_INVALID_VINTAGE',
      `Vintage observations exceed ${MAX_VINTAGE_OBSERVATIONS_JSON_BYTES} bytes`,
      422
    )
  }
}
