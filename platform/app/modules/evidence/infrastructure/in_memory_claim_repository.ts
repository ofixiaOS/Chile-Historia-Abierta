import type {
  ClaimQueryFilters,
  ClaimRepository,
  ExplorationReadModel,
  ExploreFacets,
  ExploreItem,
  PaginatedClaims,
} from '#modules/evidence/application/claim_repository'
import type { ClaimRecord, EvidenceStatus, SourceType } from '#modules/evidence/domain/claim'
import { decodeCursor, encodeCursor } from '#shared/http/cursor'

const validFixture: ClaimRecord = {
  id: 'fixture-claim-001',
  projectedAt: '2026-09-22T12:00:00.000Z',
  currentRevision: {
    id: 'fixture-revision-001',
    revisionNumber: 1,
    statement:
      'Este enunciado demuestra el contrato técnico de evidencia; no es un hecho histórico.',
    evidenceStatus: 'documented',
    editorialStatus: 'published',
    publishedAt: '2026-09-22T12:00:00.000Z',
    supersedesRevisionId: null,
    limitations: ['Fixture local para desarrollo; no debe incorporarse a un corpus histórico.'],
    evidence: [
      {
        linkType: 'supports',
        source: {
          id: 'fixture-source-001',
          sourceType: 'community_post',
          sourceName: 'Fixture técnico local',
          responsibleAgent: 'Equipo de desarrollo de Chile Historia Abierta',
          sourceUrl: 'https://example.invalid/chile-historia-abierta/fixtures/001',
          publishedAt: '2026-09-22T12:00:00.000Z',
        },
        artifact: {
          id: 'fixture-artifact-001',
          retrievedAt: '2026-09-22T12:00:00.000Z',
          contentHash: 'a'.repeat(64),
          hashAlgorithm: 'sha256',
          softwareLicense: 'UNLICENSED',
          datasetLicense: 'UNLICENSED',
          itemRights: 'Fixture técnico interno; no redistribuir como dato histórico',
          redistributionPolicy: 'Solo pruebas locales',
          requiredAttribution: 'Chile Historia Abierta — fixture técnico',
        },
        locator: {
          type: 'fragment',
          value: 'fixture-statement-001',
        },
        transformationMethod: 'Sin transformación; fixture definido en código',
        limitations: [
          'El host example.invalid está reservado y no representa una fuente recuperable.',
        ],
      },
    ],
  },
}

const validFixtureTwo: ClaimRecord = {
  id: 'fixture-claim-002',
  projectedAt: '2026-09-22T13:00:00.000Z',
  currentRevision: {
    id: 'fixture-revision-002',
    revisionNumber: 1,
    statement: 'Segundo enunciado de prueba para paginación y exploración.',
    evidenceStatus: 'inferred',
    editorialStatus: 'published',
    publishedAt: '2026-09-22T13:00:00.000Z',
    supersedesRevisionId: null,
    limitations: ['Fixture sintético.'],
    evidence: [
      {
        linkType: 'supports',
        source: {
          id: 'fixture-source-002',
          sourceType: 'official_statistical',
          sourceName: 'Estadísticas sintéticas',
          responsibleAgent: 'Equipo de desarrollo',
          sourceUrl: 'https://example.invalid/stats/002',
          publishedAt: '2026-09-22T13:00:00.000Z',
        },
        artifact: {
          id: 'fixture-artifact-002',
          retrievedAt: '2026-09-22T13:00:00.000Z',
          contentHash: 'b'.repeat(64),
          hashAlgorithm: 'sha256',
          softwareLicense: 'UNLICENSED',
          datasetLicense: 'UNLICENSED',
          itemRights: 'Fixture sintético interno',
          redistributionPolicy: 'Solo pruebas locales',
          requiredAttribution: 'Chile Historia Abierta',
        },
        locator: {
          type: 'row',
          value: 'row-002',
        },
        transformationMethod: 'Sin transformación',
        limitations: [],
      },
    ],
  },
}

const draftFixture: ClaimRecord = {
  ...validFixture,
  id: 'fixture-draft-001',
  currentRevision: {
    ...validFixture.currentRevision,
    id: 'fixture-draft-revision-001',
    editorialStatus: 'draft',
    publishedAt: null,
  },
}

const invalidFixture: ClaimRecord = {
  ...validFixture,
  id: 'fixture-invalid-001',
  currentRevision: {
    ...validFixture.currentRevision,
    id: 'fixture-invalid-revision-001',
    evidence: [],
  },
}

const fixtureRecords = new Map<string, ClaimRecord>(
  [validFixture, validFixtureTwo, draftFixture, invalidFixture].map((record) => [record.id, record])
)

