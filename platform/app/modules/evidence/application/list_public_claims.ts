import type {
  ClaimQueryFilters,
  ClaimRepository,
} from '#modules/evidence/application/claim_repository'
import type { EvidenceStatus } from '#modules/evidence/domain/claim'
import { createHash } from 'node:crypto'

export interface PublicClaimSummary {
  readonly type: 'claim'
  readonly id: string
  readonly attributes: {
    readonly statement: string
    readonly revisionNumber: number
    readonly editorialStatus: 'published' | 'corrected'
    readonly publishedAt: string
    readonly evidenceStatus: EvidenceStatus
  }
  readonly sourceCount: number
  readonly links: {
    readonly self: string
  }
}

export interface ListPublicClaimsResponse {
  readonly data: readonly PublicClaimSummary[]
  readonly pagination: {
    readonly limit: number
    readonly nextCursor: string | null
    readonly hasMore: boolean
  }
  readonly asOf: string
  readonly version: string
  readonly freshness: {
    readonly generatedAt: string
  }
  readonly links: {
    readonly self: string
    readonly next: string | null
  }
}

export default class ListPublicClaims {
  constructor(private readonly repository: ClaimRepository) {}

  async execute(filters: ClaimQueryFilters): Promise<ListPublicClaimsResponse> {
    const paginated = await this.repository.findMany(filters)
    const asOf = new Date().toISOString()

    const data: PublicClaimSummary[] = paginated.items.map((record) => ({
      type: 'claim',
      id: record.id,
      attributes: {
        statement: record.currentRevision.statement,
        revisionNumber: record.currentRevision.revisionNumber,
        editorialStatus: record.currentRevision.editorialStatus as 'published' | 'corrected',
        publishedAt: record.currentRevision.publishedAt!,
        evidenceStatus: record.currentRevision.evidenceStatus,
      },
      sourceCount: record.currentRevision.evidence.length,
      links: {
        self: `/v1/claims/${encodeURIComponent(record.id)}`,
      },
    }))

    // Deterministic version string for ETag
    const hash = createHash('sha256')
    for (const item of data) {
      hash.update(`${item.id}:${item.attributes.publishedAt}`)
    }
    const version = `claims:collection:${paginated.limit}:${paginated.nextCursor ?? 'end'}:${hash.digest('hex').slice(0, 16)}`

    // Generate links
    const selfParams = new URLSearchParams()
    if (filters.limit) selfParams.set('limit', String(filters.limit))
    if (filters.cursor) selfParams.set('cursor', filters.cursor)
    if (filters.evidenceStatus) selfParams.set('evidenceStatus', filters.evidenceStatus)
    if (filters.sourceType) selfParams.set('sourceType', filters.sourceType)
    if (filters.q) selfParams.set('q', filters.q)

    let nextLink: string | null = null
    if (paginated.nextCursor) {
      const nextParams = new URLSearchParams(selfParams)
      nextParams.set('cursor', paginated.nextCursor)
      nextLink = `/v1/claims?${nextParams.toString()}`
    }

    const selfQuery = selfParams.toString()
    const selfLink = selfQuery.length > 0 ? `/v1/claims?${selfQuery}` : '/v1/claims'

    return {
      data,
      pagination: {
        limit: paginated.limit,
        nextCursor: paginated.nextCursor,
        hasMore: paginated.hasMore,
      },
      asOf,
      version,
      freshness: {
        generatedAt: asOf,
      },
      links: {
        self: selfLink,
        next: nextLink,
      },
    }
  }
}
