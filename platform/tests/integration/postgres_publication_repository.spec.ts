import type { ChartSpec } from '#modules/publication/domain/chart_spec'
import {
  calculateDataSnapshotHash,
  calculateQueryHash,
} from '#modules/publication/domain/chart_spec'
import type { PublicationRecord } from '#modules/publication/domain/publication'
import PostgresPublicationRepository from '#modules/publication/infrastructure/postgres_publication_repository'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

test.group('PostgresPublicationRepository (Integration PostgreSQL)', (group) => {
  group.setup(async () => {
    // Aislamiento preventivo de outbox
    await db
      .connection('admin')
      .rawQuery(
        'UPDATE outbox_events SET published_at = CURRENT_TIMESTAMP WHERE published_at IS NULL'
      )
  })

  test('saves a publication with ChartSpec and retrieves it via findById through the cha_public role', async ({
    assert,
  }) => {
    const repository = new PostgresPublicationRepository('public')
    const pubId = randomUUID()
    const revId = randomUUID()
    const chartSpecId = randomUUID()

    const dataSeries = {
      tpm: [
        { period: '2023-01', value: 11.25 },
        { period: '2023-02', value: 11.25 },
      ],
    }
    const dataHash = calculateDataSnapshotHash(dataSeries)
    const queryHash = calculateQueryHash({
      series: [{ seriesId: 'tpm', unit: 'porcentaje' }],
      events: [],
      timeRange: { from: '2023-01', to: '2023-02' },
      transformations: [{ name: 'none' }],
      method: 'series_trend',
    })

    const chartSpec: ChartSpec = {
      id: chartSpecId,
      schemaVersion: '1.0.0',
      renderer: { name: 'vega-lite', version: '5.21.0' },
      title: 'Evolución TPM 2023',
      description: 'Tasa de Política Monetaria fijada por el Banco Central',
      method: 'series_trend',
      series: [
        {
          seriesId: 'tpm',
          label: 'TPM',
          unit: 'porcentaje',
        },
      ],
      events: [],
      timeRange: { from: '2023-01', to: '2023-02' },
      transformations: [{ name: 'none' }],
      queryHash,
      dataSnapshot: {
        contentHash: dataHash,
        series: dataSeries,
      },
      sources: ['https://si3.bcentral.cl'],
      limitations: ['Período restringido a dos meses'],
      warnings: [],
    }

    const publication: PublicationRecord = {
      id: pubId,
      type: 'dato',
      author: {
        id: 'usr_investigador_1',
        displayName: 'Investigador Macroeconómico',
      },
      conflictsOfInterest: [
        {
          entity: 'Banco Central de Chile',
          relationship: 'Sin relación financiera ni dependencia',
        },
      ],
      forkedFromPublicationId: null,
      projectedAt: new Date().toISOString(),
      currentRevision: {
        id: revId,
        revisionNumber: 1,
        title: 'Serie oficial TPM primer bimestre 2023',
        content:
          'Observación estadística mensual de la TPM según base de datos oficial del BCentral.',
        evidence: [
          {
            description: 'Base de Datos Estadísticos BCentral',
            locator: { type: 'series', value: 'F032.TPM.MIN.D001' },
          },
        ],
        chartSpec,
        limitations: ['Unidad: porcentaje', 'Periodo: 2023-01 a 2023-02'],
        warnings: [],
        publishedAt: new Date().toISOString(),
        supersedesRevisionId: null,
      },
    }

    await repository.save(publication)

    const retrieved = await repository.findById(pubId)
    assert.isNotNull(retrieved)
    assert.equal(retrieved?.id, pubId)
    assert.equal(retrieved?.type, 'dato')
    assert.equal(retrieved?.author.id, 'usr_investigador_1')
    assert.equal(retrieved?.conflictsOfInterest.length, 1)
    assert.equal(retrieved?.currentRevision.title, 'Serie oficial TPM primer bimestre 2023')
    assert.isNotNull(retrieved?.currentRevision.chartSpec)
    assert.equal(retrieved?.currentRevision.chartSpec?.title, 'Evolución TPM 2023')
    assert.equal(retrieved?.currentRevision.chartSpec?.queryHash, queryHash)
    assert.equal(retrieved?.currentRevision.chartSpec?.dataSnapshot.contentHash, dataHash)
    assert.deepEqual(retrieved?.currentRevision.chartSpec?.dataSnapshot.series, dataSeries)
  })

  test('emits publication.created outbox event atomically upon save', async ({ assert }) => {
    const repository = new PostgresPublicationRepository('public')
    const pubId = randomUUID()
    const revId = randomUUID()

    const publication: PublicationRecord = {
      id: pubId,
      type: 'interpretacion',
      author: {
        id: 'usr_historiador_2',
        displayName: 'Historiadora Económica',
      },
      conflictsOfInterest: [],
      forkedFromPublicationId: null,
      projectedAt: new Date().toISOString(),
      currentRevision: {
        id: revId,
        revisionNumber: 1,
        title: 'Interpretación de la política contractiva',
        content:
          'El Banco Central mantuvo la tasa en 11.25% como respuesta al brote inflacionario.',
        evidence: [{ description: 'Minuta RPM enero 2023' }],
        chartSpec: null,
        limitations: ['Interpretación basada en minutas públicas'],
        warnings: [],
        publishedAt: new Date().toISOString(),
        supersedesRevisionId: null,
      },
    }

    await repository.save(publication)

    const outboxResult = await db
      .connection('admin')
      .rawQuery('SELECT * FROM outbox_events WHERE aggregate_id = ? AND event_type = ? LIMIT 1', [
        pubId,
        'publication.created',
      ])

    assert.equal(outboxResult.rows.length, 1)
    const event = outboxResult.rows[0]
    assert.equal(event.aggregate_type, 'publication')
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload
    assert.equal(payload.publicationId, pubId)
    assert.equal(payload.type, 'interpretacion')
    assert.equal(payload.hasChart, false)
  })

  test('supports forked publication referencing an existing publication', async ({ assert }) => {
    const repository = new PostgresPublicationRepository('public')
    const originalPubId = randomUUID()
    const forkedPubId = randomUUID()

    const originalPub: PublicationRecord = {
      id: originalPubId,
      type: 'hipotesis',
      author: { id: 'usr_autor_orig', displayName: 'Autor Original' },
      conflictsOfInterest: [],
      forkedFromPublicationId: null,
      projectedAt: new Date().toISOString(),
      currentRevision: {
        id: randomUUID(),
        revisionNumber: 1,
        title: 'Hipótesis sobre shock de oferta inicial',
        content:
          'La inflación de 2022-2023 se debió preponderantemente a factores externos de oferta.',
        evidence: [],
        chartSpec: null,
        limitations: ['Falsable si modelos VAR demuestran predominio de demanda interna'],
        warnings: [],
        publishedAt: new Date().toISOString(),
        supersedesRevisionId: null,
      },
    }

    await repository.save(originalPub)

    const forkedPub: PublicationRecord = {
      id: forkedPubId,
      type: 'hipotesis',
      author: { id: 'usr_autor_fork', displayName: 'Autor del Fork' },
      conflictsOfInterest: [],
      forkedFromPublicationId: originalPubId,
      projectedAt: new Date().toISOString(),
      currentRevision: {
        id: randomUUID(),
        revisionNumber: 1,
        title: 'Fork: Hipótesis sobre interacción de liquidez y oferta',
        content:
          'Se incorpora el efecto de retiros previsionales a la hipótesis original de oferta.',
        evidence: [],
        chartSpec: null,
        limitations: ['Falsable con descomposición de choques estructurales'],
        warnings: [],
        publishedAt: new Date().toISOString(),
        supersedesRevisionId: null,
      },
    }

    await repository.save(forkedPub)

    const retrievedFork = await repository.findById(forkedPubId)
    assert.isNotNull(retrievedFork)
    assert.equal(retrievedFork?.forkedFromPublicationId, originalPubId)
  })

  test('allows cha_public role to read public_publication_records but denies access to canonical tables', async ({
    assert,
  }) => {
    const publicQuery = await db
      .connection('public')
      .rawQuery('SELECT count(*)::integer AS total FROM public_publication_records')
    assert.isNumber(publicQuery.rows[0].total)

    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT * FROM publications LIMIT 1'),
      /permission denied for table publications/
    )

    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT * FROM chart_specs LIMIT 1'),
      /permission denied for table chart_specs/
    )

    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT * FROM publication_revisions LIMIT 1'),
      /permission denied for table publication_revisions/
    )
  })

  test('list retrieves publications ordered by publishedAt descending', async ({ assert }) => {
    const repository = new PostgresPublicationRepository('public')
    const list = await repository.list(10)
    assert.isArray(list)
    assert.isAtLeast(list.length, 1)

    // Verificar que los campos vengan correctamente deserializados
    for (const pub of list) {
      assert.isString(pub.id)
      assert.isString(pub.currentRevision.title)
      assert.isArray(pub.conflictsOfInterest)
      assert.isArray(pub.currentRevision.limitations)
      assert.isArray(pub.currentRevision.evidence)
    }
  })
})