function isPublicRecord(record: ClaimRecord): boolean {
  const rev = record.currentRevision
  return (
    (rev.editorialStatus === 'published' || rev.editorialStatus === 'corrected') &&
    rev.publishedAt !== null &&
    rev.evidence.length > 0
  )
}

function filterRecords(
  records: Map<string, ClaimRecord>,
  filters: ClaimQueryFilters
): ClaimRecord[] {
  let list = Array.from(records.values()).filter(isPublicRecord)

  if (filters.evidenceStatus) {
    list = list.filter((r) => r.currentRevision.evidenceStatus === filters.evidenceStatus)
  }

  if (filters.sourceType) {
    list = list.filter((r) =>
      r.currentRevision.evidence.some((e) => e.source.sourceType === filters.sourceType)
    )
  }

  if (filters.q && filters.q.trim().length > 0) {
    const query = filters.q.trim().toLowerCase()
    list = list.filter((r) => r.currentRevision.statement.toLowerCase().includes(query))
  }

  // Sort by published_at DESC, id DESC
  list.sort((a, b) => {
    const timeA = new Date(a.currentRevision.publishedAt!).getTime()
    const timeB = new Date(b.currentRevision.publishedAt!).getTime()
    if (timeA !== timeB) {
      return timeB - timeA
    }
    return b.id.localeCompare(a.id)
  })

  // Apply keyset cursor
  if (filters.cursor) {
    const cursor = decodeCursor(filters.cursor)
    const cursorTime = new Date(cursor.publishedAt).getTime()

    list = list.filter((r) => {
      const itemTime = new Date(r.currentRevision.publishedAt!).getTime()
      if (itemTime < cursorTime) {
        return true
      }
      if (itemTime === cursorTime) {
        return r.id < cursor.id
      }
      return false
    })
  }

  return list
}

export default class InMemoryClaimRepository implements ClaimRepository {
  private readonly records: Map<string, ClaimRecord>

  constructor(seedFixtures = true) {
    this.records = seedFixtures ? new Map(fixtureRecords) : new Map()
  }

  async findById(id: string): Promise<ClaimRecord | null> {
    const record = this.records.get(id)
    return record ? structuredClone(record) : null
  }

  async findMany(filters: ClaimQueryFilters): Promise<PaginatedClaims> {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
    const matching = filterRecords(this.records, filters)

    const hasMore = matching.length > limit
    const items = matching.slice(0, limit).map((r) => structuredClone(r))

    let nextCursor: string | null = null
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1]
      nextCursor = encodeCursor({
        publishedAt: lastItem.currentRevision.publishedAt!,
        id: lastItem.id,
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
    const allMatching = filterRecords(this.records, { ...filters, cursor: undefined })
    const matching = filterRecords(this.records, filters)

    const hasMore = matching.length > limit
    const sliced = matching.slice(0, limit)

    const items: ExploreItem[] = sliced.map((r) => ({
      id: r.id,
      statement: r.currentRevision.statement,
      evidenceStatus: r.currentRevision.evidenceStatus,
      publishedAt: r.currentRevision.publishedAt!,
      sourceTypes: Array.from(
        new Set(r.currentRevision.evidence.map((e) => e.source.sourceType))
      ) as SourceType[],
      sourceCount: r.currentRevision.evidence.length,
    }))

    // Calculate facets over all matching records
    const byEvidenceStatus: Record<EvidenceStatus, number> = {
      documented: 0,
      inferred: 0,
      disputed: 0,
      hypothesis: 0,
      forecast: 0,
      unknown: 0,
    }
    const bySourceType: Record<string, number> = {}

    let minDate: string | null = null
    let maxDate: string | null = null

    for (const record of allMatching) {
      const status = record.currentRevision.evidenceStatus
      byEvidenceStatus[status] = (byEvidenceStatus[status] ?? 0) + 1

      for (const ev of record.currentRevision.evidence) {
        const st = ev.source.sourceType
        bySourceType[st] = (bySourceType[st] ?? 0) + 1
      }

      const pub = record.currentRevision.publishedAt!
      if (!minDate || pub < minDate) minDate = pub
      if (!maxDate || pub > maxDate) maxDate = pub
    }

    const facets: ExploreFacets = {
      byEvidenceStatus,
      bySourceType,
      totalMatching: allMatching.length,
    }

    let nextCursor: string | null = null
    if (hasMore && sliced.length > 0) {
      const lastItem = sliced[sliced.length - 1]
      nextCursor = encodeCursor({
        publishedAt: lastItem.currentRevision.publishedAt!,
        id: lastItem.id,
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
