import IngestionService from '#modules/catalog/application/ingestion_service'
import BcentralBdeConnector from '#modules/catalog/infrastructure/connectors/bcentral_bde_connector'
import CongresoBcnConnector from '#modules/catalog/infrastructure/connectors/congreso_bcn_connector'
import EditorialClaimService from '#modules/evidence/application/editorial_claim_service'
import GetPublicClaim from '#modules/evidence/application/get_public_claim'
import PostgresClaimRepository from '#modules/evidence/infrastructure/postgres_claim_repository'
import PostgresClaimWriteRepository from '#modules/evidence/infrastructure/postgres_claim_write_repository'
import PostgresOutboxRepository from '#modules/evidence/infrastructure/postgres_outbox_repository'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

test.group('IngestionPipeline (Integration PostgreSQL)', (group) => {
  group.setup(async () => {
    await db
      .connection('admin')
      .rawQuery(
        'UPDATE outbox_events SET published_at = CURRENT_TIMESTAMP WHERE published_at IS NULL'
      )
  })

  test('ingests BCentral TPM series into PostgreSQL with full provenance and outbox', async ({
    assert,
  }) => {
    const writeRepo = new PostgresClaimWriteRepository()
    const readRepo = new PostgresClaimRepository()
    const outboxRepo = new PostgresOutboxRepository()
    const editorialService = new EditorialClaimService(writeRepo)
    const ingestionService = new IngestionService(editorialService)
    const publicClaimService = new GetPublicClaim(readRepo)

    const connector = new BcentralBdeConnector()
    const result = await ingestionService.ingest(
      connector,
      'https://si3.bcentral.cl/estadisticas/Series/F073.TIR.FON.NO.D',
      { autoPublish: true }
    )

    assert.equal(result.sourceId, 'bcentral-bde')
    assert.lengthOf(result.createdClaims, 3)

    const firstClaim = result.createdClaims[0]
    assert.equal(firstClaim.currentRevision.editorialStatus, 'published')
    assert.equal(firstClaim.currentRevision.evidenceStatus, 'documented')

    // Query through public HTTP service
    const representation = await publicClaimService.execute(firstClaim.id)
    assert.equal(representation.data.id, firstClaim.id)
    assert.equal(representation.evidenceStatus, 'documented')
    assert.lengthOf(representation.sources, 1)

    const sourceCiting = representation.sources[0]
    assert.equal(
      sourceCiting.sourceName,
      'Banco Central de Chile — Base de Datos Estadísticos (BDE)'
    )
    assert.equal(sourceCiting.locator.type, 'row')
    assert.include(sourceCiting.locator.value, 'seriesId=F073.TIR.FON.NO.D')
    assert.equal(
      sourceCiting.rights.requiredAttribution,
      'Banco Central de Chile — Base de Datos Estadísticos (si3.bcentral.cl)'
    )

    // Check that outbox events were recorded for each published claim
    const pending = await outboxRepo.findPending(50)
    const matchingEvents = pending.filter(
      (e) =>
        e.eventType === 'claim.published' &&
        result.createdClaims.some((c) => c.id === e.aggregateId)
    )
    assert.lengthOf(matchingEvents, 3)
  })

  test('ingests Congreso Ley 21045 into PostgreSQL and tests artifact deduplication', async ({
    assert,
  }) => {
    const writeRepo = new PostgresClaimWriteRepository()
    const readRepo = new PostgresClaimRepository()
    const editorialService = new EditorialClaimService(writeRepo)
    const ingestionService = new IngestionService(editorialService)
    const publicClaimService = new GetPublicClaim(readRepo)

    const connector = new CongresoBcnConnector()
    const targetUrl = 'https://opendata.congreso.cl/leyes/21045'

    // First ingestion
    const firstRun = await ingestionService.ingest(connector, targetUrl, { autoPublish: true })
    assert.lengthOf(firstRun.createdClaims, 2)

    const milestoneClaim = firstRun.createdClaims[0]
    const representation = await publicClaimService.execute(milestoneClaim.id)
    assert.include(
      representation.data.attributes.statement,
      'Crea el Ministerio de las Culturas, las Artes y el Patrimonio'
    )
    assert.equal(
      representation.sources[0].rights.softwareLicense,
      'Permisiva / Código abierto estatal'
    )

    // Second ingestion of identical source payload must deduplicate artifact and not throw unique constraint violation
    const secondRun = await ingestionService.ingest(connector, targetUrl, { autoPublish: true })
    assert.lengthOf(secondRun.createdClaims, 2)

    // Verify artifact deduplication in source_artifacts
    const artifactsCount = await db
      .connection('admin')
      .rawQuery('SELECT count(*)::integer AS count FROM source_artifacts WHERE content_hash = ?', [
        firstRun.rawArtifact.contentHash,
      ])
    assert.equal(artifactsCount.rows[0].count, 1)
  })
})
