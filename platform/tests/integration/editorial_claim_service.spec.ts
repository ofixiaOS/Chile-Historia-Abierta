import EditorialClaimService from '#modules/evidence/application/editorial_claim_service'
import GetPublicClaim from '#modules/evidence/application/get_public_claim'
import type { EvidenceInput } from '#modules/evidence/domain/editorial_claim'
import PostgresClaimRepository from '#modules/evidence/infrastructure/postgres_claim_repository'
import PostgresClaimWriteRepository from '#modules/evidence/infrastructure/postgres_claim_write_repository'
import PostgresOutboxRepository from '#modules/evidence/infrastructure/postgres_outbox_repository'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const observedAt = '2026-09-22T12:00:00.000Z'

function createValidEvidenceInput(
  sourceType: EvidenceInput['source']['sourceType'] = 'community_post',
  hashSeed = '1'
): EvidenceInput {
  return {
    source: {
      sourceType,
      sourceName: `Fuente de integración ${hashSeed}`,
      responsibleAgent: 'Suite PostgreSQL',
      sourceUrl: `https://example.invalid/integration/source/${hashSeed}`,
      publishedAt: observedAt,
    },
    artifact: {
      retrievedAt: observedAt,
      contentHash: randomUUID().replaceAll('-', '').padEnd(64, '0'),
      hashAlgorithm: 'sha256',
      softwareLicense: 'UNLICENSED',
      datasetLicense: 'UNLICENSED',
      itemRights: 'Fixture de integración local',
      redistributionPolicy: 'Solo pruebas locales',
      requiredAttribution: 'Chile Historia Abierta — integración',
    },
    linkType: 'supports',
    locator: {
      type: 'fragment',
      value: `fragmento-${hashSeed}`,
    },
    transformationMethod: 'Sin transformación; fixture de integración',
    limitations: [],
  }
}

