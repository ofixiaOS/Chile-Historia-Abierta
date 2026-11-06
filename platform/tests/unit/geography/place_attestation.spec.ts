import { test } from '@japa/runner'
import {
  assertPlaceAttestationIsValid,
  type PlaceAttestation,
} from '#modules/geography/domain/place_attestation'
import { PlaceService } from '#modules/geography/application/place_service'
import { InMemoryPlaceRepository } from '#modules/geography/infrastructure/in_memory_place_repository'

test.group('Geografía Histórica — PlaceAttestation & PlaceService (Unit)', () => {
  const sampleValidAttestation: PlaceAttestation = {
    id: 'attestation-stgo-cabildo',
    placeId: 'santiago',
    placeName: 'Santiago de Chile (Cabildo Abierto de 1810)',
    territoryType: 'city',
    coordinates: {
      latitude: -33.4372,
      longitude: -70.6506,
    },
    timeRange: {
      fromYear: 1810,
      toYear: 1818,
    },
    certainty: 'exact',
    sourceId: 'actas-cabildo-1810',
    sourceName: 'Actas del Cabildo de Santiago',
    evidenceStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'CC-BY-4.0',
      itemRights: 'Public Domain (Ley 17.336 Art. 8)',
      redistributionPolicy: 'open_public_with_attribution',
      requiredAttribution: 'Archivo Nacional Histórico',
    },
  }

  test('valida atestación geográfica correcta sin arrojar error', () => {
    assertPlaceAttestationIsValid(sampleValidAttestation)
  })

  test('rechaza latitud fuera del rango WGS84 [-90, 90]', ({ assert }) => {
    const invalidLat = {
      ...sampleValidAttestation,
      coordinates: { latitude: 95.5, longitude: -70.6506 },
    }
    assert.throws(() => assertPlaceAttestationIsValid(invalidLat))
  })

  test('rechaza longitud fuera del rango WGS84 [-180, 180]', ({ assert }) => {
    const invalidLon = {
      ...sampleValidAttestation,
      coordinates: { latitude: -33.4372, longitude: -195.0 },
    }
    assert.throws(() => assertPlaceAttestationIsValid(invalidLon))
  })

  test('rechaza coordenadas no finitas (NaN o Infinity)', ({ assert }) => {
    const nanLat = {
      ...sampleValidAttestation,
      coordinates: { latitude: Number.NaN, longitude: -70.6506 },
    }
    assert.throws(() => assertPlaceAttestationIsValid(nanLat))
  })

  test('rechaza rango temporal invertido (fromYear > toYear)', ({ assert }) => {
    const invertedTime = {
      ...sampleValidAttestation,
      timeRange: { fromYear: 1980, toYear: 1970 },
    }
    assert.throws(() => assertPlaceAttestationIsValid(invertedTime))
  })

  test('rechaza campos de identidad o fuente vacíos', ({ assert }) => {
    const emptyPlaceId = {
      ...sampleValidAttestation,
      placeId: '   ',
    }
    assert.throws(() => assertPlaceAttestationIsValid(emptyPlaceId))

    const emptySourceName = {
      ...sampleValidAttestation,
      sourceName: '',
    }
    assert.throws(() => assertPlaceAttestationIsValid(emptySourceName))
  })

  test('acota claves, campos textuales y relaciones para respuestas GeoJSON', ({ assert }) => {
    assert.throws(() => assertPlaceAttestationIsValid({ ...sampleValidAttestation, id: "bad'id" }))
    assert.throws(() =>
      assertPlaceAttestationIsValid({ ...sampleValidAttestation, placeName: 'ñ'.repeat(257) })
    )
    assert.throws(() =>
      assertPlaceAttestationIsValid({ ...sampleValidAttestation, notes: 'x'.repeat(8193) })
    )
    assert.throws(() =>
      assertPlaceAttestationIsValid({
        ...sampleValidAttestation,
        relatedClaimIds: Array.from({ length: 101 }, (_, index) => `claim-${index}`),
      })
    )
  })

  test('PlaceService filtra atestaciones por periodo, tipo y certeza', async ({ assert }) => {
    const repo = new InMemoryPlaceRepository()
    const service = new PlaceService(repo)
    const all = await service.getAttestations()
    assert.isAtLeast(all.length, 5)

    // Filtro por año 1810 (debe incluir Santiago 1810-1818)
    const filtered1810 = await service.getAttestations({ fromYear: 1810, toYear: 1812 })
    assert.isTrue(filtered1810.some((a) => a.placeId === 'santiago'))
    assert.isFalse(filtered1810.some((a) => a.placeId === 'concepcion'))

    // Filtro por certeza 'approximate' (Antofagasta 1879)
    const approx = await service.getAttestations({ certainty: 'approximate' })
    assert.isAtLeast(approx.length, 1)
    assert.equal(approx[0].placeId, 'antofagasta')

    // Filtro por tipo de territorio 'site' (Fuerte Bulnes / Magallanes)
    const sites = await service.getAttestations({ territoryType: 'site' })
    assert.isTrue(sites.some((a) => a.placeId === 'magallanes'))
  })

  test('PlaceService toGeoJsonFeatureCollection genera RFC 7946 conforme con [lon, lat]', async ({
    assert,
  }) => {
    const repo = new InMemoryPlaceRepository()
    const service = new PlaceService(repo)
    const attestations = await service.getAttestations({ placeId: 'santiago' })
    const geoJson = service.toGeoJsonFeatureCollection(attestations)

    assert.equal(geoJson.type, 'FeatureCollection')
    assert.equal(geoJson.features.length, 1)

    const feature = geoJson.features[0]
    assert.equal(feature.type, 'Feature')
    assert.equal(feature.geometry.type, 'Point')
    // GeoJSON RFC 7946: [longitude, latitude]
    assert.closeTo(feature.geometry.coordinates[0], -70.6506, 0.001)
    assert.closeTo(feature.geometry.coordinates[1], -33.4372, 0.001)
    assert.equal(feature.properties.placeId, 'santiago')
    assert.equal(feature.properties.certainty, 'exact')
  })
})
