import { test } from '@japa/runner'
import { readJsonBody, type ApiErrorResponse } from '#tests/helpers/http_json'

test.group('Community HTTP write boundary', () => {
  const publicationId = 'pub_test_community_1'

  test('keeps public comment and vote reads available', async ({ client }) => {
    const comments = await client.get(`/v1/publications/${publicationId}/comments`)
    comments.assertStatus(200)
    comments.assertBodyContains({ limit: 50, offset: 0, total: 0 })

    const votes = await client.get(`/v1/publications/${publicationId}/votes`)
    votes.assertStatus(200)
  })

  test('validates public comment pagination', async ({ client }) => {
    const tooLarge = await client.get(`/v1/publications/${publicationId}/comments?limit=101`)
    tooLarge.assertStatus(422)
    const repeated = await client.get(`/v1/publications/${publicationId}/comments?limit=1&limit=2`)
    repeated.assertStatus(422)
    const malformed = await client.get(`/v1/publications/${publicationId}/comments?offset=-1`)
    malformed.assertStatus(422)
  })

  test('denies comments with a client-supplied author', async ({ client, assert }) => {
    const response = await client.post(`/v1/publications/${publicationId}/comments`).json({
      author: { id: 'victim-id', displayName: 'Nombre ajeno' },
      commentType: 'comentario_general',
      content: 'Intento de atribuir contenido a una persona ajena.',
    })
    response.assertStatus(503)
    assert.equal(readJsonBody<ApiErrorResponse>(response).error.code, 'E_COMMUNITY_WRITES_DISABLED')

    const comments = await client.get(`/v1/publications/${publicationId}/comments`)
    assert.isEmpty(comments.body().data)
  })

  test('denies votes with a client-supplied user ID', async ({ client, assert }) => {
    const response = await client.post(`/v1/publications/${publicationId}/votes`).json({
      userId: 'victim-id',
      voteType: 'metodologia_rigurosa',
    })
    response.assertStatus(503)
    assert.equal(readJsonBody<ApiErrorResponse>(response).error.code, 'E_COMMUNITY_WRITES_DISABLED')

    const votes = await client.get(`/v1/publications/${publicationId}/votes`)
    assert.equal(votes.body().data.totalVotes, 0)
  })

  test('denies reports with a client-supplied reporter ID', async ({ client, assert }) => {
    const response = await client.post('/v1/reports').json({
      targetType: 'publication',
      targetId: publicationId,
      reporterId: 'victim-id',
      category: 'spam',
      justification: 'Intento de atribuir un reporte a una persona ajena.',
    })
    response.assertStatus(503)
    assert.equal(readJsonBody<ApiErrorResponse>(response).error.code, 'E_COMMUNITY_WRITES_DISABLED')
  })
})
