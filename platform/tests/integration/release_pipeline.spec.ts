import { createReleaseBundle } from '#modules/releases/domain/release_bundle'
import PostgresReleaseService from '#modules/releases/infrastructure/postgres_release_service'
import PostgresClaimRepository from '#modules/evidence/infrastructure/postgres_claim_repository'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const original = Buffer.from(
  'Documento sintético local. Este pasaje sirve para verificar la publicación.',
  'utf8'
)

function syntheticBundle(version = `test-${randomUUID()}`) {
  return createReleaseBundle(
    {
      dataVersion: version,
      createdAt: '2026-09-22T12:00:00.000Z',
      source: {
        sourceId: 'synthetic-source',
        scopeIdentifier: 'synthetic-document-001',
        sourceType: 'official_administrative',
        sourceName: 'Fuente sintética de prueba',
        responsibleAgent: 'Suite de integración',
        sourceUrl: `https://example.invalid/release/${version}`,
        publishedAt: null,
      },
      artifact: {
        retrievedAt: '2026-09-22T12:00:00.000Z',
        softwareLicense: 'No software redistributed',
        datasetLicense: 'Synthetic test data',
        itemRights: 'Synthetic text written for tests',
        redistributionPolicy: 'public_domain',
        requiredAttribution: 'Suite de integración',
      },
      claim: {
        statement: 'El pasaje de prueba está presente en el documento sintético.',
        evidenceStatus: 'documented',
        quoteExcerpt: 'Este pasaje sirve para verificar la publicación.',
        locator: { type: 'fragment', value: 'parrafo-1' },
        transformationMethod: 'Transcripción literal de la muestra sintética',
        limitations: ['No es un hecho histórico'],
      },
    },
    original
  )
}

async function approveSource(
  bundle: ReturnType<typeof syntheticBundle>,
  reviewer = 'Revisor fuente'
) {
  return new PostgresReleaseService().recordSourceReview({
    bundle,
    decision: 'approved_for_pilot',
    reviewer,
    sourceConfirmed: true,
    rightsConfirmed: true,
    rightsEvidenceUrl: 'https://example.invalid/terms',
    rightsSummary: 'Contenido sintético creado para esta prueba de integración.',
  })
}

