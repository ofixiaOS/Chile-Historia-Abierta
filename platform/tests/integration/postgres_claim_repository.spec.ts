import GetPublicClaim from '#modules/evidence/application/get_public_claim'
import PostgresClaimRepository from '#modules/evidence/infrastructure/postgres_claim_repository'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const observedAt = '2026-09-22T12:00:00.000Z'

interface InsertClaimOptions {
  editorialStatus: 'draft' | 'published'
  includeEvidence: boolean
  sourceType?: 'community_post' | 'ai_output'
}

interface InsertedIds {
  claimId: string
  revisionId: string
}

async function insertSourceAndArtifact(
  trx: TransactionClientContract,
  sourceType: 'community_post' | 'ai_output'
): Promise<string> {
  const sourceId = randomUUID()
  const artifactId = randomUUID()

  await trx.rawQuery(
    `
      INSERT INTO sources (
        id, source_type, source_name, responsible_agent, source_url, published_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      sourceId,
      sourceType,
      'Fuente de integración local',
      'Suite PostgreSQL',
      'https://example.invalid/integration/source',
      observedAt,
    ]
  )

  await trx.rawQuery(
    `
      INSERT INTO source_artifacts (
        id, source_id, retrieved_at, content_hash, hash_algorithm,
        software_license, dataset_license, item_rights,
        redistribution_policy, required_attribution
      ) VALUES (?, ?, ?, ?, 'sha256', ?, ?, ?, ?, ?)
    `,
    [
      artifactId,
      sourceId,
      observedAt,
      randomUUID().replaceAll('-', '').padEnd(64, '0'),
      'UNLICENSED',
      'UNLICENSED',
      'Fixture de integración local',
      'Solo pruebas locales',
      'Chile Historia Abierta — integración',
    ]
  )

  return artifactId
}

async function insertClaim(options: InsertClaimOptions): Promise<InsertedIds> {
  const claimId = randomUUID()
  const revisionId = randomUUID()

  await db.connection('admin').transaction(async (trx) => {
    const publishedAtPlaceholder = options.editorialStatus === 'published' ? '?' : 'NULL'
    const revisionBindings = [
      revisionId,
      claimId,
      'Fixture persistido para probar el adaptador PostgreSQL; no es un hecho histórico.',
      options.editorialStatus,
      ...(options.editorialStatus === 'published' ? [observedAt] : []),
      JSON.stringify(['Dato sintético de integración.']),
    ]

    await trx.rawQuery('INSERT INTO claims (id, projected_at) VALUES (?, ?)', [claimId, observedAt])

    await trx.rawQuery(
      `
        INSERT INTO claim_revisions (
          id, claim_id, revision_number, statement, evidence_status,
          editorial_status, published_at, supersedes_revision_id, limitations
        ) VALUES (?, ?, 1, ?, 'documented', ?, ${publishedAtPlaceholder}, NULL, ?::jsonb)
      `,
      revisionBindings
    )

    if (options.includeEvidence) {
      const artifactId = await insertSourceAndArtifact(trx, options.sourceType ?? 'community_post')
      await trx.rawQuery(
        `
          INSERT INTO evidence_links (
            id, revision_id, source_artifact_id, link_type, locator_type,
            locator_value, transformation_method, limitations
          ) VALUES (?, ?, ?, 'supports', 'fragment', ?, ?, ?::jsonb)
        `,
        [
          randomUUID(),
          revisionId,
          artifactId,
          'integration-fragment',
          'Sin transformación; fixture de integración',
          JSON.stringify([]),
        ]
      )
    }

    await trx.rawQuery('UPDATE claims SET current_revision_id = ?, projected_at = ? WHERE id = ?', [
      revisionId,
      observedAt,
      claimId,
    ])
    await trx.rawQuery('SET CONSTRAINTS claims_public_evidence_guard IMMEDIATE')
  })

  return { claimId, revisionId }
}

test.group('PostgreSQL evidence persistence', () => {
  test('round-trips a valid public claim through the public view', async ({ assert }) => {
    const { claimId } = await insertClaim({
      editorialStatus: 'published',
      includeEvidence: true,
    })
    const service = new GetPublicClaim(new PostgresClaimRepository())

    const result = await service.execute(claimId)

    assert.equal(result.data.id, claimId)
    assert.equal(result.evidenceStatus, 'documented')
    assert.lengthOf(result.sources, 1)
    assert.equal(result.sources[0].locator.value, 'integration-fragment')
    assert.equal(result.sources[0].rights.redistributionPolicy, 'Solo pruebas locales')
  })

  test('keeps a draft invisible to the public repository', async ({ assert }) => {
    const { claimId } = await insertClaim({ editorialStatus: 'draft', includeEvidence: false })
    const repository = new PostgresClaimRepository()

    assert.isNull(await repository.findById(claimId))
  })

  test('rejects promoting a published claim without evidence', async ({ assert }) => {
    await assert.rejects(
      () => insertClaim({ editorialStatus: 'published', includeEvidence: false }),
      /public claim revision requires evidence/
    )
  })

  test('rejects AI output as the sole support for documented evidence', async ({ assert }) => {
    await assert.rejects(
      () =>
        insertClaim({
          editorialStatus: 'published',
          includeEvidence: true,
          sourceType: 'ai_output',
        }),
      /documented claim requires non-AI supporting evidence/
    )
  })

  test('prevents mutation of an existing revision', async ({ assert }) => {
    const { revisionId } = await insertClaim({
      editorialStatus: 'published',
      includeEvidence: true,
    })

    await assert.rejects(
      () =>
        db
          .connection('admin')
          .rawQuery('UPDATE claim_revisions SET statement = ? WHERE id = ?', [
            'Mutación prohibida',
            revisionId,
          ]),
      /claim_revisions is append-only/
    )
  })

  test('allows the public role to read the view but denies canonical tables', async ({
    assert,
  }) => {
    const visible = await db
      .connection('public')
      .rawQuery('SELECT count(*)::integer AS count FROM public_claim_records')
    assert.isNumber(visible.rows[0].count)

    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT * FROM claim_revisions LIMIT 1'),
      /permission denied for table claim_revisions/
    )
  })

  test('findMany returns paginated claims using cha_public role with keyset cursor', async ({
    assert,
  }) => {
    const repository = new PostgresClaimRepository()
    const firstPage = await repository.findMany({ limit: 2 })

    assert.isAtLeast(firstPage.items.length, 1)
    assert.isAtMost(firstPage.items.length, 2)
    assert.equal(firstPage.limit, 2)

    if (firstPage.hasMore && firstPage.nextCursor) {
      const secondPage = await repository.findMany({ limit: 2, cursor: firstPage.nextCursor })
      assert.isAtLeast(secondPage.items.length, 1)
      assert.notEqual(firstPage.items[0].id, secondPage.items[0].id)
    }
  })

  test('explore returns read model with facets and time range using cha_public role', async ({
    assert,
  }) => {
    const repository = new PostgresClaimRepository()
    const readModel = await repository.explore({ limit: 10 })

    assert.isAtLeast(readModel.items.length, 1)
    assert.isDefined(readModel.facets)
    assert.isAtLeast(readModel.facets.totalMatching, 1)
    assert.isDefined(readModel.facets.byEvidenceStatus.documented)
    assert.isDefined(readModel.timeRange)
    assert.isNotNull(readModel.timeRange.minDate)
    assert.isNotNull(readModel.timeRange.maxDate)
  })
})
