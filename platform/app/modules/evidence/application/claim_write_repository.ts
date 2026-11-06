import type {
  ClaimRecord,
  EditorialStatus,
  EvidenceReference,
  EvidenceStatus,
} from '#modules/evidence/domain/claim'
import type { ClaimOutboxEvent, EvidenceInput } from '#modules/evidence/domain/editorial_claim'

export interface StoredClaimRevision {
  readonly id: string
  readonly claimId: string
  readonly revisionNumber: number
  readonly statement: string
  readonly evidenceStatus: EvidenceStatus
  readonly editorialStatus: EditorialStatus
  readonly publishedAt: string | null
  readonly supersedesRevisionId: string | null
  readonly limitations: readonly string[]
  readonly evidence: readonly EvidenceReference[]
}

export interface StoredClaim {
  readonly id: string
  readonly currentRevisionId: string | null
  readonly currentRevision: StoredClaimRevision | null
  readonly projectedAt: string
}

export interface InsertDraftParams {
  readonly claimId: string
  readonly revisionId: string
  readonly statement: string
  readonly evidenceStatus: EvidenceStatus
  readonly limitations: readonly string[]
  readonly evidence: readonly EvidenceInput[]
  readonly outboxEvent: Omit<ClaimOutboxEvent, 'publishedAt' | 'retryCount'>
}

export interface InsertRevisionParams {
  readonly claimId: string
  readonly revisionId: string
  readonly revisionNumber: number
  readonly statement: string
  readonly evidenceStatus: EvidenceStatus
  readonly editorialStatus: EditorialStatus
  readonly publishedAt: string | null
  readonly supersedesRevisionId: string | null
  readonly limitations: readonly string[]
  readonly evidence: readonly EvidenceInput[]
  readonly outboxEvent: Omit<ClaimOutboxEvent, 'publishedAt' | 'retryCount'>
}

export interface ClaimWriteRepository {
  findClaimForUpdate(id: string): Promise<StoredClaim | null>
  insertDraft(params: InsertDraftParams): Promise<ClaimRecord>
  insertRevision(params: InsertRevisionParams): Promise<ClaimRecord>
}

export interface OutboxRepository {
  findPending(limit: number): Promise<readonly ClaimOutboxEvent[]>
  markPublished(ids: readonly string[], publishedAt: string): Promise<void>
}
