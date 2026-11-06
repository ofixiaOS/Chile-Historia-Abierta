import ApiError from '#shared/errors/api_error'
import type { EvidenceStatus, SourceType } from '#modules/evidence/domain/claim'

export type ChunkLocatorType = 'page' | 'table' | 'row' | 'selector' | 'fragment' | 'timecode'

export interface ChunkLocator {
  readonly type: ChunkLocatorType
  readonly value: string
}

export interface ChunkLicense {
  readonly softwareLicense: string
  readonly datasetLicense: string
  readonly itemRights: string
  readonly redistributionPolicy: string
  readonly requiredAttribution: string
}

export interface EvidenceChunk {
  readonly id: string
  readonly sourceId: string
  readonly sourceName: string
  readonly sourceType: SourceType
  readonly contentHash: string
  readonly text: string
  readonly locator: ChunkLocator
  readonly epistemicStatus: EvidenceStatus
  readonly license: ChunkLicense
  readonly retrievedAt: string
}

const sha256Pattern = /^[a-f0-9]{64}$/

function hasText(value: string): boolean {
  return value.trim().length > 0
}

export function assertEvidenceChunkIsValid(chunk: EvidenceChunk): void {
  if (!hasText(chunk.id)) {
    throw new ApiError('E_INVALID_CHUNK', 'Chunk ID cannot be empty', 422)
  }
  if (!hasText(chunk.sourceId) || !hasText(chunk.sourceName)) {
    throw new ApiError('E_INVALID_CHUNK', 'Source identity is missing from chunk', 422)
  }
  if (!hasText(chunk.text)) {
    throw new ApiError('E_INVALID_CHUNK', 'Chunk text content cannot be empty', 422)
  }
  if (!sha256Pattern.test(chunk.contentHash)) {
    throw new ApiError(
      'E_INVALID_CHUNK',
      'Chunk content hash must be a valid 64-char hex SHA-256',
      422
    )
  }
  if (!hasText(chunk.locator.value)) {
    throw new ApiError('E_INVALID_CHUNK', 'Chunk locator value cannot be empty', 422)
  }
  if (
    !hasText(chunk.license.itemRights) ||
    !hasText(chunk.license.redistributionPolicy) ||
    !hasText(chunk.license.requiredAttribution)
  ) {
    throw new ApiError('E_INVALID_CHUNK', 'Chunk license terms are incomplete', 422)
  }
}
