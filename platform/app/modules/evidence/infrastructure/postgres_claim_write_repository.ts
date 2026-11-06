import type {
  ClaimWriteRepository,
  InsertDraftParams,
  InsertRevisionParams,
  StoredClaim,
  StoredClaimRevision,
} from '#modules/evidence/application/claim_write_repository'
import type { ClaimRecord, EvidenceReference } from '#modules/evidence/domain/claim'
import type { EvidenceInput } from '#modules/evidence/domain/editorial_claim'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract, TransactionClientContract } from '@adonisjs/lucid/types/database'
import { randomUUID } from 'node:crypto'

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

interface EvidenceRow {
  link_id: string
  link_type: EvidenceReference['linkType']
  locator_type: EvidenceReference['locator']['type']
  locator_value: string
  transformation_method: string
  limitations: string[] | string
  source_id: string
  source_type: EvidenceReference['source']['sourceType']
  source_name: string
  responsible_agent: string
  source_url: string
  source_published_at: Date | string | null
  artifact_id: string
  retrieved_at: Date | string
  content_hash: string
  hash_algorithm: 'sha256'
  software_license: string
  dataset_license: string
  item_rights: string
  redistribution_policy: string
  required_attribution: string
}

async function findOrInsertSourceAndArtifact(
  trx: TransactionClientContract,
  evidence: EvidenceInput
): Promise<string> {
  const sourceResult = await trx.rawQuery(
    'SELECT id FROM sources WHERE source_url = ? AND source_name = ? LIMIT 1',
    [evidence.source.sourceUrl, evidence.source.sourceName]
  )
  let sourceId = sourceResult.rows[0]?.id as string | undefined

  if (!sourceId) {
    sourceId = randomUUID()
    const publishedAtPlaceholder = evidence.source.publishedAt ? '?' : 'NULL'
    await trx.rawQuery(
      `
        INSERT INTO sources (
          id, source_type, source_name, responsible_agent, source_url, published_at
        ) VALUES (?, ?, ?, ?, ?, ${publishedAtPlaceholder})
      `,
      [
        sourceId,
        evidence.source.sourceType,
        evidence.source.sourceName,
        evidence.source.responsibleAgent,
        evidence.source.sourceUrl,
        ...(evidence.source.publishedAt ? [evidence.source.publishedAt] : []),
      ]
    )
  }

  const artifactResult = await trx.rawQuery(
    'SELECT id FROM source_artifacts WHERE source_id = ? AND content_hash = ? LIMIT 1',
    [sourceId, evidence.artifact.contentHash]
  )
  let artifactId = artifactResult.rows[0]?.id as string | undefined

  if (!artifactId) {
    artifactId = randomUUID()
    await trx.rawQuery(
      `
        INSERT INTO source_artifacts (
          id, source_id, retrieved_at, content_hash, hash_algorithm,
          software_license, dataset_license, item_rights,
          redistribution_policy, required_attribution
        ) VALUES (?, ?, ?, ?, 'sha256', ?, ?, ?, ?, ?)
      `,
      [
        artifactId,
        sourceId,
        evidence.artifact.retrievedAt,
        evidence.artifact.contentHash,
        evidence.artifact.softwareLicense,
        evidence.artifact.datasetLicense,
        evidence.artifact.itemRights,
        evidence.artifact.redistributionPolicy,
        evidence.artifact.requiredAttribution,
      ]
    )
  }

  return artifactId
}

