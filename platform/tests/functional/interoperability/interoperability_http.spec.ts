import { test } from '@japa/runner'
import type { McpResponse } from '#modules/interoperability/application/mcp_server'
import { readJsonBody } from '#tests/helpers/http_json'

test.group('Interoperability API (Functional)', () => {
  test('GET /v1/claims/:id/prov retorna grafo W3C PROV-O en JSON-LD con ETag', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/v1/claims/fixture-claim-001/prov')

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/ld+json')
    response.assertHeader('cache-control', 'public, max-age=60')

    const etag = response.header('etag')
    assert.isString(etag)
    assert.match(etag!, /^"[A-Za-z0-9_-]+"$/)

    const body = readJsonBody<Record<string, unknown>>(response)
    assert.isDefined(body['@context'])
    assert.isArray(body['@graph'])

    // Soporte para 304 Not Modified
    const notModifiedResponse = await client
      .get('/v1/claims/fixture-claim-001/prov')
      .header('if-none-match', etag!)

    notModifiedResponse.assertStatus(304)
  })

  test('GET /v1/claims/:id/prov retorna 404 para afirmación no encontrada', async ({ client }) => {
    const response = await client.get('/v1/claims/claim-inexistente/prov')
    response.assertStatus(404)
  })

  test('GET /v1/publications/:id/prov retorna 404 para publicación no encontrada', async ({
    client,
  }) => {
    const response = await client.get('/v1/publications/pub-inexistente/prov')
    response.assertStatus(404)
  })

  test('GET /v1/series/:id/sdmx retorna mensaje SDMX-JSON 2.1 con ETag', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/v1/series/bcentral-tpm/sdmx')

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/vnd.sdmx.data+json; charset=utf-8')

    const etag = response.header('etag')
    assert.isString(etag)

    const body = readJsonBody<Record<string, unknown>>(response)
    assert.isDefined(body.meta)
    assert.isDefined(body.data)

    // Soporte para 304 Not Modified
    const notModifiedResponse = await client
      .get('/v1/series/bcentral-tpm/sdmx')
      .header('if-none-match', etag!)

    notModifiedResponse.assertStatus(304)
  })

  test('GET /v1/series/:id/sdmx retorna 404 para serie no encontrada', async ({ client }) => {
    const response = await client.get('/v1/series/serie-fantasma/sdmx')
    response.assertStatus(404)
  })

  test('POST /v1/mcp procesa tools/list vía JSON-RPC 2.0', async ({ client, assert }) => {
    const response = await client.post('/v1/mcp').json({
      jsonrpc: '2.0',
      id: 'http-req-1',
      method: 'tools/list',
    })

    response.assertStatus(200)
    const body = readJsonBody<Record<string, unknown>>(response)
    assert.equal(body.jsonrpc, '2.0')
    assert.equal(body.id, 'http-req-1')

    const result = body.result as { tools: readonly { name: string }[] }
    assert.isAbove(result.tools.length, 3)
  })

  test('POST /v1/mcp no sustituye un jsonrpc inválido por una versión válida', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/v1/mcp').json({
      jsonrpc: '1.0',
      id: 'bad-version',
      method: 'tools/list',
    })

    response.assertStatus(200)
    assert.equal(readJsonBody<McpResponse>(response).error?.code, -32600)
  })

  test('POST /v1/mcp ejecuta tools/call para get_statistical_series', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/v1/mcp').json({
      jsonrpc: '2.0',
      id: 'http-req-2',
      method: 'tools/call',
      params: {
        name: 'get_statistical_series',
        arguments: { seriesId: 'bcentral-tpm' },
      },
    })

    response.assertStatus(200)
    const body = readJsonBody<Record<string, unknown>>(response)
    assert.equal(body.id, 'http-req-2')

    const result = body.result as { content: readonly { type: string; text: string }[] }
    assert.equal(result.content[0]!.type, 'text')
    assert.include(result.content[0]!.text, 'bcentral-tpm')
  })
})
