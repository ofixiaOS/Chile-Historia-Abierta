import { test } from '@japa/runner'
import { statisticsRepository } from '#modules/statistics/infrastructure/public_statistics'
import {
  pilotSeries,
  pilotVintages,
} from '#modules/statistics/infrastructure/in_memory_statistics_repository'

test.group('Statistics & Forecasts API (Functional)', () => {
  test('GET /v1/series lista las series estadísticas disponibles', async ({ client, assert }) => {
    const response = await client.get('/v1/series')

    response.assertStatus(200)
    const body = response.body()
    assert.isArray(body.data)
    assert.isAbove(body.data.length, 0)
    assert.equal(body.data[0].id, 'bcentral-tpm')
    assert.equal(body.limit, 100)
    assert.equal(body.offset, 0)
    assert.equal(body.total, body.data.length)
  })

  test('GET /v1/series valida límites de paginación', async ({ client }) => {
    const oversized = await client.get('/v1/series?limit=501')
    oversized.assertStatus(422)
    const malformed = await client.get('/v1/series?offset=-1')
    malformed.assertStatus(422)
  })

  test('GET /v1/series/:id retorna sobre factual de la serie con ETag y cache-control', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/v1/series/bcentral-tpm')

    response.assertStatus(200)
    response.assertHeader('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    const etag = response.header('etag')
    assert.isDefined(etag)

    response.assertBodyContains({
      data: {
        id: 'bcentral-tpm',
        concept: 'Tasa de Política Monetaria (TPM)',
        frequency: 'monthly',
        baseUnit: '%',
      },
      evidenceStatus: 'documented',
    })

    // Comprobación de If-None-Match -> 304
    const cachedResponse = await client
      .get('/v1/series/bcentral-tpm')
      .header('if-none-match', etag!)
    cachedResponse.assertStatus(304)
  })

  test('GET /v1/series/:id retorna 404 para serie inexistente', async ({ client }) => {
    const response = await client.get('/v1/series/serie-inexistente-999')

    response.assertStatus(404)
    response.assertBodyContains({
      error: {
        code: 'E_NOT_FOUND',
      },
    })
  })

  test('GET /v1/series/:id/vintages retorna historial de versiones publicadas', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/v1/series/bcentral-tpm/vintages')

    response.assertStatus(200)
    const body = response.body()
    assert.equal(body.seriesId, 'bcentral-tpm')
    assert.isArray(body.data)
    assert.equal(body.data.length, 2)
    assert.equal(body.data[0].id, 'vintage-bcentral-tpm-2024-v2')
    assert.equal(body.data[1].id, 'vintage-bcentral-tpm-2024-v1')
    assert.isUndefined(body.data[0].observations)
    assert.equal(body.limit, 100)
    assert.equal(body.offset, 0)
  })

  test('GET /v1/series/:id/observations consulta observaciones con filtrado temporal', async ({
    client,
    assert,
  }) => {
    // Consulta sin filtros (usa vintage vigente)
    const allResponse = await client.get('/v1/series/bcentral-tpm/observations')
    allResponse.assertStatus(200)
    const allBody = allResponse.body()
    assert.equal(allBody.total, 8)

    // Consulta con rango fromPeriod y toPeriod
    const filteredResponse = await client.get(
      '/v1/series/bcentral-tpm/observations?fromPeriod=2024-03&toPeriod=2024-06'
    )
    filteredResponse.assertStatus(200)
    const filteredBody = filteredResponse.body()
    assert.equal(filteredBody.total, 4)
    assert.equal(filteredBody.data[0].period, '2024-03')
    assert.equal(filteredBody.data[3].period, '2024-06')

    const pageResponse = await client.get('/v1/series/bcentral-tpm/observations?limit=2&offset=1')
    pageResponse.assertStatus(200)
    const pageBody = pageResponse.body()
    assert.equal(pageBody.total, 8)
    assert.equal(pageBody.limit, 2)
    assert.equal(pageBody.offset, 1)
    assert.equal(pageBody.data.length, 2)
    assert.notEqual(pageResponse.header('etag'), allResponse.header('etag'))
  })

  test('GET series collections rejects out-of-range and malformed pagination', async ({
    client,
  }) => {
    const observations = await client.get('/v1/series/bcentral-tpm/observations?limit=1001')
    observations.assertStatus(422)
    const repeated = await client.get('/v1/series/bcentral-tpm/observations?limit=2&limit=3')
    repeated.assertStatus(422)
    const vintages = await client.get('/v1/series/bcentral-tpm/vintages?offset=-1')
    vintages.assertStatus(422)
  })

  test('rechaza un vintage de otra serie en observaciones y SDMX', async ({ client }) => {
    const foreignSeriesId = 'synthetic-foreign-series-53'
    const foreignVintageId = 'synthetic-foreign-vintage-53'
    await statisticsRepository.saveSeries({
      ...pilotSeries[0]!,
      id: foreignSeriesId,
      currentVintageId: '',
    })
    await statisticsRepository.saveVintage({
      ...pilotVintages[0]!,
      id: foreignVintageId,
      seriesId: foreignSeriesId,
    })

    const observations = await client.get(
      `/v1/series/bcentral-tpm/observations?vintageId=${foreignVintageId}`
    )
    observations.assertStatus(404)

    const sdmx = await client.get(`/v1/series/bcentral-tpm/sdmx?vintageId=${foreignVintageId}`)
    sdmx.assertStatus(404)
  })

  test('GET /v1/series/:id/observations rechaza fromPeriod mayor que toPeriod con 422', async ({
    client,
  }) => {
    const response = await client.get(
      '/v1/series/bcentral-tpm/observations?fromPeriod=2024-08&toPeriod=2024-02'
    )

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'E_VALIDATION',
      },
    })
  })

  test('GET /v1/forecasts/:id retorna pronóstico con incertidumbre y verificación de baseline', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/v1/forecasts/forecast-bcentral-tpm-2024')

    response.assertStatus(200)
    response.assertHeader('cache-control', 'public, max-age=60, stale-while-revalidate=300')

    const body = response.body()
    assert.equal(body.evidenceStatus, 'forecast')
    assert.equal(body.data.beatsBaseline, true)
    assert.isBelow(body.data.modelMetricValue, body.data.baselineMetricValue)
    assert.isArray(body.data.forecastPoints)
    assert.equal(body.data.forecastPoints.length, 3)

    // Verifica que cada punto tenga abanico p10 <= p50 <= p90
    for (const pt of body.data.forecastPoints) {
      assert.isAtMost(pt.p10, pt.p50)
      assert.isAtMost(pt.p50, pt.p90)
    }
  })

  test('GET /v1/forecasts/:id retorna 404 para pronóstico no encontrado', async ({ client }) => {
    const response = await client.get('/v1/forecasts/forecast-inexistente')

    response.assertStatus(404)
    response.assertBodyContains({
      error: {
        code: 'E_NOT_FOUND',
      },
    })
  })

  test('limita una ruta GET por plantilla aunque cambie el identificador', async ({
    client,
    assert,
  }) => {
    for (let index = 0; index < 58; index++) {
      const allowed = await client.get(`/v1/forecasts/missing-${index}`)
      allowed.assertStatus(404)
    }

    const blocked = await client.get('/v1/forecasts/missing-final')
    blocked.assertStatus(429)
    assert.isAbove(Number(blocked.header('retry-after')), 0)
    assert.equal(blocked.body().error.code, 'E_RATE_LIMITED')
  })
})
