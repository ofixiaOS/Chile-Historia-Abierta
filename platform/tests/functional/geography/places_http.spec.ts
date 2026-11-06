import { test } from '@japa/runner'
import { readJsonBody } from '#tests/helpers/http_json'

test.group(
  'GET /v1/places/geojson — Colección GeoJSON de Atestaciones Históricas (Functional)',
  () => {
    test('retorna FeatureCollection GeoJSON con 200 OK y encabezados ETag y Cache-Control', async ({
      client,
      assert,
    }) => {
      const response = await client.get('/v1/places/geojson')

      response.assertStatus(200)
      response.assertHeader('content-type', 'application/geo+json; charset=utf-8')
      response.assertHeader('cache-control', 'public, max-age=60, stale-while-revalidate=300')

      const body = readJsonBody<{
        type: string
        features: {
          type: string
          geometry: { type: string; coordinates: number[] }
          properties: { placeId: string; certainty: string }
        }[]
        pagination: {
          limit: number
          hasMore: boolean
          nextCursor: string | null
          next: string | null
        }
      }>(response)
      assert.equal(body.type, 'FeatureCollection')
      assert.isTrue(Array.isArray(body.features))
      assert.isAtLeast(body.features.length, 5)

      // Validar estructura de un Feature GeoJSON
      const feature = body.features[0]
      assert.equal(feature.type, 'Feature')
      assert.equal(feature.geometry.type, 'Point')
      assert.isTrue(Array.isArray(feature.geometry.coordinates))
      assert.equal(feature.geometry.coordinates.length, 2)
      assert.isString(feature.properties.placeId)
      assert.isString(feature.properties.certainty)
      assert.deepEqual(body.pagination, {
        limit: 100,
        hasMore: false,
        nextCursor: null,
        next: null,
      })
    })

    test('pagina todas las atestaciones sin omitir ni repetir filas', async ({
      client,
      assert,
    }) => {
      const first = await client.get('/v1/places/geojson?limit=2')
      first.assertStatus(200)
      const firstBody = first.body() as {
        features: { id: string }[]
        pagination: { hasMore: boolean; next: string | null }
      }
      assert.equal(firstBody.features.length, 2)
      assert.isTrue(firstBody.pagination.hasMore)

      const ids = firstBody.features.map((feature) => feature.id)
      let next = firstBody.pagination.next
      let pageCount = 1

      while (next) {
        const page = await client.get(next)
        page.assertStatus(200)
        const pageBody = page.body() as unknown as {
          features: { id: string }[]
          pagination: { next: string | null }
        }
        ids.push(...pageBody.features.map((feature) => feature.id))
        next = pageBody.pagination.next
        pageCount += 1
        assert.isAtMost(pageCount, 20)
      }

      assert.isAtLeast(ids.length, 6)
      assert.equal(new Set(ids).size, ids.length)
    })

    test('rechaza páginas y filtros con valores malformados', async ({ client }) => {
      for (const query of [
        'limit=0',
        'limit=501',
        'limit=1.5',
        'cursor=not%20a%20cursor',
        'fromYear=1810junk',
        `placeId=${'a'.repeat(129)}`,
      ]) {
        const response = await client.get(`/v1/places/geojson?${query}`)
        response.assertStatus(422)
      }
    })

    test('retorna 304 Not Modified cuando el encabezado If-None-Match coincide', async ({
      client,
      assert,
    }) => {
      const initialResponse = await client.get('/v1/places/geojson')
      initialResponse.assertStatus(200)

      const etag = initialResponse.header('etag')
      assert.isDefined(etag)

      const conditionalResponse = await client
        .get('/v1/places/geojson')
        .header('if-none-match', etag!)
      conditionalResponse.assertStatus(304)
      assert.isEmpty(conditionalResponse.text())
    })

    test('filtra atestaciones por rango temporal histórico', async ({ client, assert }) => {
      const response = await client.get('/v1/places/geojson?fromYear=1810&toYear=1815')
      response.assertStatus(200)

      const body = response.body()
      assert.isTrue(body.features.some((f: any) => f.properties.placeId === 'santiago'))
      assert.isFalse(body.features.some((f: any) => f.properties.placeId === 'tarapaca'))
    })

    test('filtra atestaciones por certeza espacial', async ({ client, assert }) => {
      const response = await client.get('/v1/places/geojson?certainty=approximate')
      response.assertStatus(200)

      const body = response.body()
      assert.isAtLeast(body.features.length, 1)
      assert.isTrue(body.features.every((f: any) => f.properties.certainty === 'approximate'))
    })

    test('filtra atestaciones por tipo de territorio', async ({ client, assert }) => {
      const response = await client.get('/v1/places/geojson?territoryType=city')
      response.assertStatus(200)

      const body = response.body()
      assert.isTrue(body.features.every((f: any) => f.properties.territoryType === 'city'))
    })

    test('rechaza fromYear mayor que toYear con 422', async ({ client, assert }) => {
      const response = await client.get('/v1/places/geojson?fromYear=1980&toYear=1810')
      response.assertStatus(422)

      const body = response.body()
      assert.equal(body.error.code, 'E_VALIDATION')
      assert.equal(body.error.details?.field, 'fromYear')
    })

    test('rechaza territoryType o certainty inválidos con 422', async ({ client }) => {
      const resTerritory = await client.get('/v1/places/geojson?territoryType=galaxia')
      resTerritory.assertStatus(422)

      const resCertainty = await client.get('/v1/places/geojson?certainty=absoluta')
      resCertainty.assertStatus(422)
    })
  }
)
