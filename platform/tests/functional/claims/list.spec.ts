import { test } from '@japa/runner'

test.group('GET /v1/claims', () => {
  test('returns paginated public claims with ETag and cache-control headers', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/v1/claims?limit=10')

    response.assertStatus(200)
    assert.isString(response.header('etag'))
    assert.include(response.header('cache-control') ?? '', 'public')

    const body = response.body()
    assert.isArray(body.data)
    assert.isAtLeast(body.data.length, 1)
    assert.isDefined(body.pagination)
    assert.equal(body.pagination.limit, 10)
    assert.isDefined(body.version)
    assert.isDefined(body.links.self)

    // Draft claims or invalid claims must NOT be present
    for (const item of body.data) {
      assert.notEqual(item.id, 'fixture-draft-001')
      assert.notEqual(item.id, 'fixture-invalid-001')
      assert.include(['published', 'corrected'], item.attributes.editorialStatus)
    }
  })

  test('returns 304 for a matching If-None-Match validator', async ({ client, assert }) => {
    const first = await client.get('/v1/claims?limit=5')
    first.assertStatus(200)

    const etag = first.header('etag')
    assert.isDefined(etag)

    const second = await client.get('/v1/claims?limit=5').header('if-none-match', etag!)
    second.assertStatus(304)
    assert.isEmpty(second.text())
  })

  test('filters claims by evidenceStatus', async ({ client, assert }) => {
    const response = await client.get('/v1/claims?evidenceStatus=documented')
    response.assertStatus(200)

    const body = response.body()
    for (const item of body.data) {
      assert.equal(item.attributes.evidenceStatus, 'documented')
    }
  })

  test('filters claims by lexical search query', async ({ client, assert }) => {
    const response = await client.get('/v1/claims?q=contrato')
    response.assertStatus(200)

    const body = response.body()
    assert.isAtLeast(body.data.length, 1)
    assert.include(body.data[0].attributes.statement.toLowerCase(), 'contrato')
  })

  test('rejects an invalid evidence status with E_VALIDATION', async ({ client, assert }) => {
    const response = await client.get('/v1/claims?evidenceStatus=verified_fact')
    response.assertStatus(422)

    const body = response.body()
    assert.equal(body.error.code, 'E_VALIDATION')
    assert.include(body.error.message, 'Invalid evidence status filter')
  })

  test('rejects limit out of allowed range with E_VALIDATION', async ({ client, assert }) => {
    const responseTooHigh = await client.get('/v1/claims?limit=500')
    responseTooHigh.assertStatus(422)
    assert.equal(responseTooHigh.body().error.code, 'E_VALIDATION')

    const responseZero = await client.get('/v1/claims?limit=0')
    responseZero.assertStatus(422)
    assert.equal(responseZero.body().error.code, 'E_VALIDATION')
  })

  test('rejects a corrupted pagination cursor with E_VALIDATION', async ({ client, assert }) => {
    const response = await client.get('/v1/claims?cursor=corrupted_invalid_cursor')
    response.assertStatus(422)
    assert.equal(response.body().error.code, 'E_VALIDATION')
    assert.include(response.body().error.message, 'Invalid pagination cursor')
  })
})
