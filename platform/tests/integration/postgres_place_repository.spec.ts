import { type PlaceAttestation } from '#modules/geography/domain/place_attestation'
import { PostgresPlaceRepository } from '#modules/geography/infrastructure/postgres_place_repository'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

test.group('PostgresPlaceRepository (Integration PostgreSQL)', () => {
  const repository = new PostgresPlaceRepository('admin', 'public')

  function getUniqueId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  }

  function createTestAttestation(
    id: string,
    overrides?: Partial<PlaceAttestation>
  ): PlaceAttestation {
    return {
      id,
      placeId: overrides?.placeId ?? `place-${id}`,
      placeName: overrides?.placeName ?? `Lugar Histórico Test ${id}`,
      territoryType: overrides?.territoryType ?? 'city',
      coordinates: overrides?.coordinates ?? {
        latitude: -33.4372,
        longitude: -70.6506,
      },
      timeRange: overrides?.timeRange ?? {
        fromYear: 1810,
        toYear: 1818,
      },
      certainty: overrides?.certainty ?? 'exact',
      sourceId: overrides?.sourceId ?? 'actas-cabildo-1810',
      sourceName: overrides?.sourceName ?? 'Actas del Cabildo de Santiago',
      sourceUrl: overrides?.sourceUrl ?? 'https://example.invalid/actas-1810',
      evidenceStatus: overrides?.evidenceStatus ?? 'documented',
      license: overrides?.license ?? {
        softwareLicense: 'MIT',
        datasetLicense: 'CC-BY-4.0',
        itemRights: 'Public Domain (Ley 17.336 Art. 8)',
        redistributionPolicy: 'open_public_with_attribution',
        requiredAttribution: 'Archivo Nacional Histórico de Chile',
      },
      notes: overrides?.notes ?? 'Nota histórica para pruebas de persistencia en PostgreSQL.',
      relatedClaimIds: overrides?.relatedClaimIds ?? ['claim-test-1', 'claim-test-2'],
    }
  }

  test('guarda y recupera una atestación territorial a través de la vista pública con rol cha_public', async ({
    assert,
  }) => {
    const id = getUniqueId('attest-pg-roundtrip')
    const attestation = createTestAttestation(id, {
      placeId: 'santiago-test',
      placeName: 'Santiago de Chile — Cabildo Test',
      territoryType: 'city',
      coordinates: { latitude: -33.4372, longitude: -70.6506 },
      timeRange: { fromYear: 1810, toYear: 1818 },
      certainty: 'exact',
      notes: 'Nota detallada sobre el Cabildo.',
      relatedClaimIds: ['claim-1810-test'],
    })

    await repository.save(attestation)

    const retrieved = await repository.findById(id)
    assert.isNotNull(retrieved)
    assert.equal(retrieved!.id, id)
    assert.equal(retrieved!.placeId, 'santiago-test')
    assert.equal(retrieved!.placeName, 'Santiago de Chile — Cabildo Test')
    assert.equal(retrieved!.territoryType, 'city')
    assert.closeTo(retrieved!.coordinates.latitude, -33.4372, 0.0001)
    assert.closeTo(retrieved!.coordinates.longitude, -70.6506, 0.0001)
    assert.equal(retrieved!.timeRange.fromYear, 1810)
    assert.equal(retrieved!.timeRange.toYear, 1818)
    assert.equal(retrieved!.certainty, 'exact')
    assert.equal(retrieved!.evidenceStatus, 'documented')
    assert.equal(retrieved!.license.softwareLicense, 'MIT')
    assert.equal(retrieved!.license.datasetLicense, 'CC-BY-4.0')
    assert.equal(retrieved!.license.itemRights, 'Public Domain (Ley 17.336 Art. 8)')
    assert.equal(retrieved!.license.redistributionPolicy, 'open_public_with_attribution')
    assert.equal(retrieved!.license.requiredAttribution, 'Archivo Nacional Histórico de Chile')
    assert.equal(retrieved!.notes, 'Nota detallada sobre el Cabildo.')
    assert.deepEqual(retrieved!.relatedClaimIds, ['claim-1810-test'])
  })

  test('filtra atestaciones por placeId, territoryType y certainty', async ({ assert }) => {
    const uniquePlaceId = getUniqueId('unique-place')
    const id1 = getUniqueId('attest-filter-1')
    const id2 = getUniqueId('attest-filter-2')

    await repository.save(
      createTestAttestation(id1, {
        placeId: uniquePlaceId,
        territoryType: 'region',
        certainty: 'exact',
      })
    )
    await repository.save(
      createTestAttestation(id2, {
        placeId: uniquePlaceId,
        territoryType: 'boundary',
        certainty: 'approximate',
      })
    )

    // Filtrar por placeId
    const byPlace = await repository.findMany({ placeId: uniquePlaceId })
    assert.equal(byPlace.length, 2)

    // Filtrar por territoryType
    const byTerritory = await repository.findMany({
      placeId: uniquePlaceId,
      territoryType: 'region',
    })
    assert.equal(byTerritory.length, 1)
    assert.equal(byTerritory[0].id, id1)

    // Filtrar por certainty
    const byCertainty = await repository.findMany({
      placeId: uniquePlaceId,
      certainty: 'approximate',
    })
    assert.equal(byCertainty.length, 1)
    assert.equal(byCertainty[0].id, id2)
  })

  test('filtra atestaciones por rango temporal histórico y respeta orden cronológico', async ({
    assert,
  }) => {
    const uniquePlace = getUniqueId('temporal-place')
    const idEarly = getUniqueId('attest-early')
    const idMid = getUniqueId('attest-mid')
    const idLate = getUniqueId('attest-late')

    await repository.save(
      createTestAttestation(idEarly, {
        placeId: uniquePlace,
        placeName: 'Atestación Temprana',
        timeRange: { fromYear: 1810, toYear: 1818 },
      })
    )
    await repository.save(
      createTestAttestation(idMid, {
        placeId: uniquePlace,
        placeName: 'Atestación Media',
        timeRange: { fromYear: 1879, toYear: 1883 },
      })
    )
    await repository.save(
      createTestAttestation(idLate, {
        placeId: uniquePlace,
        placeName: 'Atestación Tardía',
        timeRange: { fromYear: 1939, toYear: 1970 },
      })
    )

    // Consulta con rango 1870-1900: debe incluir idMid, pero no idEarly ni idLate
    const results = await repository.findMany({
      placeId: uniquePlace,
      fromYear: 1870,
      toYear: 1900,
    })

    assert.equal(results.length, 1)
    assert.equal(results[0].id, idMid)

    // Consulta con rango amplio: verificar orden cronológico ascendente
    const allChronological = await repository.findMany({ placeId: uniquePlace })
    assert.equal(allChronological.length, 3)
    assert.equal(allChronological[0].id, idEarly)
    assert.equal(allChronological[1].id, idMid)
    assert.equal(allChronological[2].id, idLate)
  })

  test('pagina con cursor keyset por año, nombre e id sin duplicados', async ({ assert }) => {
    const placeId = getUniqueId('page-place')
    const ids = ['c', 'a', 'b'].map((suffix) => `${placeId}-${suffix}`)
    for (const [id, placeName] of [
      [ids[0], 'Lugar C'],
      [ids[1], 'Lugar A'],
      [ids[2], 'Lugar B'],
    ]) {
      await repository.save(
        createTestAttestation(id, {
          placeId,
          placeName,
          timeRange: { fromYear: 1810 },
        })
      )
    }

    const first = await repository.findPage({ placeId }, 2)
    assert.deepEqual(
      first.items.map((item) => item.placeName),
      ['Lugar A', 'Lugar B']
    )
    assert.isNotNull(first.next)

    const second = await repository.findPage({ placeId }, 2, first.next!)
    assert.deepEqual(
      second.items.map((item) => item.placeName),
      ['Lugar C']
    )
    assert.isNull(second.next)
    assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 3)
  })

  test('base de datos aplica límites de tamaño e índice de orden de página', async ({ assert }) => {
    const insert = `
      INSERT INTO place_attestations (
        id, place_id, place_name, territory_type, latitude, longitude, from_year,
        certainty, source_id, source_name, evidence_status, software_license,
        dataset_license, item_rights, redistribution_policy, required_attribution, notes
      ) VALUES (?, ?, ?, 'city', -33, -70, 1810, 'exact', 'source-1', 'Source',
        'documented', 'MIT', 'CC-BY-4.0', 'PD', 'open', 'Attribution', ?)
    `

    await assert.rejects(
      () =>
        db
          .connection('admin')
          .rawQuery(insert, ['invalid id', getUniqueId('place-size'), 'Place', 'Note']),
      /place_attestations_id_format_check/
    )
    await assert.rejects(
      () =>
        db
          .connection('admin')
          .rawQuery(insert, [
            getUniqueId('attest-size'),
            getUniqueId('place-size'),
            'Place',
            'x'.repeat(8193),
          ]),
      /place_attestations_notes_size_check/
    )

    const index = await db
      .connection('admin')
      .rawQuery(`SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = ?`, [
        'place_attestations_public_page_idx',
      ])
    assert.lengthOf(index.rows, 1)
    assert.include(index.rows[0].indexdef, 'from_year')
    assert.include(index.rows[0].indexdef, 'id')
  })

  test('retorna null al buscar un id inexistente', async ({ assert }) => {
    const nonexistent = await repository.findById('id-que-no-existe-en-postgres')
    assert.isNull(nonexistent)
  })

  test('garantiza Least Privilege: cha_public puede leer la vista pública pero tiene permiso denegado sobre la tabla base', async ({
    assert,
  }) => {
    // La lectura de la vista pública debe funcionar con rol cha_public
    const countResult = await db
      .connection('public')
      .rawQuery('SELECT count(*)::integer AS total FROM public_place_attestation_records')
    assert.isNumber(countResult.rows[0].total)

    // La lectura directa de la tabla base con cha_public debe ser denegada
    await assert.rejects(
      () => db.connection('public').rawQuery('SELECT * FROM place_attestations LIMIT 1'),
      /permission denied for table place_attestations/
    )
  })

  test('cha_public puede usar el esquema pero no crear objetos en public', async ({ assert }) => {
    const privileges = await db.connection('admin').rawQuery(
      `SELECT has_schema_privilege('cha_public', 'public', 'USAGE') AS can_use,
              has_schema_privilege('cha_public', 'public', 'CREATE') AS can_create`
    )
    assert.isTrue(privileges.rows[0].can_use)
    assert.isFalse(privileges.rows[0].can_create)

    await assert.rejects(
      () =>
        db
          .connection('public')
          .rawQuery('CREATE TABLE public.cha_public_schema_create_probe (id integer)'),
      /permission denied for schema public/
    )
  })

  test('garantiza Principio 8 (Inmutabilidad): UPDATE o DELETE sobre place_attestations arrojan error de trigger append-only', async ({
    assert,
  }) => {
    const id = getUniqueId('attest-immutable')
    await repository.save(createTestAttestation(id))

    // Intentar modificar el registro debe ser bloqueado por el trigger
    await assert.rejects(
      () =>
        db
          .connection('admin')
          .rawQuery('UPDATE place_attestations SET place_name = ? WHERE id = ?', [
            'Nombre Modificado Prohibido',
            id,
          ]),
      /place_attestations is append-only/
    )

    // Intentar eliminar el registro debe ser bloqueado por el trigger
    await assert.rejects(
      () => db.connection('admin').rawQuery('DELETE FROM place_attestations WHERE id = ?', [id]),
      /place_attestations is append-only/
    )
  })

  test('aplica restricciones CHECK de base de datos para latitud/longitud inválidas y rangos temporales invertidos', async ({
    assert,
  }) => {
    // Latitud fuera de [-90, 90]
    await assert.rejects(
      () =>
        db.connection('admin').rawQuery(
          `
          INSERT INTO place_attestations (
            id, place_id, place_name, territory_type, latitude, longitude,
            from_year, certainty, source_id, source_name, evidence_status,
            software_license, dataset_license, item_rights,
            redistribution_policy, required_attribution
          ) VALUES (?, ?, ?, 'city', 95.0, -70.0, 1810, 'exact', 's1', 'Source 1', 'documented', 'MIT', 'CC-BY-4.0', 'PD', 'open', 'Attribution')
          `,
          [getUniqueId('chk-lat'), 'pl-1', 'Test Lat Inválida']
        ),
      /place_attestations_latitude_check/
    )

    // Longitud fuera de [-180, 180]
    await assert.rejects(
      () =>
        db.connection('admin').rawQuery(
          `
          INSERT INTO place_attestations (
            id, place_id, place_name, territory_type, latitude, longitude,
            from_year, certainty, source_id, source_name, evidence_status,
            software_license, dataset_license, item_rights,
            redistribution_policy, required_attribution
          ) VALUES (?, ?, ?, 'city', -33.0, 195.0, 1810, 'exact', 's1', 'Source 1', 'documented', 'MIT', 'CC-BY-4.0', 'PD', 'open', 'Attribution')
          `,
          [getUniqueId('chk-lon'), 'pl-1', 'Test Lon Inválida']
        ),
      /place_attestations_longitude_check/
    )

    // Rango temporal invertido: from_year > to_year
    await assert.rejects(
      () =>
        db.connection('admin').rawQuery(
          `
          INSERT INTO place_attestations (
            id, place_id, place_name, territory_type, latitude, longitude,
            from_year, to_year, certainty, source_id, source_name, evidence_status,
            software_license, dataset_license, item_rights,
            redistribution_policy, required_attribution
          ) VALUES (?, ?, ?, 'city', -33.0, -70.0, 1980, 1970, 'exact', 's1', 'Source 1', 'documented', 'MIT', 'CC-BY-4.0', 'PD', 'open', 'Attribution')
          `,
          [getUniqueId('chk-time'), 'pl-1', 'Test Tiempo Invertido']
        ),
      /place_attestations_time_range_check/
    )
  })
})