test.group('EditorialClaimService (Integration PostgreSQL)', (group) => {
  group.setup(async () => {
    await db
      .connection('admin')
      .rawQuery(
        'UPDATE outbox_events SET published_at = CURRENT_TIMESTAMP WHERE published_at IS NULL'
      )
  })

  test('executes complete transactional lifecycle with outbox and public visibility', async ({
    assert,
  }) => {
    const writeRepo = new PostgresClaimWriteRepository()
    const readRepo = new PostgresClaimRepository()
    const outboxRepo = new PostgresOutboxRepository()
    const service = new EditorialClaimService(writeRepo)
    const publicService = new GetPublicClaim(readRepo)

    // 1. Create Draft
    const evidenceInput = createValidEvidenceInput('community_post', 'lifecycle')
    const draft = await service.createDraft({
      statement: 'Borrador inicial de integración PostgreSQL',
      evidenceStatus: 'documented',
      evidence: [evidenceInput],
    })

    assert.equal(draft.currentRevision.editorialStatus, 'draft')
    assert.equal(draft.currentRevision.revisionNumber, 1)

    // Draft must NOT be visible to public repository or GetPublicClaim
    const publicBeforePublish = await readRepo.findById(draft.id)
    assert.isNull(publicBeforePublish)
    await assert.rejects(() => publicService.execute(draft.id), /Claim not found/)

    // Outbox must contain claim.created
    const pendingAfterDraft = await outboxRepo.findPending(50)
    const createdEvent = pendingAfterDraft.find(
      (e) => e.aggregateId === draft.id && e.eventType === 'claim.created'
    )
    assert.isDefined(createdEvent)

    // 2. Publish Claim
    const published = await service.publishClaim({
      claimId: draft.id,
      publishedAt: observedAt,
    })

    assert.equal(published.id, draft.id)
    assert.equal(published.currentRevision.editorialStatus, 'published')
    assert.equal(published.currentRevision.revisionNumber, 2)
    assert.equal(published.currentRevision.supersedesRevisionId, draft.currentRevision.id)

    // Published claim MUST now be visible immediately in public view
    const publicAfterPublish = await readRepo.findById(draft.id)
    assert.isNotNull(publicAfterPublish)
    assert.equal(publicAfterPublish?.currentRevision.statement, published.currentRevision.statement)

    const representation = await publicService.execute(draft.id)
    assert.equal(representation.data.id, draft.id)
    assert.equal(representation.evidenceStatus, 'documented')
    assert.lengthOf(representation.sources, 1)

    // Outbox must contain claim.published
    const pendingAfterPublish = await outboxRepo.findPending(50)
    const publishedEvent = pendingAfterPublish.find(
      (e) => e.aggregateId === draft.id && e.eventType === 'claim.published'
    )
    assert.isDefined(publishedEvent)

    // 3. Create Correction
    const correctedEvidence = [createValidEvidenceInput('community_post', 'correction')] as const

    const corrected = await service.createCorrection({
      claimId: draft.id,
      supersedesRevisionId: published.currentRevision.id,
      statement: 'Enunciado corregido tras nueva evidencia',
      evidenceStatus: 'documented',
      evidence: correctedEvidence,
      publishedAt: '2026-09-22T13:00:00.000Z',
    })

    assert.equal(corrected.currentRevision.editorialStatus, 'corrected')
    assert.equal(corrected.currentRevision.revisionNumber, 3)
    assert.equal(corrected.currentRevision.supersedesRevisionId, published.currentRevision.id)

    // Public view must reflect the corrected revision
    const publicAfterCorrection = await readRepo.findById(draft.id)
    assert.equal(
      publicAfterCorrection?.currentRevision.statement,
      'Enunciado corregido tras nueva evidencia'
    )
    assert.equal(publicAfterCorrection?.currentRevision.revisionNumber, 3)

    // 4. Retract Claim
    const retracted = await service.retractClaim({
      claimId: draft.id,
      supersedesRevisionId: corrected.currentRevision.id,
      reason: 'Hallazgo de manipulación en la fuente primaria',
    })

    assert.equal(retracted.currentRevision.editorialStatus, 'retracted')
    assert.equal(retracted.currentRevision.revisionNumber, 4)
    assert.equal(retracted.currentRevision.supersedesRevisionId, corrected.currentRevision.id)

    // Retracted claim must no longer appear in public view
    const publicAfterRetraction = await readRepo.findById(draft.id)
    assert.isNull(publicAfterRetraction)
    await assert.rejects(() => publicService.execute(draft.id), /Claim not found/)

    // Outbox must contain claim.retracted
    const pendingFinal = await outboxRepo.findPending(50)
    const retractedEvent = pendingFinal.find(
      (e) => e.aggregateId === draft.id && e.eventType === 'claim.retracted'
    )
    assert.isDefined(retractedEvent)
  })

  test('aborts transaction and rolls back cleanly when publishing without evidence', async ({
    assert,
  }) => {
    const writeRepo = new PostgresClaimWriteRepository()
    const service = new EditorialClaimService(writeRepo)

    const draft = await service.createDraft({
      statement: 'Borrador que fallará al publicarse',
      evidenceStatus: 'documented',
      evidence: [],
    })

    await assert.rejects(
      () => service.publishClaim({ claimId: draft.id }),
      /The claim cannot be published without localizable evidence/
    )

    // Verify claim still has revision 1 as draft and no orphan revision or outbox event was persisted
    const stored = await writeRepo.findClaimForUpdate(draft.id)
    assert.isNotNull(stored)
    assert.equal(stored?.currentRevision?.editorialStatus, 'draft')
    assert.equal(stored?.currentRevision?.revisionNumber, 1)

    const outboxEvents = await db
      .connection('admin')
      .rawQuery(
        'SELECT count(*)::integer AS count FROM outbox_events WHERE aggregate_id = ? AND event_type = ?',
        [draft.id, 'claim.published']
      )
    assert.equal(outboxEvents.rows[0].count, 0)
  })

  test('denies access to outbox_events from the public database role', async ({ assert }) => {
    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT count(*) FROM outbox_events'),
      /permission denied for table outbox_events/
    )
  })

  test('processes pending outbox events and marks them as published', async ({ assert }) => {
    const writeRepo = new PostgresClaimWriteRepository()
    const outboxRepo = new PostgresOutboxRepository()
    const service = new EditorialClaimService(writeRepo)

    const draft = await service.createDraft({
      statement: 'Borrador para despacho outbox',
      evidenceStatus: 'documented',
    })

    const pending = await outboxRepo.findPending(100)
    const targetEvent = pending.find((e) => e.aggregateId === draft.id)
    assert.isDefined(targetEvent)

    if (targetEvent) {
      await outboxRepo.markPublished([targetEvent.id], new Date().toISOString())

      const afterMarking = await outboxRepo.findPending(100)
      const shouldBeMissing = afterMarking.find((e) => e.id === targetEvent.id)
      assert.isUndefined(shouldBeMissing)
    }
  })
})
