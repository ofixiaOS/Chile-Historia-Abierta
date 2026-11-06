import type {
  ClaimWriteRepository,
  InsertDraftParams,
  InsertRevisionParams,
  OutboxRepository,
  StoredClaim,
  StoredClaimRevision,
} from '#modules/evidence/application/claim_write_repository'
import type { ClaimRecord, EvidenceReference } from '#modules/evidence/domain/claim'
import type { ClaimOutboxEvent, EvidenceInput } from '#modules/evidence/domain/editorial_claim'
import { randomUUID } from 'node:crypto'

export default class InMemoryClaimWriteRepository
  implements ClaimWriteRepository, OutboxRepository
{
  private readonly claims = new Map<string, StoredClaim>()
  private readonly revisions = new Map<string, StoredClaimRevision[]>()
  private readonly outbox: ClaimOutboxEvent[] = []

  async findClaimForUpdate(id: string): Promise<StoredClaim | null> {
    const claim = this.claims.get(id)
    return claim ? structuredClone(claim) : null
  }

  async insertDraft(params: InsertDraftParams): Promise<ClaimRecord> {
    const projectedAt = new Date().toISOString()
    const evidence = this.mapInputsToReferences(params.evidence)

    const revision: StoredClaimRevision = {
      id: params.revisionId,
      claimId: params.claimId,
      revisionNumber: 1,
      statement: params.statement,
      evidenceStatus: params.evidenceStatus,
      editorialStatus: 'draft',
      publishedAt: null,
      supersedesRevisionId: null,
      limitations: params.limitations,
      evidence,
    }

    const storedClaim: StoredClaim = {
      id: params.claimId,
      currentRevisionId: params.revisionId,
      currentRevision: revision,
      projectedAt,
    }

    this.claims.set(params.claimId, storedClaim)
    this.revisions.set(params.claimId, [revision])

    this.recordOutboxEvent(params.outboxEvent)

    return {
      id: params.claimId,
      currentRevision: revision,
      projectedAt,
    }
  }

  async insertRevision(params: InsertRevisionParams): Promise<ClaimRecord> {
    const projectedAt = new Date().toISOString()
    const evidence = this.mapInputsToReferences(params.evidence)

    const revision: StoredClaimRevision = {
      id: params.revisionId,
      claimId: params.claimId,
      revisionNumber: params.revisionNumber,
      statement: params.statement,
      evidenceStatus: params.evidenceStatus,
      editorialStatus: params.editorialStatus,
      publishedAt: params.publishedAt,
      supersedesRevisionId: params.supersedesRevisionId,
      limitations: params.limitations,
      evidence,
    }

    const claimHistory = this.revisions.get(params.claimId) ?? []
    claimHistory.push(revision)
    this.revisions.set(params.claimId, claimHistory)

    const storedClaim: StoredClaim = {
      id: params.claimId,
      currentRevisionId: params.revisionId,
      currentRevision: revision,
      projectedAt,
    }

    this.claims.set(params.claimId, storedClaim)
    this.recordOutboxEvent(params.outboxEvent)

    return {
      id: params.claimId,
      currentRevision: revision,
      projectedAt,
    }
  }

  async findPending(limit: number): Promise<readonly ClaimOutboxEvent[]> {
    return this.outbox
      .filter((event) => event.publishedAt === null)
      .slice(0, limit)
      .map((event) => structuredClone(event))
  }

  async markPublished(ids: readonly string[], publishedAt: string): Promise<void> {
    const idSet = new Set(ids)
    for (const event of this.outbox) {
      if (idSet.has(event.id)) {
        ;(event as { publishedAt: string | null }).publishedAt = publishedAt
      }
    }
  }

  getAllEvents(): readonly ClaimOutboxEvent[] {
    return this.outbox.map((event) => structuredClone(event))
  }

  private recordOutboxEvent(event: Omit<ClaimOutboxEvent, 'publishedAt' | 'retryCount'>): void {
    this.outbox.push({
      ...event,
      publishedAt: null,
      retryCount: 0,
    })
  }

  private mapInputsToReferences(inputs: readonly EvidenceInput[]): readonly EvidenceReference[] {
    return inputs.map((item) => ({
      linkType: item.linkType,
      source: {
        id: randomUUID(),
        sourceType: item.source.sourceType,
        sourceName: item.source.sourceName,
        responsibleAgent: item.source.responsibleAgent,
        sourceUrl: item.source.sourceUrl,
        publishedAt: item.source.publishedAt ?? null,
      },
      artifact: {
        id: randomUUID(),
        retrievedAt: item.artifact.retrievedAt,
        contentHash: item.artifact.contentHash,
        hashAlgorithm: item.artifact.hashAlgorithm,
        softwareLicense: item.artifact.softwareLicense,
        datasetLicense: item.artifact.datasetLicense,
        itemRights: item.artifact.itemRights,
        redistributionPolicy: item.artifact.redistributionPolicy,
        requiredAttribution: item.artifact.requiredAttribution,
      },
      locator: {
        type: item.locator.type,
        value: item.locator.value,
      },
      transformationMethod: item.transformationMethod,
      limitations: item.limitations ?? [],
    }))
  }
}
