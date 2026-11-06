import type {
  HttpTransport,
  RawArtifact,
  SourceConnector,
} from '#modules/catalog/domain/source_connector'
import { computeSha256 } from '#modules/catalog/domain/source_connector'
import type EditorialClaimService from '#modules/evidence/application/editorial_claim_service'
import type { ClaimRecord } from '#modules/evidence/domain/claim'
import type { EvidenceInput } from '#modules/evidence/domain/editorial_claim'
import ApiError from '#shared/errors/api_error'
import env from '#start/env'
import { shouldSeedFixtures } from '#shared/fixtures/fixture_policy'

export interface IngestionOptions {
  readonly transport?: HttpTransport
  readonly autoPublish?: boolean
}

export interface IngestionResult {
  readonly sourceId: string
  readonly rawArtifact: RawArtifact
  readonly createdClaims: readonly ClaimRecord[]
}

export default class IngestionService {
  constructor(private readonly editorialService: EditorialClaimService) {}

  async ingest(
    connector: SourceConnector,
    targetUrl: string,
    options: IngestionOptions = {}
  ): Promise<IngestionResult> {
    if (!shouldSeedFixtures(env.get('NODE_ENV'))) {
      throw new ApiError(
        'E_RELEASE_FLOW_REQUIRED',
        'Legacy ingestion does not retain the original; use the staged release flow',
        503
      )
    }
    const rawArtifact = await connector.fetch(targetUrl, options.transport)

    // Verify cryptographic integrity before any normalization
    const expectedHash = computeSha256(rawArtifact.content)
    if (expectedHash !== rawArtifact.contentHash) {
      throw new ApiError(
        'E_VALIDATION',
        'Cryptographic hash mismatch: raw artifact was corrupted or modified',
        422,
        {
          expectedHash,
          declaredHash: rawArtifact.contentHash,
        }
      )
    }

    const extraction = connector.normalize(rawArtifact)
    const createdClaims: ClaimRecord[] = []

    for (const extracted of extraction.claims) {
      const evidenceInput: EvidenceInput = {
        source: {
          sourceType: connector.policy.sourceType,
          sourceName: connector.policy.sourceName,
          responsibleAgent: connector.policy.responsibleAgent,
          sourceUrl: rawArtifact.sourceUrl,
          publishedAt: null,
        },
        artifact: {
          retrievedAt: rawArtifact.retrievedAt,
          contentHash: rawArtifact.contentHash,
          hashAlgorithm: 'sha256',
          softwareLicense: connector.policy.softwareLicense,
          datasetLicense: connector.policy.datasetLicense,
          itemRights: connector.policy.itemRights,
          redistributionPolicy: connector.policy.redistributionPolicy,
          requiredAttribution: connector.policy.requiredAttribution,
        },
        linkType: extracted.linkType,
        locator: extracted.locator,
        transformationMethod: extracted.transformationMethod,
        limitations: extracted.limitations,
      }

      let claimRecord = await this.editorialService.createDraft({
        statement: extracted.statement,
        evidenceStatus: extracted.evidenceStatus,
        limitations: extracted.limitations,
        evidence: [evidenceInput],
      })

      if (options.autoPublish) {
        claimRecord = await this.editorialService.publishClaim({
          claimId: claimRecord.id,
          publishedAt: rawArtifact.retrievedAt,
        })
      }

      createdClaims.push(claimRecord)
    }

    return {
      sourceId: connector.policy.sourceId,
      rawArtifact,
      createdClaims,
    }
  }
}
