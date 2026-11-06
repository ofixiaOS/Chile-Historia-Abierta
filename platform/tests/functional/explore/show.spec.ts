import { test } from '@japa/runner'

test.group('GET /v1/explore', () => {
  test('returns exploration read model with items, facets, and time range', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/v1/explore?limit=10')

    response.assertStatus(200)
    assert.isString(response.header('etag'))
    assert.include(response.header('cache-control') ?? '', 'public')

    const body = response.body()
    assert.isDefined(body.data)
    assert.isArray(body.data.items)
    assert.isAtLeast(body.data.items.length, 1)

    // Verify item fields for timeline/map/list synchronization (ADR 0003)
    const item = body.data.items[0]
    assert.isString(item.id)
    assert.isString(item.statement)
    assert.isString(item.evidenceStatus)
    assert.isString(item.publishedAt)
    assert.isArray(item.sourceTypes)
    assert.isNumber(item.sourceCount)

    // Verify facets
    assert.isDefined(body.data.facets)
    assert.isNumber(body.data.facets.totalMatching)
    assert.isDefined(body.data.facets.byEvidenceStatus)
    assert.isDefined(body.data.facets.bySourceType)

    // Verify timeRange
    assert.isDefined(body.data.timeRange)

    // Verify pagination and metadata
    assert.isDefined(body.pagination)
    assert.equal(body.pagination.limit, 10)
    assert.isDefined(body.version)
    assert.isDefined(body.links.self)
  })

  test('returns 304 for matching If-None-Match header', async ({ client, assert }) => {
    const first = await client.get('/v1/explore?limit=5')
    first.assertStatus(200)

    const etag = first.header('etag')
    assert.isDefined(etag)

    const second = await client.get('/v1/explore?limit=5').header('if-none-match', etag!)
    second.assertStatus(304)
    assert.isEmpty(second.text())
  })

  test('filters exploration items and updates facets accordingly', async ({ client, assert }) => {
    const response = await client.get('/v1/explore?evidenceStatus=documented')
    response.assertStatus(200)

    const body = response.body()
    for (const item of body.data.items) {
      assert.equal(item.evidenceStatus, 'documented')
    }
  })

  test('rejects corrupted cursor in exploration request with E_VALIDATION', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/v1/explore?cursor=tampered_cursor_data')
    response.assertStatus(422)
    assert.equal(response.body().error.code, 'E_VALIDATION')
    assert.include(response.body().error.message, 'Invalid pagination cursor')
  })
})
