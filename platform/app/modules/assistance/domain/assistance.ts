import type { EvidenceStatus } from '#modules/evidence/domain/claim'
import type { ChunkLocator } from '#modules/assistance/domain/chunk'

export type AbstentionReason =
  | 'EVIDENCE_INSUFFICIENT'
  | 'POTENTIAL_INJECTION_DETECTED'
  | 'CITATION_UNVERIFIED'
  | 'DISPUTE_UNRESOLVED'
  | 'OUT_OF_SCOPE'

export interface TimeRangeFilter {
  readonly fromYear?: number
  readonly toYear?: number
}

export interface AssistanceQuery {
  readonly queryText: string
  readonly timeRange?: TimeRangeFilter
  readonly sourceFilters?: readonly string[]
}

export interface Citation {
  readonly chunkId: string
  readonly sourceId: string
  readonly sourceName: string
  readonly locator: ChunkLocator
  readonly quoteExcerpt: string
}

export interface DisagreementRecord {
  readonly topic: string
  readonly postureA: string
  readonly postureB: string
  readonly sourcesA: readonly string[]
  readonly sourcesB: readonly string[]
}

export interface AssistanceMetrics {
  readonly latencyMs: number
  readonly tokensEstimated: number
  readonly modelId: string
}

export interface AssistanceResponse {
  readonly answer: string
  readonly evidenceStatus: EvidenceStatus | 'not_verified'
  readonly citations: readonly Citation[]
  readonly disagreements: readonly DisagreementRecord[]
  readonly abstained: boolean
  readonly abstentionReason: AbstentionReason | null
  readonly metrics: AssistanceMetrics
}
