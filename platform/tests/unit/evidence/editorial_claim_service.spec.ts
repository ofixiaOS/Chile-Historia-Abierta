import EditorialClaimService from '#modules/evidence/application/editorial_claim_service'
import type { EvidenceInput } from '#modules/evidence/domain/editorial_claim'
import InMemoryClaimWriteRepository from '#modules/evidence/infrastructure/in_memory_claim_write_repository'
import { test } from '@japa/runner'

const observedAt = '2026-09-22T12:00:00.000Z'

function createValidEvidenceInput(
  sourceType: EvidenceInput['source']['sourceType'] = 'primary_archive'
): EvidenceInput {
  return {
    source: {
      sourceType,
      sourceName: 'Archivo Histórico de Pruebas',
      responsibleAgent: 'Equipo de Pruebas',
      sourceUrl: 'https://example.invalid/source/001',
      publishedAt: observedAt,
    },
    artifact: {
      retrievedAt: observedAt,
      contentHash: 'a'.repeat(64),
      hashAlgorithm: 'sha256',
      softwareLicense: 'UNLICENSED',
      datasetLicense: 'UNLICENSED',
      itemRights: 'Dominio público',
      redistributionPolicy: 'Solo pruebas unitarias',
      requiredAttribution: 'Chile Historia Abierta — prueba unitaria',
    },
    linkType: 'supports',
    locator: {
      type: 'page',
      value: '42',
    },
    transformationMethod: 'Sin transformación; prueba unitaria',
    limitations: [],
  }
}

