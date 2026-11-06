import {
  validateReleaseBundle,
  type ReleaseBundle,
  type ReleaseManifest,
} from '#modules/releases/domain/release_bundle'
import {
  validatePublicationIntegrity,
  type EvidenceInput,
} from '#modules/evidence/domain/editorial_claim'
import ApiError from '#shared/errors/api_error'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { randomUUID } from 'node:crypto'
import env from '#start/env'
import { assertReleaseOperationsAllowed } from '#shared/security/production_persistence_gate'

interface ReleaseRow {
  id: string
  data_version: string
  bundle_hash: string
  source_hash: string
  manifest: ReleaseManifest | string
  raw_content: Buffer
  status: 'staged' | 'approved' | 'active'
  source_review_id: string | null
  approved_by: string | null
  claim_id: string | null
}

interface SourceReviewRow {
  id: string
  source_id: string
  scope_identifier: string
  source_type: string
  source_name: string
  responsible_agent: string
  source_url: string
  sample_content_hash: string
  decision: 'approved_for_pilot' | 'blocked'
  reviewer: string
  revision_number: number
}

export interface ReleaseState {
  readonly dataVersion: string
  readonly bundleHash: string
  readonly status: ReleaseRow['status']
  readonly claimId: string | null
}

function toState(row: ReleaseRow): ReleaseState {
  return {
    dataVersion: row.data_version,
    bundleHash: row.bundle_hash.trim(),
    status: row.status,
    claimId: row.claim_id,
  }
}

function manifestOf(row: ReleaseRow): ReleaseManifest {
  return typeof row.manifest === 'string'
    ? (JSON.parse(row.manifest) as ReleaseManifest)
    : row.manifest
}

function evidenceFrom(manifest: ReleaseManifest): EvidenceInput {
  return {
    source: manifest.source,
    artifact: {
      retrievedAt: manifest.artifact.retrievedAt,
      contentHash: manifest.artifact.contentHash,
      hashAlgorithm: 'sha256',
      softwareLicense: manifest.artifact.softwareLicense,
      datasetLicense: manifest.artifact.datasetLicense,
      itemRights: manifest.artifact.itemRights,
      redistributionPolicy: manifest.artifact.redistributionPolicy,
      requiredAttribution: manifest.artifact.requiredAttribution,
    },
    linkType: 'supports',
    locator: manifest.claim.locator,
    transformationMethod: manifest.claim.transformationMethod,
    limitations: manifest.claim.limitations,
  }
}

export default class PostgresReleaseService {
  constructor(private readonly nodeEnvironment = env.get('NODE_ENV')) {}

  private assertOperationsAllowed(): void {
    assertReleaseOperationsAllowed(this.nodeEnvironment)
  }