async function loadStoredClaim(
  client: QueryClientContract,
  claimId: string
): Promise<StoredClaim | null> {
  const claimRes = await client.rawQuery(
    'SELECT id, current_revision_id, projected_at FROM claims WHERE id = ? LIMIT 1',
    [claimId]
  )
  const claimRow = claimRes.rows[0]
  if (!claimRow) {
    return null
  }

  if (!claimRow.current_revision_id) {
    return {
      id: claimRow.id,
      currentRevisionId: null,
      currentRevision: null,
      projectedAt: toIsoString(claimRow.projected_at),
    }
  }

  const revRes = await client.rawQuery(
    `
      SELECT
        id, claim_id, revision_number, statement, evidence_status,
        editorial_status, published_at, supersedes_revision_id, limitations
      FROM claim_revisions
      WHERE id = ?
      LIMIT 1
    `,
    [claimRow.current_revision_id]
  )
  const revRow = revRes.rows[0]
  if (!revRow) {
    return null
  }

  const evidenceRes = await client.rawQuery(
    `
      SELECT
        link.id AS link_id,
        link.link_type,
        link.locator_type,
        link.locator_value,
        link.transformation_method,
        link.limitations,
        source.id AS source_id,
        source.source_type,
        source.source_name,
        source.responsible_agent,
        source.source_url,
        source.published_at AS source_published_at,
        artifact.id AS artifact_id,
        artifact.retrieved_at,
        trim(artifact.content_hash) AS content_hash,
        artifact.hash_algorithm,
        artifact.software_license,
        artifact.dataset_license,
        artifact.item_rights,
        artifact.redistribution_policy,
        artifact.required_attribution
      FROM evidence_links link
      JOIN source_artifacts artifact ON artifact.id = link.source_artifact_id
      JOIN sources source ON source.id = artifact.source_id
      WHERE link.revision_id = ?
      ORDER BY link.id ASC
    `,
    [revRow.id]
  )

  const evidence: EvidenceReference[] = (evidenceRes.rows as EvidenceRow[]).map((r) => ({
    linkType: r.link_type,
    source: {
      id: r.source_id,
      sourceType: r.source_type,
      sourceName: r.source_name,
      responsibleAgent: r.responsible_agent,
      sourceUrl: r.source_url,
      publishedAt: r.source_published_at ? toIsoString(r.source_published_at) : null,
    },
    artifact: {
      id: r.artifact_id,
      retrievedAt: toIsoString(r.retrieved_at),
      contentHash: r.content_hash,
      hashAlgorithm: r.hash_algorithm,
      softwareLicense: r.software_license,
      datasetLicense: r.dataset_license,
      itemRights: r.item_rights,
      redistributionPolicy: r.redistribution_policy,
      requiredAttribution: r.required_attribution,
    },
    locator: {
      type: r.locator_type,
      value: r.locator_value,
    },
    transformationMethod: r.transformation_method,
    limitations: Array.isArray(r.limitations)
      ? r.limitations
      : typeof r.limitations === 'string'
        ? JSON.parse(r.limitations)
        : [],
  }))

  const revision: StoredClaimRevision = {
    id: revRow.id,
    claimId: revRow.claim_id,
    revisionNumber: revRow.revision_number,
    statement: revRow.statement,
    evidenceStatus: revRow.evidence_status,
    editorialStatus: revRow.editorial_status,
    publishedAt: revRow.published_at ? toIsoString(revRow.published_at) : null,
    supersedesRevisionId: revRow.supersedes_revision_id,
    limitations: Array.isArray(revRow.limitations)
      ? revRow.limitations
      : typeof revRow.limitations === 'string'
        ? JSON.parse(revRow.limitations)
        : [],
    evidence,
  }

  return {
    id: claimRow.id,
    currentRevisionId: claimRow.current_revision_id,
    currentRevision: revision,
    projectedAt: toIsoString(claimRow.projected_at),
  }
}

export default class PostgresClaimWriteRepository implements ClaimWriteRepository {
  async findClaimForUpdate(id: string): Promise<StoredClaim | null> {
    return loadStoredClaim(db.connection('admin'), id)
  }

