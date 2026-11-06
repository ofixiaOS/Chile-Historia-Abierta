import type { ClaimRecord, EvidenceStatus, SourceType } from '#modules/evidence/domain/claim'

export interface ClaimQueryFilters {
  readonly q?: string
  readonly evidenceStatus?: EvidenceStatus
  readonly sourceType?: SourceType
  readonly limit?: number
  readonly cursor?: string
}

export interface PaginatedClaims {
  readonly items: readonly ClaimRecord[]
  readonly nextCursor: string | null
  readonly limit: number
  readonly hasMore: boolean
}

export interface ExploreItem {
  readonly id: string
  readonly statement: string
  readonly evidenceStatus: EvidenceStatus
  readonly publishedAt: string
  readonly sourceTypes: readonly SourceType[]
  readonly sourceCount: number
}

export interface ExploreFacets {
  readonly byEvidenceStatus: Record<EvidenceStatus, number>
  readonly bySourceType: Record<string, number>
  readonly totalMatching: number
}

export interface ExplorationReadModel {
  readonly items: readonly ExploreItem[]
  readonly facets: ExploreFacets
  readonly timeRange: {
    readonly minDate: string | null
    readonly maxDate: string | null
  }
  readonly nextCursor: string | null
  readonly limit: number
  readonly hasMore: boolean
  readonly asOf: string
}

export interface ClaimRepository {
  findById(id: string): Promise<ClaimRecord | null>
  findMany(filters: ClaimQueryFilters): Promise<PaginatedClaims>
  explore(filters: ClaimQueryFilters): Promise<ExplorationReadModel>
}
