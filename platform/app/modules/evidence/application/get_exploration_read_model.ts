import type {
  ClaimQueryFilters,
  ClaimRepository,
  ExploreFacets,
  ExploreItem,
} from '#modules/evidence/application/claim_repository'
import { createHash } from 'node:crypto'

export interface ExplorationResponse {
  readonly data: {
    readonly items: readonly ExploreItem[]
    readonly facets: ExploreFacets
    readonly timeRange: {
      readonly minDate: string | null
      readonly maxDate: string | null
    }
  }
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

export default class GetExplorationReadModel {
  constructor(private readonly repository: ClaimRepository) {}

  async execute(filters: ClaimQueryFilters): Promise<ExplorationResponse> {
    const readModel = await this.repository.explore(filters)
    const asOf = readModel.asOf

    const hash = createHash('sha256')
    for (const item of readModel.items) {
      hash.update(`${item.id}:${item.publishedAt}`)
    }
    hash.update(`total:${readModel.facets.totalMatching}`)
    const version = `explore:${readModel.limit}:${readModel.nextCursor ?? 'end'}:${hash.digest('hex').slice(0, 16)}`

    const selfParams = new URLSearchParams()
    if (filters.limit) selfParams.set('limit', String(filters.limit))
    if (filters.cursor) selfParams.set('cursor', filters.cursor)
    if (filters.evidenceStatus) selfParams.set('evidenceStatus', filters.evidenceStatus)
    if (filters.sourceType) selfParams.set('sourceType', filters.sourceType)
    if (filters.q) selfParams.set('q', filters.q)

    let nextLink: string | null = null
    if (readModel.nextCursor) {
      const nextParams = new URLSearchParams(selfParams)
      nextParams.set('cursor', readModel.nextCursor)
      nextLink = `/v1/explore?${nextParams.toString()}`
    }

    const selfQuery = selfParams.toString()
    const selfLink = selfQuery.length > 0 ? `/v1/explore?${selfQuery}` : '/v1/explore'

    return {
      data: {
        items: readModel.items,
        facets: readModel.facets,
        timeRange: readModel.timeRange,
      },
      pagination: {
        limit: readModel.limit,
        nextCursor: readModel.nextCursor,
        hasMore: readModel.hasMore,
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