  async insertDraft(params: InsertDraftParams): Promise<ClaimRecord> {
    return db.connection('admin').transaction(async (trx) => {
      const now = new Date().toISOString()

      await trx.rawQuery('INSERT INTO claims (id, projected_at) VALUES (?, ?)', [
        params.claimId,
        now,
      ])

      await trx.rawQuery(
        `
          INSERT INTO claim_revisions (
            id, claim_id, revision_number, statement, evidence_status,
            editorial_status, published_at, supersedes_revision_id, limitations
          ) VALUES (?, ?, 1, ?, ?, 'draft', NULL, NULL, ?::jsonb)
        `,
        [
          params.revisionId,
          params.claimId,
          params.statement,
          params.evidenceStatus,
          JSON.stringify(params.limitations),
        ]
      )

      for (const item of params.evidence) {
        const artifactId = await findOrInsertSourceAndArtifact(trx, item)
        await trx.rawQuery(
          `
            INSERT INTO evidence_links (
              id, revision_id, source_artifact_id, link_type, locator_type,
              locator_value, transformation_method, limitations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb)
          `,
          [
            randomUUID(),
            params.revisionId,
            artifactId,
            item.linkType,
            item.locator.type,
            item.locator.value,
            item.transformationMethod,
            JSON.stringify(item.limitations ?? []),
          ]
        )
      }

      await trx.rawQuery(
        'UPDATE claims SET current_revision_id = ?, projected_at = ? WHERE id = ?',
        [params.revisionId, now, params.claimId]
      )

      await trx.rawQuery(
        `
          INSERT INTO outbox_events (
            id, event_type, aggregate_type, aggregate_id, payload, occurred_at
          ) VALUES (?, ?, ?, ?, ?::jsonb, ?)
        `,
        [
          params.outboxEvent.id,
          params.outboxEvent.eventType,
          params.outboxEvent.aggregateType,
          params.outboxEvent.aggregateId,
          JSON.stringify(params.outboxEvent.payload),
          params.outboxEvent.occurredAt,
        ]
      )

      await trx.rawQuery('SET CONSTRAINTS claims_public_evidence_guard IMMEDIATE')

      const stored = await loadStoredClaim(trx, params.claimId)
      if (!stored || !stored.currentRevision) {
        throw new Error('Failed to reload stored claim after insertDraft')
      }

      return {
        id: stored.id,
        currentRevision: stored.currentRevision,
        projectedAt: stored.projectedAt,
      }
    })
  }

  async insertRevision(params: InsertRevisionParams): Promise<ClaimRecord> {
    return db.connection('admin').transaction(async (trx) => {
      const now = new Date().toISOString()
      const publishedAt = params.publishedAt ?? (params.editorialStatus !== 'draft' ? now : null)
      const publishedAtPlaceholder = publishedAt ? '?' : 'NULL'
      const supersedesPlaceholder = params.supersedesRevisionId ? '?' : 'NULL'

      await trx.rawQuery(
        `
          INSERT INTO claim_revisions (
            id, claim_id, revision_number, statement, evidence_status,
            editorial_status, published_at, supersedes_revision_id, limitations
          ) VALUES (?, ?, ?, ?, ?, ?, ${publishedAtPlaceholder}, ${supersedesPlaceholder}, ?::jsonb)
        `,
        [
          params.revisionId,
          params.claimId,
          params.revisionNumber,
          params.statement,
          params.evidenceStatus,
          params.editorialStatus,
          ...(publishedAt ? [publishedAt] : []),
          ...(params.supersedesRevisionId ? [params.supersedesRevisionId] : []),
          JSON.stringify(params.limitations),
        ]
      )

      for (const item of params.evidence) {
        const artifactId = await findOrInsertSourceAndArtifact(trx, item)
        await trx.rawQuery(
          `
            INSERT INTO evidence_links (
              id, revision_id, source_artifact_id, link_type, locator_type,
              locator_value, transformation_method, limitations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb)
          `,
          [
            randomUUID(),
            params.revisionId,
            artifactId,
            item.linkType,
            item.locator.type,
            item.locator.value,
            item.transformationMethod,
            JSON.stringify(item.limitations ?? []),
          ]
        )
      }

      await trx.rawQuery(
        'UPDATE claims SET current_revision_id = ?, projected_at = ? WHERE id = ?',
        [params.revisionId, now, params.claimId]
      )

      await trx.rawQuery(
        `
          INSERT INTO outbox_events (
            id, event_type, aggregate_type, aggregate_id, payload, occurred_at
          ) VALUES (?, ?, ?, ?, ?::jsonb, ?)
        `,
        [
          params.outboxEvent.id,
          params.outboxEvent.eventType,
          params.outboxEvent.aggregateType,
          params.outboxEvent.aggregateId,
          JSON.stringify(params.outboxEvent.payload),
          params.outboxEvent.occurredAt,
        ]
      )

      await trx.rawQuery('SET CONSTRAINTS claims_public_evidence_guard IMMEDIATE')

      const stored = await loadStoredClaim(trx, params.claimId)
      if (!stored || !stored.currentRevision) {
        throw new Error('Failed to reload stored claim after insertRevision')
      }

      return {
        id: stored.id,
        currentRevision: stored.currentRevision,
        projectedAt: stored.projectedAt,
      }
    })
  }
}
