import { test } from '@japa/runner'

test.group('GET /openapi.json', () => {
  test('CORS preflight no habilita credenciales ni refleja encabezados ajenos', async ({
    client,
    assert,
  }) => {
    const response = await client
      .options('/v1/claims')
      .header('origin', 'https://untrusted.example')
      .header('access-control-request-method', 'POST')
      .header('access-control-request-headers', 'x-unlisted-header')

    assert.notExists(response.header('access-control-allow-credentials'))
    assert.notInclude(
      (response.header('access-control-allow-headers') ?? '').toLowerCase(),
      'x-unlisted-header'
    )
  })

  test('applies security headers to error responses without enabling HSTS in tests', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/missing-security-header-test-route')

    response.assertStatus(404)
    response.assertHeader('x-content-type-options', 'nosniff')
    response.assertHeader('x-frame-options', 'DENY')
    response.assertHeader('referrer-policy', 'strict-origin-when-cross-origin')
    response.assertHeader(
      'content-security-policy',
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
    )
    assert.isUndefined(response.header('strict-transport-security'))
  })

  test('publishes the implemented public contract', async ({ client, assert }) => {
    const response = await client.get('/openapi.json')

    response.assertStatus(200)
    response.assertHeader('x-content-type-options', 'nosniff')
    response.assertHeader('x-frame-options', 'DENY')
    response.assertHeader('referrer-policy', 'strict-origin-when-cross-origin')
    response.assertHeader(
      'content-security-policy',
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
    )
    response.assertBodyContains({
      openapi: '3.1.0',
      info: { title: 'Chile Historia Abierta API' },
    })
    response.assertHeader('cache-control', 'public, max-age=300')
    const contract = response.body()
    assert.deepEqual(contract.paths['/v1/publications'].post.security, [{ PilotEditorBearer: [] }])
    const geoJson = contract.paths['/v1/places/geojson'].get
    assert.equal(geoJson.parameters[0].name, 'limit')
    assert.equal(geoJson.parameters[0].schema.maximum, 500)
    assert.deepEqual(geoJson.responses['200'].content['application/geo+json'].schema.required, [
      'type',
      'features',
      'pagination',
    ])
    assert.property(contract.paths['/v1/publications'].post.responses, '401')
    assert.property(contract.paths['/v1/publications'].post.responses, '503')
    assert.include(
      contract.paths['/v1/publications'].post.responses['503'].description,
      'producción'
    )
    for (const path of ['/v1/chart-specs/validate', '/v1/assistance/query', '/v1/mcp'] as const) {
      assert.property(contract.paths[path].post.responses, '429')
    }
    for (const path of [
      '/v1/publications/{id}/comments',
      '/v1/publications/{id}/votes',
      '/v1/reports',
    ] as const) {
      assert.property(contract.paths[path].post.responses, '503')
    }

    for (const [path, pathItem] of Object.entries(contract.paths)) {
      if (!path.startsWith('/v1/')) continue
      const operations = pathItem as unknown as Record<
        string,
        { responses: Record<string, unknown> } | undefined
      >
      for (const method of ['get', 'post'] as const) {
        const operation = operations[method]
        if (operation) assert.property(operation.responses, '429')
      }
    }
  })

  test('ignora IPs reenviadas no confiables al aplicar el rate limit', async ({
    client,
    assert,
  }) => {
    let blocked: Awaited<ReturnType<typeof client.get>> | undefined

    for (let index = 1; index <= 61; index++) {
      const response = await client
        .get('/openapi.json')
        .header('x-forwarded-for', `198.51.100.${index}`)
      if (response.status() === 429) {
        blocked = response
        break
      }
      response.assertStatus(200)
    }

    assert.isDefined(blocked)
    blocked!.assertStatus(429)
  })
})