  async recordSourceReview(input: {
    bundle: unknown
    decision: 'approved_for_pilot' | 'blocked'
    reviewer: string
    sourceConfirmed: boolean
    rightsConfirmed: boolean
    rightsEvidenceUrl?: string
    rightsSummary: string
  }): Promise<{ id: string; decision: 'approved_for_pilot' | 'blocked' }> {
    this.assertOperationsAllowed()
    if (input.decision !== 'approved_for_pilot' && input.decision !== 'blocked') {
      throw new ApiError('E_SOURCE_REVIEW_REQUIRED', 'Invalid source review decision', 422)
    }
    const { bundle } = validateReleaseBundle(input.bundle)
    const reviewer = input.reviewer.trim()
    const rightsSummary = input.rightsSummary.trim()
    if (reviewer.length < 3 || rightsSummary.length < 20) {
      throw new ApiError('E_SOURCE_REVIEW_REQUIRED', 'Reviewer and review notes are required', 422)
    }
    let rightsEvidenceUrl: string | null = null
    if (input.decision === 'approved_for_pilot') {
      if (!input.sourceConfirmed || !input.rightsConfirmed || !input.rightsEvidenceUrl) {
        throw new ApiError(
          'E_SOURCE_REVIEW_REQUIRED',
          'Source and rights review evidence are required for approval',
          422
        )
      }
      try {
        const parsed = new URL(input.rightsEvidenceUrl)
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error()
        rightsEvidenceUrl = parsed.href
      } catch {
        throw new ApiError('E_SOURCE_REVIEW_REQUIRED', 'Rights evidence URL must use HTTPS', 422)
      }
    }
    const id = randomUUID()
    await db.connection('admin').transaction(async (trx) => {
      const sourceId = bundle.manifest.source.sourceId
      const scopeIdentifier = bundle.manifest.source.scopeIdentifier
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
        `${sourceId}:${scopeIdentifier}`,
      ])
      const latest = await trx.rawQuery(
        `SELECT COALESCE(MAX(revision_number), 0)::integer AS revision_number
         FROM release_source_reviews WHERE source_id = ? AND scope_identifier = ?`,
        [sourceId, scopeIdentifier]
      )
      const revisionNumber = Number(latest.rows[0].revision_number) + 1
      await trx.rawQuery(
        `INSERT INTO release_source_reviews
          (id, source_id, scope_identifier, source_type, source_name, responsible_agent,
           source_url, sample_content_hash, sample_locator, rights_evidence_url,
           rights_summary, decision, reviewer, revision_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), ?, ?, ?, ?)`,
        [
          id,
          sourceId,
          scopeIdentifier,
          bundle.manifest.source.sourceType,
          bundle.manifest.source.sourceName,
          bundle.manifest.source.responsibleAgent,
          bundle.manifest.source.sourceUrl,
          bundle.manifest.artifact.contentHash,
          bundle.manifest.claim.locator.value,
          rightsEvidenceUrl ?? '',
          rightsSummary,
          input.decision,
          reviewer,
          revisionNumber,
        ]
      )
    })
    return { id, decision: input.decision }
  }

  private async currentSourceReview(
    trx: TransactionClientContract,
    manifest: ReleaseManifest
  ): Promise<SourceReviewRow> {
    const result = await trx.rawQuery(
      `SELECT * FROM release_source_reviews
       WHERE source_id = ? AND scope_identifier = ?
       ORDER BY revision_number DESC LIMIT 1`,
      [manifest.source.sourceId, manifest.source.scopeIdentifier]
    )
    const row = result.rows[0] as SourceReviewRow | undefined
    if (
      !row ||
      row.decision !== 'approved_for_pilot' ||
      row.source_type !== manifest.source.sourceType ||
      row.source_name !== manifest.source.sourceName ||
      row.responsible_agent !== manifest.source.responsibleAgent ||
      row.source_url !== manifest.source.sourceUrl ||
      row.sample_content_hash.trim() !== manifest.artifact.contentHash
    ) {
      throw new ApiError(
        'E_SOURCE_NOT_APPROVED',
        'No current source and artifact review matches this release bundle',
        409
      )
    }
    return row
  }

  async stage(value: unknown): Promise<ReleaseState> {
    this.assertOperationsAllowed()
    const { bundle, raw } = validateReleaseBundle(value)
    const version = bundle.manifest.dataVersion
    return db.connection('admin').transaction(async (trx) => {
      const sourceReview = await this.currentSourceReview(trx, bundle.manifest)
      const id = randomUUID()
      await trx.rawQuery(
        `INSERT INTO release_batches
          (id, data_version, bundle_hash, source_hash, manifest, raw_content, status, source_review_id)
         VALUES (?, ?, ?, ?, ?::jsonb, ?, 'staged', ?)
         ON CONFLICT (data_version) DO NOTHING`,
        [
          id,
          version,
          bundle.bundleHash,
          bundle.manifest.artifact.contentHash,
          JSON.stringify(bundle.manifest),
          raw,
          sourceReview.id,
        ]
      )
      const result = await trx.rawQuery(
        'SELECT * FROM release_batches WHERE data_version = ? FOR UPDATE',
        [version]
      )
      const row = result.rows[0] as ReleaseRow
      if (row.bundle_hash.trim() !== bundle.bundleHash) {
        throw new ApiError(
          'E_VERSION_CONFLICT',
          'dataVersion already belongs to another bundle',
          409
        )
      }
      if (row.source_review_id !== sourceReview.id) {
        throw new ApiError(
          'E_SOURCE_REVIEW_CHANGED',
          'The staged dataVersion belongs to a different source review',
          409
        )
      }
      return toState(row)
    })
  }

  async approve(input: {
    dataVersion: string
    bundleHash: string
    reviewer: string
    sourceConfirmed: boolean
    rightsConfirmed: boolean
  }): Promise<ReleaseState> {
    this.assertOperationsAllowed()
    if (!input.sourceConfirmed || !input.rightsConfirmed || input.reviewer.trim().length < 3) {
      throw new ApiError(
        'E_APPROVAL_REQUIRED',
        'Source and rights review with reviewer are required',
        422
      )
    }
    return db.connection('admin').transaction(async (trx) => {
      const result = await trx.rawQuery(
        'SELECT * FROM release_batches WHERE data_version = ? FOR UPDATE',
        [input.dataVersion]
      )
      const row = result.rows[0] as ReleaseRow | undefined
      if (!row) throw new ApiError('E_NOT_FOUND', 'Release bundle not staged', 404)
      if (row.bundle_hash.trim() !== input.bundleHash) {
        throw new ApiError(
          'E_RELEASE_HASH_MISMATCH',
          'The approved hash does not match the staged bundle',
          409
        )
      }
      const manifest = manifestOf(row)
      const sourceReview = await this.currentSourceReview(trx, manifest)
      if (row.source_review_id !== sourceReview.id) {
        throw new ApiError('E_SOURCE_REVIEW_CHANGED', 'Source review changed after staging', 409)
      }
      if (sourceReview.reviewer.trim() === input.reviewer.trim()) {
        throw new ApiError(
          'E_REVIEWER_SEPARATION_REQUIRED',
          'Source review and release approval must name different reviewers',
          422
        )
      }
      if (row.status !== 'staged') {
        if (row.approved_by !== input.reviewer.trim()) {
          throw new ApiError('E_APPROVAL_CONFLICT', 'Release has another recorded reviewer', 409)
        }
        return toState(row)
      }
      await trx.rawQuery(
        `UPDATE release_batches
         SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [input.reviewer.trim(), row.id]
      )
      return { ...toState(row), status: 'approved' }
    })
  }

  async activate(dataVersion: string, expectedHash: string): Promise<ReleaseState> {
    this.assertOperationsAllowed()
    return db.connection('admin').transaction(async (trx) => {
      const result = await trx.rawQuery(
        'SELECT * FROM release_batches WHERE data_version = ? FOR UPDATE',
        [dataVersion]
      )
      const row = result.rows[0] as ReleaseRow | undefined
      if (!row) throw new ApiError('E_NOT_FOUND', 'Release bundle not staged', 404)
      if (row.bundle_hash.trim() !== expectedHash) {
        throw new ApiError(
          'E_RELEASE_HASH_MISMATCH',
          'Expected hash does not match staged bundle',
          409
        )
      }
      if (row.status === 'active') return toState(row)
      if (row.status !== 'approved' || !row.approved_by) {
        throw new ApiError('E_APPROVAL_REQUIRED', 'Release must be approved before activation', 409)
      }

      const manifest = manifestOf(row)
      const sourceReview = await this.currentSourceReview(trx, manifest)
      if (row.source_review_id !== sourceReview.id) {
        throw new ApiError('E_SOURCE_REVIEW_CHANGED', 'Source review changed after staging', 409)
      }
      if (sourceReview.reviewer.trim() === row.approved_by.trim()) {
        throw new ApiError(
          'E_REVIEWER_SEPARATION_REQUIRED',
          'Source review and release approval must name different reviewers',
          409
        )
      }
      const bundle: ReleaseBundle = {
        manifest,
        rawBase64: row.raw_content.toString('base64'),
        bundleHash: row.bundle_hash.trim(),
      }
      validateReleaseBundle(bundle)
      const evidence = evidenceFrom(manifest)
      validatePublicationIntegrity(manifest.claim.statement, manifest.claim.evidenceStatus, [
        evidence,
      ])

      const sourceId = randomUUID()
      const artifactId = randomUUID()
      const claimId = randomUUID()
      const revisionId = randomUUID()
      const now = new Date().toISOString()
      const sourcePublishedAtSql = manifest.source.publishedAt ? '?' : 'NULL'
      await trx.rawQuery(
        `INSERT INTO sources
          (id, source_type, source_name, responsible_agent, source_url, published_at)
         VALUES (?, ?, ?, ?, ?, ${sourcePublishedAtSql})`,
        [
          sourceId,
          manifest.source.sourceType,
          manifest.source.sourceName,
          manifest.source.responsibleAgent,
          manifest.source.sourceUrl,
          ...(manifest.source.publishedAt ? [manifest.source.publishedAt] : []),
        ]
      )
      await trx.rawQuery(
        `INSERT INTO source_artifacts
          (id, source_id, retrieved_at, content_hash, hash_algorithm,
           software_license, dataset_license, item_rights, redistribution_policy,
           required_attribution, release_batch_id)
         VALUES (?, ?, ?, ?, 'sha256', ?, ?, ?, ?, ?, ?)`,
        [
          artifactId,
          sourceId,
          manifest.artifact.retrievedAt,
          manifest.artifact.contentHash,
          manifest.artifact.softwareLicense,
          manifest.artifact.datasetLicense,
          manifest.artifact.itemRights,
          manifest.artifact.redistributionPolicy,
          manifest.artifact.requiredAttribution,
          row.id,
        ]
      )
      await trx.rawQuery('INSERT INTO claims (id, projected_at) VALUES (?, ?)', [claimId, now])
      await trx.rawQuery(
        `INSERT INTO claim_revisions
          (id, claim_id, revision_number, statement, evidence_status, editorial_status,
           published_at, supersedes_revision_id, limitations)
         VALUES (?, ?, 1, ?, ?, 'published', ?, NULL, ?::jsonb)`,
        [
          revisionId,
          claimId,
          manifest.claim.statement,
          manifest.claim.evidenceStatus,
          now,
          JSON.stringify(manifest.claim.limitations),
        ]
      )
      await trx.rawQuery(
        `INSERT INTO evidence_links
          (id, revision_id, source_artifact_id, link_type, locator_type, locator_value,
           transformation_method, limitations)
         VALUES (?, ?, ?, 'supports', 'fragment', ?, ?, ?::jsonb)`,
        [
          randomUUID(),
          revisionId,
          artifactId,
          manifest.claim.locator.value,
          manifest.claim.transformationMethod,
          JSON.stringify(manifest.claim.limitations),
        ]
      )
      await trx.rawQuery(
        'UPDATE claims SET current_revision_id = ?, projected_at = ? WHERE id = ?',
        [revisionId, now, claimId]
      )
      await trx.rawQuery('SET CONSTRAINTS claims_public_evidence_guard IMMEDIATE')
      await trx.rawQuery(
        `UPDATE release_batches
         SET status = 'active', claim_id = ?, activated_at = ?
         WHERE id = ?`,
        [claimId, now, row.id]
      )
      await trx.rawQuery(
        `INSERT INTO outbox_events
          (id, event_type, aggregate_type, aggregate_id, payload, occurred_at)
         VALUES (?, 'claim.published', 'claim', ?, ?::jsonb, ?)`,
        [
          randomUUID(),
          claimId,
          JSON.stringify({
            claimId,
            revisionId,
            dataVersion,
            bundleHash: expectedHash,
            reviewer: row.approved_by,
          }),
          now,
        ]
      )
      return { dataVersion, bundleHash: expectedHash, status: 'active', claimId }
    })
  }
}
