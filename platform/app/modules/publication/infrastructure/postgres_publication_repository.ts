import type { PublicationRepository } from '#modules/publication/application/publication_repository'
import type { ChartSpec, ChartWarning } from '#modules/publication/domain/chart_spec'
import type {
  CitedEvidenceReference,
  ConflictDeclaration,
  PublicationRecord,
  PublicationType,
} from '#modules/publication/domain/publication'
import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'

interface PublicPublicationRow {
  publication_id: string
  type: string
  author_id: string
  author_display_name: string
  conflicts_of_interest: ConflictDeclaration[] | string
  forked_from_publication_id: string | null
  revision_id: string
  revision_number: number
  title: string
  content: string
  evidence: CitedEvidenceReference[] | string
  limitations: string[] | string
  warnings: ChartWarning[] | string
  published_at: Date | string
  supersedes_revision_id: string | null
  projected_at: Date | string
  chart_spec: ChartSpec | string | null
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function parseJsonField<T>(field: T | string | null | undefined, defaultValue: T): T {
  if (field === null || field === undefined) {
    return defaultValue
  }
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T
    } catch {
      return defaultValue
    }
  }
  return field
}

function mapRowToPublication(row: PublicPublicationRow): PublicationRecord {
  const conflictsOfInterest = parseJsonField<ConflictDeclaration[]>(row.conflicts_of_interest, [])
  const evidence = parseJsonField<CitedEvidenceReference[]>(row.evidence, [])
  const limitations = parseJsonField<string[]>(row.limitations, [])
  const warnings = parseJsonField<ChartWarning[]>(row.warnings, [])
  const chartSpec = parseJsonField<ChartSpec | null>(row.chart_spec, null)

  return {
    id: row.publication_id,
    type: row.type as PublicationType,
    author: {
      id: row.author_id,
      displayName: row.author_display_name,
    },
    conflictsOfInterest,
    forkedFromPublicationId: row.forked_from_publication_id,
    projectedAt: toIsoString(row.projected_at),
    currentRevision: {
      id: row.revision_id,
      revisionNumber: row.revision_number,
      title: row.title,
      content: row.content,
      evidence,
      chartSpec,
      limitations,
      warnings,
      publishedAt: toIsoString(row.published_at),
      supersedesRevisionId: row.supersedes_revision_id,
    },
  }
}

export default class PostgresPublicationRepository implements PublicationRepository {
  constructor(private readonly readConnection: 'public' | 'admin' = 'public') {}

