import type { EvidenceLinkType, EvidenceStatus, SourceType } from '#modules/evidence/domain/claim'
import ApiError from '#shared/errors/api_error'

export const claimEventTypes = [
  'claim.created',
  'claim.published',
  'claim.corrected',
  'claim.retracted',
] as const

export type ClaimEventType = (typeof claimEventTypes)[number]

export interface SourceInput {
  readonly sourceType: SourceType
  readonly sourceName: string
  readonly responsibleAgent: string
  readonly sourceUrl: string
  readonly publishedAt?: string | null
}

export interface SourceArtifactInput {
  readonly retrievedAt: string
  readonly contentHash: string
  readonly hashAlgorithm: 'sha256'
  readonly softwareLicense: string
  readonly datasetLicense: string
  readonly itemRights: string
  readonly redistributionPolicy: string
  readonly requiredAttribution: string
}

export interface EvidenceInput {
  readonly source: SourceInput
  readonly artifact: SourceArtifactInput
  readonly linkType: EvidenceLinkType
  readonly locator: {
    readonly type: 'page' | 'table' | 'row' | 'selector' | 'fragment' | 'timecode'
    readonly value: string
  }
  readonly transformationMethod: string
  readonly limitations?: readonly string[]
}

export interface CreateDraftClaimCommand {
  readonly id?: string
  readonly statement: string
  readonly evidenceStatus: EvidenceStatus
  readonly limitations?: readonly string[]
  readonly evidence?: readonly EvidenceInput[]
}

export interface PublishClaimRevisionCommand {
  readonly claimId: string
  readonly statement?: string
  readonly evidenceStatus?: EvidenceStatus
  readonly limitations?: readonly string[]
  readonly evidence?: readonly EvidenceInput[]
  readonly publishedAt?: string
}

export interface CreateCorrectionCommand {
  readonly claimId: string
  readonly supersedesRevisionId: string
  readonly statement: string
  readonly evidenceStatus: EvidenceStatus
  readonly limitations?: readonly string[]
  readonly evidence: readonly [EvidenceInput, ...EvidenceInput[]]
  readonly publishedAt?: string
}

export interface RetractClaimCommand {
  readonly claimId: string
  readonly supersedesRevisionId: string
  readonly reason: string
  readonly limitations?: readonly string[]
}

export interface ClaimOutboxEvent {
  readonly id: string
  readonly eventType: ClaimEventType
  readonly aggregateType: 'claim'
  readonly aggregateId: string
  readonly payload: Record<string, unknown>
  readonly occurredAt: string
  readonly publishedAt: string | null
  readonly retryCount: number
}

const sha256Pattern = /^[a-f0-9]{64}$/

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateEvidenceInput(evidence: EvidenceInput): void {
  if (!hasText(evidence.locator.value)) {
    throw new ApiError('E_VALIDATION', 'Locator value cannot be empty', 422, {
      field: 'locator.value',
    })
  }

  const artifact = evidence.artifact
  if (!sha256Pattern.test(artifact.contentHash)) {
    throw new ApiError(
      'E_VALIDATION',
      'Artifact contentHash must be a valid 64-char sha256 hex',
      422,
      {
        field: 'artifact.contentHash',
      }
    )
  }

  if (
    !hasText(artifact.itemRights) ||
    !hasText(artifact.redistributionPolicy) ||
    !hasText(artifact.requiredAttribution)
  ) {
    throw new ApiError('E_VALIDATION', 'Artifact rights envelope is incomplete', 422, {
      field: 'artifact.rights',
    })
  }

  const source = evidence.source
  if (
    !hasText(source.sourceName) ||
    !hasText(source.sourceUrl) ||
    !hasText(source.responsibleAgent)
  ) {
    throw new ApiError('E_VALIDATION', 'Source envelope is incomplete', 422, {
      field: 'source',
    })
  }
}

export function validatePublicationIntegrity(
  statement: string,
  evidenceStatus: EvidenceStatus,
  evidence: readonly EvidenceInput[]
): void {
  if (!hasText(statement)) {
    throw new ApiError('E_EVIDENCE_INSUFFICIENT', 'Statement cannot be empty for publication', 422)
  }

  if (evidence.length === 0) {
    throw new ApiError(
      'E_EVIDENCE_INSUFFICIENT',
      'The claim cannot be published without localizable evidence',
      422
    )
  }

  for (const item of evidence) {
    validateEvidenceInput(item)
  }

  if (evidenceStatus === 'documented') {
    const supporting = evidence.filter((item) => item.linkType === 'supports')
    if (
      supporting.length === 0 ||
      supporting.every((item) => item.source.sourceType === 'ai_output')
    ) {
      throw new ApiError(
        'E_EVIDENCE_INSUFFICIENT',
        'A documented claim requires non-AI supporting evidence',
        422
      )
    }
  }
}
