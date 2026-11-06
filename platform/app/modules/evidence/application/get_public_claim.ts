import type { ClaimRepository } from '#modules/evidence/application/claim_repository'
import { assertClaimIsPublic, type ClaimRecord } from '#modules/evidence/domain/claim'
import ApiError from '#shared/errors/api_error'

export interface PublicClaimResponse {
  readonly data: {
    readonly type: 'claim'
    readonly id: string
    readonly attributes: {
      readonly statement: string
      readonly revision: {
        readonly id: string
        readonly number: number
        readonly supersedesRevisionId: string | null
      }
      readonly editorialStatus: 'published' | 'corrected'
      readonly publishedAt: string
    }
  }
  readonly included: readonly []
  readonly sources: readonly {
    readonly sourceId: string
    readonly artifactId: string
    readonly sourceType: string
    readonly sourceName: string
    readonly responsibleAgent: string
    readonly sourceUrl: string
    readonly publishedAt: string | null
    readonly retrievedAt: string
    readonly locator: {
      readonly type: string
      readonly value: string
    }
    readonly contentHash: string
    readonly hashAlgorithm: 'sha256'
    readonly rights: {
      readonly softwareLicense: string
      readonly datasetLicense: string
      readonly itemRights: string
      readonly redistributionPolicy: string
      readonly requiredAttribution: string
    }
    readonly transformationMethod: string
    readonly linkType: string
    readonly limitations: readonly string[]
  }[]
  readonly evidenceStatus: ClaimRecord['currentRevision']['evidenceStatus']
  readonly asOf: string
  readonly version: string
  readonly freshness: {
    readonly generatedAt: string
    readonly sourceVersion: string
  }
  readonly limitations: readonly string[]
  readonly links: {
    readonly self: string
  }
}

export default class GetPublicClaim {
  constructor(private readonly repository: ClaimRepository) {}

  async execute(id: string): Promise<PublicClaimResponse> {
    const record = await this.repository.findById(id)
    if (!record) {
      throw new ApiError('E_NOT_FOUND', 'Claim not found', 404)
    }

    assertClaimIsPublic(record)
    const revision = record.currentRevision
    const firstSourceVersion = revision.evidence[0].artifact.contentHash

    return {
      data: {
        type: 'claim',
        id: record.id,
        attributes: {
          statement: revision.statement,
          revision: {
            id: revision.id,
            number: revision.revisionNumber,
            supersedesRevisionId: revision.supersedesRevisionId,
          },
          editorialStatus: revision.editorialStatus,
          publishedAt: revision.publishedAt,
        },
      },
      included: [],
      sources: revision.evidence.map((reference) => ({
        sourceId: reference.source.id,
        artifactId: reference.artifact.id,
        sourceType: reference.source.sourceType,
        sourceName: reference.source.sourceName,
        responsibleAgent: reference.source.responsibleAgent,
        sourceUrl: reference.source.sourceUrl,
        publishedAt: reference.source.publishedAt,
        retrievedAt: reference.artifact.retrievedAt,
        locator: reference.locator,
        contentHash: reference.artifact.contentHash,
        hashAlgorithm: reference.artifact.hashAlgorithm,
        rights: {
          softwareLicense: reference.artifact.softwareLicense,
          datasetLicense: reference.artifact.datasetLicense,
          itemRights: reference.artifact.itemRights,
          redistributionPolicy: reference.artifact.redistributionPolicy,
          requiredAttribution: reference.artifact.requiredAttribution,
        },
        transformationMethod: reference.transformationMethod,
        linkType: reference.linkType,
        limitations: reference.limitations,
      })),
      evidenceStatus: revision.evidenceStatus,
      asOf: record.projectedAt,
      version: `${record.id}:revision:${revision.revisionNumber}:${revision.id}`,
      freshness: {
        generatedAt: record.projectedAt,
        sourceVersion: firstSourceVersion,
      },
      limitations: revision.limitations,
      links: {
        self: `/v1/claims/${encodeURIComponent(record.id)}`,
      },
    }
  }
}
