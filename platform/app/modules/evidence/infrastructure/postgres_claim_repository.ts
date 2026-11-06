import type {
  ClaimQueryFilters,
  ClaimRepository,
  ExplorationReadModel,
  ExploreFacets,
  ExploreItem,
  PaginatedClaims,
} from '#modules/evidence/application/claim_repository'
import type {
  ClaimRecord,
  EditorialStatus,
  EvidenceReference,
  EvidenceStatus,
  SourceType,
} from '#modules/evidence/domain/claim'
import { decodeCursor, encodeCursor } from '#shared/http/cursor'
import db from '@adonisjs/lucid/services/db'

interface PublicClaimRow {
  claim_id: string
  revision_id: string
  revision_number: number
  statement: string
  evidence_status: EvidenceStatus
  editorial_status: EditorialStatus
  published_at: Date | string
  supersedes_revision_id: string | null
  limitations: string[]
  projected_at: Date | string
  evidence: EvidenceReference[]
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function mapRowToRecord(row: PublicClaimRow): ClaimRecord {
  return {
    id: row.claim_id,
    projectedAt: toIsoString(row.projected_at),
    currentRevision: {
      id: row.revision_id,
      revisionNumber: row.revision_number,
      statement: row.statement,
      evidenceStatus: row.evidence_status,
      editorialStatus: row.editorial_status,
      publishedAt: toIsoString(row.published_at),
      supersedesRevisionId: row.supersedes_revision_id,
      limitations: row.limitations,
      evidence: row.evidence,
    },
  }
}

type QueryBinding = string | number | boolean | Date

interface FilterSql {
  whereClause: string
  bindings: QueryBinding[]
}

function buildFilterSql(filters: ClaimQueryFilters, includeCursor = true): FilterSql {
  const conditions: string[] = ['1 = 1']
  const bindings: QueryBinding[] = []

  if (filters.evidenceStatus) {
    conditions.push('evidence_status = ?')
    bindings.push(filters.evidenceStatus)
  }

  if (filters.sourceType) {
    conditions.push(
      "EXISTS (SELECT 1 FROM jsonb_array_elements(evidence) elem WHERE elem->'source'->>'sourceType' = ?)"
    )
    bindings.push(filters.sourceType)
  }

  if (filters.q && filters.q.trim().length > 0) {
    conditions.push('statement ILIKE ?')
    bindings.push(`%${filters.q.trim()}%`)
  }

  if (includeCursor && filters.cursor) {
    const cursor = decodeCursor(filters.cursor)
    conditions.push('(published_at < ? OR (published_at = ? AND claim_id < ?))')
    bindings.push(cursor.publishedAt, cursor.publishedAt, cursor.id)
  }

  return {
    whereClause: conditions.join(' AND '),
    bindings,
  }
}

export default class PostgresClaimRepository implements ClaimRepository {
  async findById(id: string): Promise<ClaimRecord | null> {
    const result = await db.connection('public').rawQuery(
      `
        SELECT
          claim_id,
          revision_id,
          revision_number,
          statement,
          evidence_status,
          editorial_status,
          published_at,
          supersedes_revision_id,
          limitations,
          projected_at,
          evidence
        FROM public_claim_records
        WHERE claim_id = ?
        LIMIT 1
      `,
      [id]
    )

    const row = result.rows[0] as PublicClaimRow | undefined
    if (!row) {
      return null
    }

    return mapRowToRecord(row)
  }

  async findMany(filters: ClaimQueryFilters): Promise<PaginatedClaims> {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
    const { whereClause, bindings } = buildFilterSql(filters, true)

    const queryBindings: QueryBinding[] = [...bindings, limit + 1]
    const result = await db.connection('public').rawQuery(
      `
        SELECT
          claim_id,
          revision_id,
          revision_number,
          statement,
          evidence_status,
          editorial_status,
          published_at,
          supersedes_revision_id,
          limitations,
          projected_at,
          evidence
        FROM public_claim_records
        WHERE ${whereClause}
        ORDER BY published_at DESC, claim_id DESC
        LIMIT ?
      `,
      queryBindings
    )

    const rows = result.rows as PublicClaimRow[]
    const hasMore = rows.length > limit
    const sliced = rows.slice(0, limit)
    const items = sliced.map(mapRowToRecord)

    let nextCursor: string | null = null
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1]
      nextCursor = encodeCursor({
        publishedAt: last.currentRevision.publishedAt!,
        id: last.id,
      })
    }

