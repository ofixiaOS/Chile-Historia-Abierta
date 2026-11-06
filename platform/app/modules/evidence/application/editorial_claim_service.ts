import type {
  ClaimWriteRepository,
  InsertDraftParams,
  InsertRevisionParams,
} from '#modules/evidence/application/claim_write_repository'
import type { ClaimRecord, EvidenceReference } from '#modules/evidence/domain/claim'
import {
  validateEvidenceInput,
  validatePublicationIntegrity,
  type CreateCorrectionCommand,
  type CreateDraftClaimCommand,
  type EvidenceInput,
  type PublishClaimRevisionCommand,
  type RetractClaimCommand,
} from '#modules/evidence/domain/editorial_claim'
import ApiError from '#shared/errors/api_error'
import { randomUUID } from 'node:crypto'

export default class EditorialClaimService {
  constructor(private readonly writeRepository: ClaimWriteRepository) {}

  async createDraft(command: CreateDraftClaimCommand): Promise<ClaimRecord> {
    if (!command.statement || command.statement.trim().length === 0) {
      throw new ApiError('E_VALIDATION', 'Draft statement cannot be empty', 422, {
        field: 'statement',
      })
    }

    const evidenceInputs = command.evidence ?? []
    for (const item of evidenceInputs) {
      validateEvidenceInput(item)
    }

    const claimId = command.id ?? randomUUID()
    const revisionId = randomUUID()
    const occurredAt = new Date().toISOString()

    const params: InsertDraftParams = {
      claimId,
      revisionId,
      statement: command.statement.trim(),
      evidenceStatus: command.evidenceStatus,
      limitations: command.limitations ?? [],
      evidence: evidenceInputs,
      outboxEvent: {
        id: randomUUID(),
        eventType: 'claim.created',
        aggregateType: 'claim',
        aggregateId: claimId,
        payload: {
          claimId,
          revisionId,
          revisionNumber: 1,
          statement: command.statement.trim(),
          evidenceStatus: command.evidenceStatus,
          editorialStatus: 'draft',
        },
        occurredAt,
      },
    }

    return this.writeRepository.insertDraft(params)
  }

  async publishClaim(command: PublishClaimRevisionCommand): Promise<ClaimRecord> {
    const claim = await this.writeRepository.findClaimForUpdate(command.claimId)
    if (!claim || !claim.currentRevision) {
      throw new ApiError('E_NOT_FOUND', 'Claim not found', 404)
    }

    const currentRev = claim.currentRevision
    const statement = (command.statement ?? currentRev.statement).trim()
    const evidenceStatus = command.evidenceStatus ?? currentRev.evidenceStatus
    const limitations = command.limitations ?? currentRev.limitations

    const evidenceInputs: readonly EvidenceInput[] =
      command.evidence && command.evidence.length > 0
        ? command.evidence
        : this.mapExistingEvidenceToInputs(currentRev.evidence)

    validatePublicationIntegrity(statement, evidenceStatus, evidenceInputs)

    const publishedAt = command.publishedAt ?? new Date().toISOString()
    const nextRevisionNumber = currentRev.revisionNumber + 1
    const revisionId = randomUUID()
    const occurredAt = publishedAt

    const editorialStatus = currentRev.editorialStatus === 'draft' ? 'published' : 'corrected'
    const eventType = editorialStatus === 'published' ? 'claim.published' : 'claim.corrected'

    const params: InsertRevisionParams = {
      claimId: claim.id,
      revisionId,
      revisionNumber: nextRevisionNumber,
      statement,
      evidenceStatus,
      editorialStatus,
      publishedAt,
      supersedesRevisionId: currentRev.id,
      limitations,
      evidence: evidenceInputs,
      outboxEvent: {
        id: randomUUID(),
        eventType,
        aggregateType: 'claim',
        aggregateId: claim.id,
        payload: {
          claimId: claim.id,
          revisionId,
          revisionNumber: nextRevisionNumber,
          statement,
          evidenceStatus,
          editorialStatus,
          publishedAt,
          supersedesRevisionId: currentRev.id,
        },
        occurredAt,
      },
    }

    return this.writeRepository.insertRevision(params)
  }

