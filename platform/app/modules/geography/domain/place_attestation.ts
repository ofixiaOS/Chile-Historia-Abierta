import ApiError from '#shared/errors/api_error'
import type { EvidenceStatus } from '#modules/evidence/domain/claim'
import type { ChunkLicense } from '#modules/assistance/domain/chunk'

export const territoryTypes = ['city', 'region', 'province', 'boundary', 'site'] as const
export type TerritoryType = (typeof territoryTypes)[number]

export const spatialCertainties = ['exact', 'approximate', 'inferred', 'disputed'] as const
export type SpatialCertainty = (typeof spatialCertainties)[number]

export interface Wgs84Point {
  readonly latitude: number
  readonly longitude: number
}

export interface HistoricalTimeRange {
  readonly fromYear: number
  readonly toYear?: number
}

export interface PlaceAttestation {
  readonly id: string
  readonly placeId: string
  readonly placeName: string
  readonly territoryType: TerritoryType
  readonly coordinates: Wgs84Point
  readonly timeRange: HistoricalTimeRange
  readonly certainty: SpatialCertainty
  readonly sourceId: string
  readonly sourceName: string
  readonly sourceUrl?: string
  readonly evidenceStatus: EvidenceStatus
  readonly license: ChunkLicense
  readonly notes?: string
  readonly relatedClaimIds?: readonly string[]
}

function hasText(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function withinUtf8Limit(value: string | undefined, maxBytes: number): boolean {
  return value === undefined || Buffer.byteLength(value, 'utf8') <= maxBytes
}

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/

export function assertPlaceAttestationIsValid(attestation: PlaceAttestation): void {
  if (!identifierPattern.test(attestation.id)) {
    throw new ApiError('E_INVALID_ATTESTATION', 'Place attestation ID is invalid', 422)
  }
  if (!identifierPattern.test(attestation.placeId)) {
    throw new ApiError('E_INVALID_ATTESTATION', 'Place identifier is invalid', 422)
  }
  if (!hasText(attestation.placeName)) {
    throw new ApiError('E_INVALID_ATTESTATION', 'Place name cannot be empty', 422)
  }
  if (!withinUtf8Limit(attestation.placeName, 512)) {
    throw new ApiError('E_INVALID_ATTESTATION', 'Place name exceeds 512 UTF-8 bytes', 422)
  }
  if (!territoryTypes.includes(attestation.territoryType)) {
    throw new ApiError(
      'E_INVALID_ATTESTATION',
      `Invalid territory type: ${attestation.territoryType}`,
      422
    )
  }
  if (!spatialCertainties.includes(attestation.certainty)) {
    throw new ApiError(
      'E_INVALID_ATTESTATION',
      `Invalid spatial certainty: ${attestation.certainty}`,
      422
    )
  }

  const { latitude, longitude } = attestation.coordinates
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new ApiError(
      'E_INVALID_ATTESTATION',
      `Latitude must be a valid number between -90 and 90 (got ${latitude})`,
      422
    )
  }
  if (
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new ApiError(
      'E_INVALID_ATTESTATION',
      `Longitude must be a valid number between -180 and 180 (got ${longitude})`,
      422
    )
  }

  if (
    !Number.isInteger(attestation.timeRange.fromYear) ||
    attestation.timeRange.fromYear < -2_147_483_648 ||
    attestation.timeRange.fromYear > 2_147_483_647 ||
    (typeof attestation.timeRange.toYear === 'number' &&
      (!Number.isInteger(attestation.timeRange.toYear) ||
        attestation.timeRange.toYear < -2_147_483_648 ||
        attestation.timeRange.toYear > 2_147_483_647))
  ) {
    throw new ApiError('E_INVALID_ATTESTATION', 'Historical years must be 32-bit integers', 422)
  }

  if (
    typeof attestation.timeRange.toYear === 'number' &&
    attestation.timeRange.fromYear > attestation.timeRange.toYear
  ) {
    throw new ApiError(
      'E_INVALID_ATTESTATION',
      `fromYear (${attestation.timeRange.fromYear}) cannot be greater than toYear (${attestation.timeRange.toYear})`,
      422
    )
  }

  if (!hasText(attestation.sourceId) || !hasText(attestation.sourceName)) {
    throw new ApiError(
      'E_INVALID_ATTESTATION',
      'Source identity is required for place attestation',
      422
    )
  }

  if (
    !withinUtf8Limit(attestation.sourceId, 128) ||
    !withinUtf8Limit(attestation.sourceName, 512) ||
    !withinUtf8Limit(attestation.sourceUrl, 2048) ||
    !withinUtf8Limit(attestation.notes, 8192)
  ) {
    throw new ApiError('E_INVALID_ATTESTATION', 'Place source metadata exceeds field limits', 422)
  }

  if (
    !hasText(attestation.license.itemRights) ||
    !hasText(attestation.license.redistributionPolicy) ||
    !hasText(attestation.license.requiredAttribution)
  ) {
    throw new ApiError(
      'E_INVALID_ATTESTATION',
      'Place attestation license terms are incomplete',
      422
    )
  }

  const license = attestation.license
  if (
    !withinUtf8Limit(license.softwareLicense, 128) ||
    !withinUtf8Limit(license.datasetLicense, 128) ||
    !withinUtf8Limit(license.itemRights, 1024) ||
    !withinUtf8Limit(license.redistributionPolicy, 1024) ||
    !withinUtf8Limit(license.requiredAttribution, 1024) ||
    (attestation.relatedClaimIds?.length ?? 0) > 100 ||
    attestation.relatedClaimIds?.some((id) => !identifierPattern.test(id))
  ) {
    throw new ApiError(
      'E_INVALID_ATTESTATION',
      'Place rights or relation fields exceed limits',
      422
    )
  }
}