    return {
      items,
      nextCursor,
      limit,
      hasMore,
    }
  }

  async explore(filters: ClaimQueryFilters): Promise<ExplorationReadModel> {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
    const baseFilter = buildFilterSql(filters, false)
    const paginatedFilter = buildFilterSql(filters, true)

    // 1. Fetch paginated items for exploration
    const queryBindings: QueryBinding[] = [...paginatedFilter.bindings, limit + 1]
    const itemsResult = await db.connection('public').rawQuery(
      `
        SELECT
          claim_id,
          statement,
          evidence_status,
          published_at,
          evidence
        FROM public_claim_records
        WHERE ${paginatedFilter.whereClause}
        ORDER BY published_at DESC, claim_id DESC
        LIMIT ?
      `,
      queryBindings
    )

    const itemRows = itemsResult.rows as {
      claim_id: string
      statement: string
      evidence_status: EvidenceStatus
      published_at: Date | string
      evidence: EvidenceReference[]
    }[]

    const hasMore = itemRows.length > limit
    const slicedItems = itemRows.slice(0, limit)

    const items: ExploreItem[] = slicedItems.map((r) => {
      const sourceTypes = Array.from(
        new Set((r.evidence ?? []).map((e) => e.source?.sourceType).filter(Boolean))
      ) as SourceType[]

      return {
        id: r.claim_id,
        statement: r.statement,
        evidenceStatus: r.evidence_status,
        publishedAt: toIsoString(r.published_at),
        sourceTypes,
        sourceCount: (r.evidence ?? []).length,
      }
    })

    // 2. Fetch facets and timeRange aggregated over matching dataset
    const statusFacetResult = await db.connection('public').rawQuery(
      `
        SELECT
          evidence_status,
          count(*)::integer AS count
        FROM public_claim_records
        WHERE ${baseFilter.whereClause}
        GROUP BY evidence_status
      `,
      baseFilter.bindings
    )

    const sourceFacetResult = await db.connection('public').rawQuery(
      `
        SELECT
          elem->'source'->>'sourceType' AS source_type,
          count(*)::integer AS count
        FROM public_claim_records,
        LATERAL jsonb_array_elements(evidence) elem
        WHERE ${baseFilter.whereClause}
        GROUP BY elem->'source'->>'sourceType'
      `,
      baseFilter.bindings
    )

    const timeRangeResult = await db.connection('public').rawQuery(
      `
        SELECT
          count(*)::integer AS total_matching,
          min(published_at) AS min_date,
          max(published_at) AS max_date
        FROM public_claim_records
        WHERE ${baseFilter.whereClause}
      `,
      baseFilter.bindings
    )

    const byEvidenceStatus: Record<EvidenceStatus, number> = {
      documented: 0,
      inferred: 0,
      disputed: 0,
      hypothesis: 0,
      forecast: 0,
      unknown: 0,
    }
    for (const row of statusFacetResult.rows as {
      evidence_status: EvidenceStatus
      count: number
    }[]) {
      byEvidenceStatus[row.evidence_status] = Number(row.count)
    }

    const bySourceType: Record<string, number> = {}
    for (const row of sourceFacetResult.rows as { source_type: string; count: number }[]) {
      if (row.source_type) {
        bySourceType[row.source_type] = Number(row.count)
      }
    }

    const timeRow = timeRangeResult.rows[0] as
      { total_matching: number; min_date: Date | null; max_date: Date | null } | undefined

    const totalMatching = Number(timeRow?.total_matching ?? 0)
    const minDate = timeRow?.min_date ? toIsoString(timeRow.min_date) : null
    const maxDate = timeRow?.max_date ? toIsoString(timeRow.max_date) : null

    const facets: ExploreFacets = {
      byEvidenceStatus,
      bySourceType,
      totalMatching,
    }

    let nextCursor: string | null = null
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1]
      nextCursor = encodeCursor({
        publishedAt: last.publishedAt,
        id: last.id,
      })
    }

    return {
      items,
      facets,
      timeRange: {
        minDate,
        maxDate,
      },
      nextCursor,
      limit,
      hasMore,
      asOf: new Date().toISOString(),
    }
  }
}
