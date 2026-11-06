import ApiError from '#shared/errors/api_error'

export const evidenceStatuses = [
  'documented',
  'inferred',
  'disputed',
  'hypothesis',
  'forecast',
  'unknown',
] as const

export const editorialStatuses = [
  'draft',
  'in_review',
  'published',
  'corrected',
  'retracted',
  'archived',
] as const

export const sourceTypes = [
  'primary_archive',
  'official_statistical',
  'official_administrative',
  'academic_research',
  'secondary_historiography',
  'press',
  'testimony',
  'community_post',
  'ai_output',
] as const

export type EvidenceStatus = (typeof evidenceStatuses)[number]
export type EditorialStatus = (typeof editorialStatuses)[number]
export type SourceType = (typeof sourceTypes)[number]
export type EvidenceLinkType = 'supports' | 'contradicts' | 'contextualizes' | 'mentions'

export interface SourceReference {
  readonly id: string
  readonly sourceType: SourceType
  readonly sourceName: string
  readonly responsibleAgent: string
  readonly sourceUrl: string
  readonly publishedAt: string | null
}

export interface SourceArtifactReference {
  readonly id: string
  readonly retrievedAt: string
  readonly contentHash: string
  readonly hashAlgorithm: 'sha256'
  readonly softwareLicense: string
  readonly datasetLicense: string
  readonly itemRights: string
  readonly redistributionPolicy: string
  readonly requiredAttribution: string
}

export interface EvidenceReference {
  readonly linkType: EvidenceLinkType
  readonly source: SourceReference
  readonly artifact: SourceArtifactReference
  readonly locator: {
    readonly type: 'page' | 'table' | 'row' | 'selector' | 'fragment' | 'timecode'
    readonly value: string
  }
  readonly transformationMethod: string
  readonly limitations: readonly string[]
}

export interface ClaimRevision {
  readonly id: string
  readonly revisionNumber: number
  readonly statement: string
  readonly evidenceStatus: EvidenceStatus
  readonly editorialStatus: EditorialStatus
  readonly publishedAt: string | null
  readonly supersedesRevisionId: string | null
  readonly limitations: readonly string[]
  readonly evidence: readonly EvidenceReference[]
}

export interface ClaimRecord {
  readonly id: string
  readonly currentRevision: ClaimRevision
  readonly projectedAt: string
}

export type PublicClaimRevision = Omit<
  ClaimRevision,
  'editorialStatus' | 'publishedAt' | 'evidence'
> & {
  readonly editorialStatus: 'published' | 'corrected'
  readonly publishedAt: string
  readonly evidence: readonly [EvidenceReference, ...EvidenceReference[]]
}

export type PublicClaimRecord = Omit<ClaimRecord, 'currentRevision'> & {
  readonly currentRevision: PublicClaimRevision
}

const sha256Pattern = /^[a-f0-9]{64}$/
const publicEditorialStatuses: ReadonlySet<EditorialStatus> = new Set(['published', 'corrected'])

function hasText(value: string): boolean {
  return value.trim().length > 0
}

export function assertClaimIsPublic(record: ClaimRecord): asserts record is PublicClaimRecord {
  const revision = record.currentRevision

  if (!publicEditorialStatuses.has(revision.editorialStatus)) {
    throw new ApiError('E_NOT_FOUND', 'Claim not found', 404)
  }

  if (!hasText(revision.statement) || !revision.publishedAt || revision.evidence.length === 0) {
    throw new ApiError(
      'E_EVIDENCE_INSUFFICIENT',
      'The claim cannot be published without localizable evidence',
      422
    )
  }

  for (const reference of revision.evidence) {
    const artifact = reference.artifact
    if (
      !hasText(reference.locator.value) ||
      !sha256Pattern.test(artifact.contentHash) ||
      !hasText(artifact.itemRights) ||
      !hasText(artifact.redistributionPolicy) ||
      !hasText(artifact.requiredAttribution)
    ) {
      throw new ApiError(
        'E_EVIDENCE_INSUFFICIENT',
        'The claim evidence envelope is incomplete',
        422
      )
    }
  }

  if (revision.evidenceStatus === 'documented') {
    const supportingEvidence = revision.evidence.filter(({ linkType }) => linkType === 'supports')
    if (
      supportingEvidence.length === 0 ||
      supportingEvidence.every(({ source }) => source.sourceType === 'ai_output')
    ) {
      throw new ApiError(
        'E_EVIDENCE_INSUFFICIENT',
        'A documented claim requires non-AI supporting evidence',
        422
      )
    }
  }
}