test.group('Local release to public claim (PostgreSQL)', () => {
  test('stages privately, requires review, then activates once with original bytes retained', async ({
    assert,
  }) => {
    const bundle = syntheticBundle()
    const service = new PostgresReleaseService()
    const publicClaims = new PostgresClaimRepository()

    await assert.rejects(() => service.stage(bundle), /No current source and artifact review/)
    const sourceReview = await approveSource(bundle)
    assert.equal(sourceReview.decision, 'approved_for_pilot')
    const staged = await service.stage(bundle)
    assert.equal(staged.status, 'staged')
    assert.isNull(staged.claimId)
    const restaged = await service.stage(bundle)
    assert.equal(restaged.bundleHash, staged.bundleHash)

    const before = await db
      .connection('admin')
      .rawQuery('SELECT status, raw_content FROM release_batches WHERE data_version = ?', [
        bundle.manifest.dataVersion,
      ])
    assert.equal(before.rows[0].status, 'staged')
    assert.equal((before.rows[0].raw_content as Buffer).toString('utf8'), original.toString('utf8'))
    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT id FROM release_batches LIMIT 1'),
      /permission denied/
    )
    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT id FROM release_source_reviews LIMIT 1'),
      /permission denied/
    )
    await assert.rejects(
      () => service.activate(bundle.manifest.dataVersion, bundle.bundleHash),
      /approved before activation/
    )
    await assert.rejects(
      () =>
        service.approve({
          dataVersion: bundle.manifest.dataVersion,
          bundleHash: bundle.bundleHash,
          reviewer: 'Revisor fuente',
          sourceConfirmed: true,
          rightsConfirmed: true,
        }),
      /different reviewers/
    )
    await assert.rejects(
      () =>
        service.approve({
          dataVersion: bundle.manifest.dataVersion,
          bundleHash: 'a'.repeat(64),
          reviewer: 'Revisor local',
          sourceConfirmed: true,
          rightsConfirmed: true,
        }),
      /hash does not match/
    )
    await assert.rejects(
      () =>
        service.approve({
          dataVersion: bundle.manifest.dataVersion,
          bundleHash: bundle.bundleHash,
          reviewer: 'Revisor local',
          sourceConfirmed: true,
          rightsConfirmed: false,
        }),
      /Source and rights review/
    )

    const approved = await service.approve({
      dataVersion: bundle.manifest.dataVersion,
      bundleHash: bundle.bundleHash,
      reviewer: 'Revisor paquete',
      sourceConfirmed: true,
      rightsConfirmed: true,
    })
    assert.equal(approved.status, 'approved')
    const activated = await service.activate(bundle.manifest.dataVersion, bundle.bundleHash)
    assert.equal(activated.status, 'active')
    assert.isString(activated.claimId)
    const reactivated = await service.activate(bundle.manifest.dataVersion, bundle.bundleHash)
    assert.equal(reactivated.claimId, activated.claimId)

    const publicClaim = await publicClaims.findById(activated.claimId!)
    assert.equal(publicClaim?.currentRevision.statement, bundle.manifest.claim.statement)
    assert.equal(publicClaim?.currentRevision.editorialStatus, 'published')
    assert.equal(
      publicClaim?.currentRevision.evidence[0]?.artifact.contentHash,
      bundle.manifest.artifact.contentHash
    )

    const linked = await db.connection('admin').rawQuery(
      `SELECT count(*)::integer AS count FROM source_artifacts
       WHERE release_batch_id = (SELECT id FROM release_batches WHERE data_version = ?)`,
      [bundle.manifest.dataVersion]
    )
    assert.equal(linked.rows[0].count, 1)
    const publishedEvents = await db.connection('admin').rawQuery(
      `SELECT count(*)::integer AS count FROM outbox_events
       WHERE aggregate_id = ? AND event_type = 'claim.published'`,
      [activated.claimId!]
    )
    assert.equal(publishedEvents.rows[0].count, 1)
  })

  test('rejects divergent content for the same dataVersion without publishing', async ({
    assert,
  }) => {
    const bundle = syntheticBundle()
    const service = new PostgresReleaseService()
    await approveSource(bundle)
    await service.stage(bundle)
    const changed = syntheticBundle(bundle.manifest.dataVersion)
    const divergent = createReleaseBundle(
      {
        ...changed.manifest,
        claim: { ...changed.manifest.claim, statement: 'Enunciado distinto.' },
      },
      original
    )
    await assert.rejects(
      () => service.stage(divergent),
      /dataVersion already belongs to another bundle/
    )
    const result = await db
      .connection('admin')
      .rawQuery('SELECT status, claim_id FROM release_batches WHERE data_version = ?', [
        bundle.manifest.dataVersion,
      ])
    assert.equal(result.rows[0].status, 'staged')
    assert.isNull(result.rows[0].claim_id)
  })

  test('rejects altered staged bytes after approval without publishing', async ({ assert }) => {
    const bundle = syntheticBundle()
    const service = new PostgresReleaseService()
    await approveSource(bundle)
    await service.stage(bundle)
    await service.approve({
      dataVersion: bundle.manifest.dataVersion,
      bundleHash: bundle.bundleHash,
      reviewer: 'Revisor paquete',
      sourceConfirmed: true,
      rightsConfirmed: true,
    })

    await db
      .connection('admin')
      .rawQuery('UPDATE release_batches SET raw_content = ? WHERE data_version = ?', [
        Buffer.concat([original, Buffer.from(' Alteración posterior.', 'utf8')]),
        bundle.manifest.dataVersion,
      ])
    await assert.rejects(
      () => service.activate(bundle.manifest.dataVersion, bundle.bundleHash),
      /hash mismatch/
    )

    const result = await db
      .connection('admin')
      .rawQuery('SELECT status, claim_id FROM release_batches WHERE data_version = ?', [
        bundle.manifest.dataVersion,
      ])
    assert.equal(result.rows[0].status, 'approved')
    assert.isNull(result.rows[0].claim_id)
  })

  test('a later blocked source review prevents activation and remains append-only', async ({
    assert,
  }) => {
    const bundle = syntheticBundle()
    const service = new PostgresReleaseService()
    const approved = await approveSource(bundle)
    await service.stage(bundle)
    await service.approve({
      dataVersion: bundle.manifest.dataVersion,
      bundleHash: bundle.bundleHash,
      reviewer: 'Revisor paquete',
      sourceConfirmed: true,
      rightsConfirmed: true,
    })
    await service.recordSourceReview({
      bundle,
      decision: 'blocked',
      reviewer: 'Revisor derechos',
      sourceConfirmed: false,
      rightsConfirmed: false,
      rightsSummary: 'La revisión bloquea esta muestra sintética de prueba.',
    })

    await assert.rejects(
      () => service.activate(bundle.manifest.dataVersion, bundle.bundleHash),
      /No current source and artifact review/
    )
    await assert.rejects(
      () =>
        db
          .connection('admin')
          .rawQuery('UPDATE release_source_reviews SET decision = ? WHERE id = ?', [
            'approved_for_pilot',
            approved.id,
          ]),
      /append-only/
    )
    const result = await db
      .connection('admin')
      .rawQuery('SELECT status, claim_id FROM release_batches WHERE data_version = ?', [
        bundle.manifest.dataVersion,
      ])
    assert.equal(result.rows[0].status, 'approved')
    assert.isNull(result.rows[0].claim_id)
  })
})