test.group('EditorialClaimService (Unit)', () => {
  test('creates a draft claim and emits claim.created outbox event', async ({ assert }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    const record = await service.createDraft({
      statement: 'Borrador inicial de prueba',
      evidenceStatus: 'documented',
      evidence: [createValidEvidenceInput()],
    })

    assert.equal(record.currentRevision.editorialStatus, 'draft')
    assert.equal(record.currentRevision.revisionNumber, 1)
    assert.isNull(record.currentRevision.publishedAt)
    assert.isNull(record.currentRevision.supersedesRevisionId)

    const events = repository.getAllEvents()
    assert.lengthOf(events, 1)
    assert.equal(events[0].eventType, 'claim.created')
    assert.equal(events[0].aggregateId, record.id)
    assert.equal(events[0].payload.editorialStatus, 'draft')
  })

  test('publishes a draft claim and emits claim.published outbox event', async ({ assert }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    const draft = await service.createDraft({
      statement: 'Borrador inicial de prueba',
      evidenceStatus: 'documented',
      evidence: [createValidEvidenceInput()],
    })

    const published = await service.publishClaim({
      claimId: draft.id,
      publishedAt: observedAt,
    })

    assert.equal(published.id, draft.id)
    assert.equal(published.currentRevision.editorialStatus, 'published')
    assert.equal(published.currentRevision.revisionNumber, 2)
    assert.equal(published.currentRevision.supersedesRevisionId, draft.currentRevision.id)
    assert.equal(published.currentRevision.publishedAt, observedAt)

    const events = repository.getAllEvents()
    assert.lengthOf(events, 2)
    assert.equal(events[1].eventType, 'claim.published')
    assert.equal(events[1].aggregateId, draft.id)
  })

  test('creates a correction superseding the published revision', async ({ assert }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    const draft = await service.createDraft({
      statement: 'Afirmación antes de corregir',
      evidenceStatus: 'documented',
      evidence: [createValidEvidenceInput()],
    })

    const published = await service.publishClaim({
      claimId: draft.id,
      publishedAt: observedAt,
    })

    const correctionEvidence = [
      {
        ...createValidEvidenceInput(),
        locator: { type: 'page' as const, value: '43' },
      },
    ] as const

    const corrected = await service.createCorrection({
      claimId: published.id,
      supersedesRevisionId: published.currentRevision.id,
      statement: 'Afirmación debidamente corregida',
      evidenceStatus: 'documented',
      evidence: correctionEvidence,
      publishedAt: '2026-09-22T13:00:00.000Z',
    })

    assert.equal(corrected.currentRevision.editorialStatus, 'corrected')
    assert.equal(corrected.currentRevision.revisionNumber, 3)
    assert.equal(corrected.currentRevision.supersedesRevisionId, published.currentRevision.id)
    assert.equal(corrected.currentRevision.statement, 'Afirmación debidamente corregida')

    const events = repository.getAllEvents()
    assert.lengthOf(events, 3)
    assert.equal(events[2].eventType, 'claim.corrected')
  })

  test('retracts a published claim preserving evidence and noting reason', async ({ assert }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    const draft = await service.createDraft({
      statement: 'Afirmación a retractar',
      evidenceStatus: 'documented',
      evidence: [createValidEvidenceInput()],
    })

    const published = await service.publishClaim({ claimId: draft.id })

    const retracted = await service.retractClaim({
      claimId: published.id,
      supersedesRevisionId: published.currentRevision.id,
      reason: 'Error metodológico detectado en la fuente original',
    })

    assert.equal(retracted.currentRevision.editorialStatus, 'retracted')
    assert.equal(retracted.currentRevision.revisionNumber, 3)
    assert.equal(retracted.currentRevision.supersedesRevisionId, published.currentRevision.id)
    assert.isTrue(
      retracted.currentRevision.limitations.some((lim) =>
        lim.includes('RETRACTED: Error metodológico detectado')
      )
    )

    const events = repository.getAllEvents()
    assert.lengthOf(events, 3)
    assert.equal(events[2].eventType, 'claim.retracted')
  })

  test('rejects creating a draft with empty statement', async ({ assert }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    await assert.rejects(
      () =>
        service.createDraft({
          statement: '   ',
          evidenceStatus: 'documented',
        }),
      /Draft statement cannot be empty/
    )
  })

  test('rejects publishing a claim without evidence', async ({ assert }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    const draft = await service.createDraft({
      statement: 'Borrador sin evidencia',
      evidenceStatus: 'documented',
      evidence: [],
    })

    await assert.rejects(
      () => service.publishClaim({ claimId: draft.id }),
      /The claim cannot be published without localizable evidence/
    )
  })

  test('rejects publishing documented claim when evidence is solely from AI', async ({
    assert,
  }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    const draft = await service.createDraft({
      statement: 'Claim con fuente IA',
      evidenceStatus: 'documented',
      evidence: [createValidEvidenceInput('ai_output')],
    })

    await assert.rejects(
      () => service.publishClaim({ claimId: draft.id }),
      /A documented claim requires non-AI supporting evidence/
    )
  })

  test('rejects correction when supersedesRevisionId does not match current revision', async ({
    assert,
  }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    const draft = await service.createDraft({
      statement: 'Enunciado base',
      evidenceStatus: 'documented',
      evidence: [createValidEvidenceInput()],
    })
    const published = await service.publishClaim({ claimId: draft.id })

    await assert.rejects(
      () =>
        service.createCorrection({
          claimId: published.id,
          supersedesRevisionId: '00000000-0000-0000-0000-000000000000',
          statement: 'Nueva afirmación',
          evidenceStatus: 'documented',
          evidence: [createValidEvidenceInput()],
        }),
      /Superseded revision ID does not match current revision ID/
    )
  })

  test('rejects retraction of an unpublished draft claim', async ({ assert }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    const draft = await service.createDraft({
      statement: 'Borrador no publicado',
      evidenceStatus: 'documented',
      evidence: [createValidEvidenceInput()],
    })

    await assert.rejects(
      () =>
        service.retractClaim({
          claimId: draft.id,
          supersedesRevisionId: draft.currentRevision.id,
          reason: 'No procede',
        }),
      /Only published or corrected claims can be retracted/
    )
  })

  test('marks outbox events as published', async ({ assert }) => {
    const repository = new InMemoryClaimWriteRepository()
    const service = new EditorialClaimService(repository)

    await service.createDraft({
      statement: 'Borrador para outbox',
      evidenceStatus: 'documented',
    })

    const pending = await repository.findPending(10)
    assert.lengthOf(pending, 1)

    await repository.markPublished([pending[0].id], '2026-09-22T14:00:00.000Z')

    const afterPublish = await repository.findPending(10)
    assert.lengthOf(afterPublish, 0)
  })
})
