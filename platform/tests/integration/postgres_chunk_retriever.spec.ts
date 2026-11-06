import { AssistanceService } from '#modules/assistance/application/assistance_service'
import { DeterministicLlmProvider } from '#modules/assistance/application/deterministic_llm_provider'
import type { EvidenceChunk } from '#modules/assistance/domain/chunk'
import PostgresChunkRetriever from '#modules/assistance/infrastructure/postgres_chunk_retriever'
import { pilotEvidenceChunks } from '#modules/assistance/infrastructure/public_assistance'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

test.group('PostgresChunkRetriever (Integration PostgreSQL)', () => {
  function createTestChunk(override: Partial<EvidenceChunk> = {}): EvidenceChunk {
    const id = override.id ?? 'chunk-test-censo-1907-unique'
    return {
      id,
      sourceId: override.sourceId ?? 'src-test-censo-1907',
      sourceName: 'Instituto Nacional de Estadísticas - Censo Histórico',
      sourceType: 'official_statistical',
      contentHash: '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      text: 'El censo de población de 1907 contabilizó un total de 3.249.279 habitantes en el territorio de la República de Chile.',
      locator: {
        type: 'table',
        value: 'Cuadro General N° 1',
      },
      epistemicStatus: 'documented',
      license: {
        softwareLicense: 'MIT',
        datasetLicense: 'Open Data',
        itemRights: 'Dominio Público',
        redistributionPolicy: 'public-unrestricted',
        requiredAttribution: 'INE Chile',
      },
      retrievedAt: new Date().toISOString(),
      ...override,
    }
  }

  test('saves and retrieves evidence chunks using cha_public role with Spanish FTS', async ({
    assert,
  }) => {
    const retriever = new PostgresChunkRetriever('public')
    const testChunk = createTestChunk()

    await retriever.saveChunk(testChunk)

    // Búsqueda con lematización en español: 'habitantes' y 'república' filtrando por fuente
    const results = await retriever.retrieveChunks({
      queryText: 'población total de habitantes de la república según censo',
      sourceFilters: ['src-test-censo-1907'],
    })

    assert.isAbove(results.length, 0)
    const found = results.find((c) => c.id === testChunk.id)
    assert.isDefined(found)
    assert.equal(found!.sourceId, 'src-test-censo-1907')
    assert.equal(found!.locator.type, 'table')
    assert.equal(found!.locator.value, 'Cuadro General N° 1')
    assert.equal(found!.contentHash, testChunk.contentHash)
  })

  test('populates pilot chunks and retrieves official TPM using stemmed Spanish search', async ({
    assert,
  }) => {
    const retriever = new PostgresChunkRetriever('public')
    await retriever.saveChunks(pilotEvidenceChunks)

    // Búsqueda lematizada: "políticas monetarias" debe empatar "política monetaria"
    const results = await retriever.retrieveChunks({
      queryText: 'tasas de políticas monetarias del Banco Central',
    })

    assert.isAbove(results.length, 0)
    const tpmChunk = results.find((c) => c.id === 'chunk-bcentral-tpm-2024')
    assert.isDefined(tpmChunk)
    assert.include(tpmChunk!.text, '8.25% en enero de 2024')
  })

  test('filters chunks by sourceFilters accurately', async ({ assert }) => {
    const retriever = new PostgresChunkRetriever('public')
    await retriever.saveChunks(pilotEvidenceChunks)

    // Consulta que menciona cultura y políticas pero filtrando estrictamente por fuente del Congreso
    const results = await retriever.retrieveChunks({
      queryText: 'políticas culturales y ministerios del estado',
      sourceFilters: ['bcn-ley-chile'],
    })

    assert.isAbove(results.length, 0)
    for (const chunk of results) {
      assert.equal(chunk.sourceId, 'bcn-ley-chile')
    }
  })

  test('Principio de menor privilegio: cha_public tiene SELECT en la vista pero se le deniega evidence_chunks', async ({
    assert,
  }) => {
    // 1. Acceso a la vista pública debe tener éxito
    const viewResult = await db.connection('public').rawQuery(
      `
        SELECT COUNT(*)::int AS count
        FROM public_evidence_chunk_records
      `
    )
    assert.isNumber(viewResult.rows[0].count)

    // 2. Acceso directo a la tabla maestra debe ser rechazado con 42501 (insufficient_privilege)
    try {
      await db.connection('public').rawQuery(
        `
          SELECT * FROM evidence_chunks LIMIT 1
        `
      )
      assert.fail(
        'El rol cha_public no debe tener permiso de lectura en la tabla canónica evidence_chunks'
      )
    } catch (error: unknown) {
      const pgError = error as { code?: string }
      assert.equal(pgError.code, '42501')
    }
  })

  test('Principio 8 (Inmutabilidad append-only): rechaza UPDATE y DELETE en evidence_chunks', async ({
    assert,
  }) => {
    const testChunk = createTestChunk()
    const retriever = new PostgresChunkRetriever('admin')
    await retriever.saveChunk(testChunk)

    // Intento de UPDATE debe disparar el trigger reject_append_only_mutation con código 55000
    try {
      await db.connection('admin').rawQuery(
        `
          UPDATE evidence_chunks
          SET text = 'Texto adulterado con información no verificada'
          WHERE id = ?
        `,
        [testChunk.id]
      )
      assert.fail('UPDATE en evidence_chunks debe ser rechazado por el trigger append-only')
    } catch (error: unknown) {
      const pgError = error as { code?: string; message?: string }
      assert.equal(pgError.code, '55000')
      assert.include(pgError.message ?? '', 'evidence_chunks is append-only')
    }

    // Intento de DELETE debe disparar el mismo trigger
    try {
      await db.connection('admin').rawQuery(
        `
          DELETE FROM evidence_chunks
          WHERE id = ?
        `,
        [testChunk.id]
      )
      assert.fail('DELETE en evidence_chunks debe ser rechazado por el trigger append-only')
    } catch (error: unknown) {
      const pgError = error as { code?: string; message?: string }
      assert.equal(pgError.code, '55000')
      assert.include(pgError.message ?? '', 'evidence_chunks is append-only')
    }
  })

  test('End-to-End AssistanceService con PostgresChunkRetriever y verificación de citas', async ({
    assert,
  }) => {
    const postgresRetriever = new PostgresChunkRetriever('public')
    await postgresRetriever.saveChunks(pilotEvidenceChunks)

    const service = new AssistanceService({
      llmProvider: new DeterministicLlmProvider(),
      chunkRetriever: postgresRetriever,
    })

    // Consulta con evidencia real en PostgreSQL
    const response = await service.query({
      queryText: 'Cuál fue la tasa de política monetaria en enero de 2024 según el Banco Central?',
    })

    assert.isFalse(response.abstained)
    assert.equal(response.evidenceStatus, 'documented')
    assert.isAbove(response.citations.length, 0)
    assert.equal(response.citations[0].chunkId, 'chunk-bcentral-tpm-2024')
    assert.equal(response.citations[0].locator.value, 'F073.TIR.FON.NO.D')

    // Consulta sin evidencia en PostgreSQL -> abstención cerrada
    const ungroundedResponse = await service.query({
      queryText: 'Cuál fue la producción de trigo en la región de O Higgins en 1895?',
    })

    assert.isTrue(ungroundedResponse.abstained)
    assert.equal(ungroundedResponse.evidenceStatus, 'not_verified')
    assert.equal(ungroundedResponse.abstentionReason, 'EVIDENCE_INSUFFICIENT')
  })
})