  async createCorrection(command: CreateCorrectionCommand): Promise<ClaimRecord> {
    const claim = await this.writeRepository.findClaimForUpdate(command.claimId)
    if (!claim || !claim.currentRevision) {
      throw new ApiError('E_NOT_FOUND', 'Claim not found', 404)
    }

    const currentRev = claim.currentRevision
    if (currentRev.id !== command.supersedesRevisionId) {
      throw new ApiError(
        'E_VERSION_CONFLICT',
        'Superseded revision ID does not match current revision ID',
        409,
        {
          expected: currentRev.id,
          actual: command.supersedesRevisionId,
        }
      )
    }

    if (currentRev.editorialStatus !== 'published' && currentRev.editorialStatus !== 'corrected') {
      throw new ApiError(
        'E_VALIDATION',
        'A correction can only supersede an already published or corrected claim',
        422
      )
    }

    const statement = command.statement.trim()
    validatePublicationIntegrity(statement, command.evidenceStatus, command.evidence)

    const publishedAt = command.publishedAt ?? new Date().toISOString()
    const nextRevisionNumber = currentRev.revisionNumber + 1
    const revisionId = randomUUID()
    const occurredAt = publishedAt

    const params: InsertRevisionParams = {
      claimId: claim.id,
      revisionId,
      revisionNumber: nextRevisionNumber,
      statement,
      evidenceStatus: command.evidenceStatus,
      editorialStatus: 'corrected',
      publishedAt,
      supersedesRevisionId: currentRev.id,
      limitations: command.limitations ?? currentRev.limitations,
      evidence: command.evidence,
      outboxEvent: {
        id: randomUUID(),
        eventType: 'claim.corrected',
        aggregateType: 'claim',
        aggregateId: claim.id,
        payload: {
          claimId: claim.id,
          revisionId,
          revisionNumber: nextRevisionNumber,
          statement,
          evidenceStatus: command.evidenceStatus,
          editorialStatus: 'corrected',
          publishedAt,
          supersedesRevisionId: currentRev.id,
        },
        occurredAt,
      },
    }

    return this.writeRepository.insertRevision(params)
  }

  async retractClaim(command: RetractClaimCommand): Promise<ClaimRecord> {
    if (!command.reason || command.reason.trim().length === 0) {
      throw new ApiError('E_VALIDATION', 'Retraction reason cannot be empty', 422, {
        field: 'reason',
      })
    }

    const claim = await this.writeRepository.findClaimForUpdate(command.claimId)
    if (!claim || !claim.currentRevision) {
      throw new ApiError('E_NOT_FOUND', 'Claim not found', 404)
    }

    const currentRev = claim.currentRevision
    if (currentRev.id !== command.supersedesRevisionId) {
      throw new ApiError(
        'E_VERSION_CONFLICT',
        'Superseded revision ID does not match current revision ID',
        409,
        {
          expected: currentRev.id,
          actual: command.supersedesRevisionId,
        }
      )
    }

    if (currentRev.editorialStatus !== 'published' && currentRev.editorialStatus !== 'corrected') {
      throw new ApiError('E_VALIDATION', 'Only published or corrected claims can be retracted', 422)
    }

    const nextRevisionNumber = currentRev.revisionNumber + 1
    const revisionId = randomUUID()
    const occurredAt = new Date().toISOString()
    const retractionNote = `RETRACTED: ${command.reason.trim()}`
    const combinedLimitations = [retractionNote, ...(command.limitations ?? currentRev.limitations)]

    // Re-attach existing evidence links so the evidentiary trail of the retraction remains complete
    const evidenceInputs = this.mapExistingEvidenceToInputs(currentRev.evidence)

    const params: InsertRevisionParams = {
      claimId: claim.id,
      revisionId,
      revisionNumber: nextRevisionNumber,
      statement: currentRev.statement,
      evidenceStatus: currentRev.evidenceStatus,
      editorialStatus: 'retracted',
      publishedAt: currentRev.publishedAt,
      supersedesRevisionId: currentRev.id,
      limitations: combinedLimitations,
      evidence: evidenceInputs,
      outboxEvent: {
        id: randomUUID(),
        eventType: 'claim.retracted',
        aggregateType: 'claim',
        aggregateId: claim.id,
        payload: {
          claimId: claim.id,
          revisionId,
          revisionNumber: nextRevisionNumber,
          reason: command.reason.trim(),
          editorialStatus: 'retracted',
          supersedesRevisionId: currentRev.id,
        },
        occurredAt,
      },
    }

    return this.writeRepository.insertRevision(params)
  }

  private mapExistingEvidenceToInputs(
    evidence: readonly EvidenceReference[]
  ): readonly EvidenceInput[] {
    return evidence.map((ref) => ({
      source: {
        sourceType: ref.source.sourceType,
        sourceName: ref.source.sourceName,
        responsibleAgent: ref.source.responsibleAgent,
        sourceUrl: ref.source.sourceUrl,
        publishedAt: ref.source.publishedAt,
      },
      artifact: {
        retrievedAt: ref.artifact.retrievedAt,
        contentHash: ref.artifact.contentHash,
        hashAlgorithm: ref.artifact.hashAlgorithm,
        softwareLicense: ref.artifact.softwareLicense,
        datasetLicense: ref.artifact.datasetLicense,
        itemRights: ref.artifact.itemRights,
        redistributionPolicy: ref.artifact.redistributionPolicy,
        requiredAttribution: ref.artifact.requiredAttribution,
      },
      linkType: ref.linkType,
      locator: {
        type: ref.locator.type,
        value: ref.locator.value,
      },
      transformationMethod: ref.transformationMethod,
      limitations: ref.limitations,
    }))
  }
}
