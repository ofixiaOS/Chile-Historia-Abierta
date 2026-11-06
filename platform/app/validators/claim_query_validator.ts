import type { ClaimQueryFilters } from '#modules/evidence/application/claim_repository'
import {
  evidenceStatuses,
  sourceTypes,
  type EvidenceStatus,
  type SourceType,
} from '#modules/evidence/domain/claim'
import ApiError from '#shared/errors/api_error'

const validEvidenceStatuses: ReadonlySet<string> = new Set(evidenceStatuses)
const validSourceTypes: ReadonlySet<string> = new Set(sourceTypes)

export function validateClaimQueryFilters(query: Record<string, unknown>): ClaimQueryFilters {
  let limit: number | undefined
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const parsed = Number(query.limit)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new ApiError('E_VALIDATION', 'Limit must be an integer between 1 and 100', 422, {
        field: 'limit',
      })
    }
    limit = parsed
  }

  let cursor: string | undefined
  if (typeof query.cursor === 'string' && query.cursor.trim().length > 0) {
    cursor = query.cursor.trim()
  }

  let evidenceStatus: EvidenceStatus | undefined
  if (typeof query.evidenceStatus === 'string' && query.evidenceStatus.trim().length > 0) {
    const trimmed = query.evidenceStatus.trim()
    if (!validEvidenceStatuses.has(trimmed)) {
      throw new ApiError('E_VALIDATION', 'Invalid evidence status filter', 422, {
        field: 'evidenceStatus',
        allowed: Array.from(validEvidenceStatuses),
      })
    }
    evidenceStatus = trimmed as EvidenceStatus
  }

  let sourceType: SourceType | undefined
  if (typeof query.sourceType === 'string' && query.sourceType.trim().length > 0) {
    const trimmed = query.sourceType.trim()
    if (!validSourceTypes.has(trimmed)) {
      throw new ApiError('E_VALIDATION', 'Invalid source type filter', 422, {
        field: 'sourceType',
        allowed: Array.from(validSourceTypes),
      })
    }
    sourceType = trimmed as SourceType
  }

  let q: string | undefined
  if (typeof query.q === 'string' && query.q.trim().length > 0) {
    const trimmed = query.q.trim()
    if (trimmed.length > 256) {
      throw new ApiError('E_VALIDATION', 'Search query exceeds 256 characters', 422, {
        field: 'q',
      })
    }
    q = trimmed
  }

  return {
    limit,
    cursor,
    evidenceStatus,
    sourceType,
    q,
  }
}