  async save(publication: PublicationRecord): Promise<void> {
    await db.connection('admin').transaction(async (trx) => {
      let chartSpecId: string | null = null

      if (publication.currentRevision.chartSpec) {
        const spec = publication.currentRevision.chartSpec
        chartSpecId = spec.id ?? randomUUID()

        const existingSpec = await trx.rawQuery('SELECT id FROM chart_specs WHERE id = ? LIMIT 1', [
          chartSpecId,
        ])

        if (existingSpec.rows.length === 0) {
          await trx.rawQuery(
            `
              INSERT INTO chart_specs (
                id, schema_version, renderer_name, renderer_version,
                title, description, method, series, events, time_range,
                transformations, query_hash, data_snapshot, sources,
                limitations, warnings
              ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb,
                ?::jsonb, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb
              )
            `,
            [
              chartSpecId,
              spec.schemaVersion ?? '1.0.0',
              spec.renderer?.name ?? 'vega-lite',
              spec.renderer?.version ?? '5.21.0',
              spec.title,
              spec.description,
              spec.method,
              JSON.stringify(spec.series ?? []),
              JSON.stringify(spec.events ?? []),
              JSON.stringify(spec.timeRange),
              JSON.stringify(spec.transformations ?? []),
              spec.queryHash,
              JSON.stringify(spec.dataSnapshot),
              JSON.stringify(spec.sources ?? []),
              JSON.stringify(spec.limitations ?? []),
              JSON.stringify(spec.warnings ?? []),
            ]
          )
        }
      }

      const existingPub = await trx.rawQuery('SELECT id FROM publications WHERE id = ? LIMIT 1', [
        publication.id,
      ])

      if (existingPub.rows.length === 0) {
        const forkedPlaceholder = publication.forkedFromPublicationId ? '?' : 'NULL'
        await trx.rawQuery(
          `
            INSERT INTO publications (
              id, type, author_id, author_display_name, conflicts_of_interest,
              forked_from_publication_id, current_revision_id, projected_at
            ) VALUES (?, ?, ?, ?, ?::jsonb, ${forkedPlaceholder}, NULL, ?)
          `,
          [
            publication.id,
            publication.type,
            publication.author.id,
            publication.author.displayName,
            JSON.stringify(publication.conflictsOfInterest ?? []),
            ...(publication.forkedFromPublicationId ? [publication.forkedFromPublicationId] : []),
            publication.projectedAt,
          ]
        )
      }

      const chartSpecPlaceholder = chartSpecId ? '?' : 'NULL'
      const supersedesPlaceholder = publication.currentRevision.supersedesRevisionId ? '?' : 'NULL'
      await trx.rawQuery(
        `
          INSERT INTO publication_revisions (
            id, publication_id, revision_number, title, content,
            evidence, chart_spec_id, limitations, warnings,
            published_at, supersedes_revision_id
          ) VALUES (?, ?, ?, ?, ?, ?::jsonb, ${chartSpecPlaceholder}, ?::jsonb, ?::jsonb, ?, ${supersedesPlaceholder})
        `,
        [
          publication.currentRevision.id,
          publication.id,
          publication.currentRevision.revisionNumber,
          publication.currentRevision.title,
          publication.currentRevision.content,
          JSON.stringify(publication.currentRevision.evidence ?? []),
          ...(chartSpecId ? [chartSpecId] : []),
          JSON.stringify(publication.currentRevision.limitations ?? []),
          JSON.stringify(publication.currentRevision.warnings ?? []),
          publication.currentRevision.publishedAt,
          ...(publication.currentRevision.supersedesRevisionId
            ? [publication.currentRevision.supersedesRevisionId]
            : []),
        ]
      )

      await trx.rawQuery(
        `
          UPDATE publications
          SET current_revision_id = ?, projected_at = ?
          WHERE id = ?
        `,
        [publication.currentRevision.id, publication.projectedAt, publication.id]
      )

      const outboxEventId = randomUUID()
      const outboxPayload = {
        publicationId: publication.id,
        revisionId: publication.currentRevision.id,
        type: publication.type,
        authorId: publication.author.id,
        title: publication.currentRevision.title,
        hasChart: Boolean(chartSpecId),
      }

      await trx.rawQuery(
        `
          INSERT INTO outbox_events (
            id, event_type, aggregate_type, aggregate_id, payload, occurred_at
          ) VALUES (?, 'publication.created', 'publication', ?, ?::jsonb, ?)
        `,
        [
          outboxEventId,
          publication.id,
          JSON.stringify(outboxPayload),
          publication.currentRevision.publishedAt,
        ]
      )
    })
  }

  async findById(id: string): Promise<PublicationRecord | null> {
    const result = await db.connection(this.readConnection).rawQuery(
      `
        SELECT *
        FROM public_publication_records
        WHERE publication_id = ?
        LIMIT 1
      `,
      [id]
    )

    const row = result.rows[0] as PublicPublicationRow | undefined
    if (!row) {
      return null
    }

    return mapRowToPublication(row)
  }

  async list(limit: number = 50): Promise<readonly PublicationRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100))
    const result = await db.connection(this.readConnection).rawQuery(
      `
        SELECT *
        FROM public_publication_records
        ORDER BY published_at DESC, publication_id DESC
        LIMIT ?
      `,
      [safeLimit]
    )

    return (result.rows as PublicPublicationRow[]).map(mapRowToPublication)
  }
}
