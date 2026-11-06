import { test } from '@japa/runner'

test.group('GET /v1/claims/:id', () => {
  test('returns a factual envelope with localizable sources', async ({ client, assert }) => {
    const response = await client.get('/v1/claims/fixture-claim-001')

    response.assertStatus(200)
    response.assertHeader('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    const etag = response.header('etag')
    if (!etag) {
      throw new Error('Expected an ETag response header')
    }
    assert.match(etag, /^"[A-Za-z0-9_-]+"$/)
    response.assertBodyContains({
      data: {
        type: 'claim',
        id: 'fixture-claim-001',
      },
      evidenceStatus: 'documented',
      limitations: ['Fixture local para desarrollo; no debe incorporarse a un corpus histórico.'],
    })

    const body = response.body()
    assert.lengthOf(body.sources, 1)
    assert.equal(body.sources[0].locator.value, 'fixture-statement-001')
    assert.equal(body.sources[0].contentHash.length, 64)
    assert.equal(body.links.self, '/v1/claims/fixture-claim-001')
  })

  test('returns 304 for a matching If-None-Match validator', async ({ client }) => {
    const initial = await client.get('/v1/claims/fixture-claim-001')
    const etag = initial.header('etag')
    if (!etag) {
      throw new Error('Expected an ETag response header')
    }
    const response = await client.get('/v1/claims/fixture-claim-001').header('if-none-match', etag)

    response.assertStatus(304)
    response.assertHeader('etag', etag)
    response.assertBody({})
  })

  test('does not expose draft claim existence', async ({ client }) => {
    const response = await client.get('/v1/claims/fixture-draft-001')

    response.assertStatus(404)
    response.assertBodyContains({
      error: {
        code: 'E_NOT_FOUND',
        message: 'Claim not found',
        status: 404,
      },
    })
  })

  test('fails closed when a published record lacks evidence', async ({ client }) => {
    const response = await client.get('/v1/claims/fixture-invalid-001')

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'E_EVIDENCE_INSUFFICIENT',
        status: 422,
      },
    })
  })

  test('rejects an invalid identifier before repository lookup', async ({ client }) => {
    const response = await client.get('/v1/claims/%21invalid')

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'E_VALIDATION',
        status: 422,
        details: { field: 'id' },
      },
    })
  })

  test('returns a stable not-found error for unknown claims', async ({ client }) => {
    const response = await client.get('/v1/claims/unknown-claim')

    response.assertStatus(404)
    response.assertBodyContains({
      error: {
        code: 'E_NOT_FOUND',
        status: 404,
      },
    })
  })
})
