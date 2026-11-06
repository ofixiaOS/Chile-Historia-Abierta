import { createStrongEtag, requestMatchesEtag } from '#shared/http/etag'
import { test } from '@japa/runner'

test.group('HTTP ETag', () => {
  test('creates a stable strong ETag', ({ assert }) => {
    const first = createStrongEtag('claim:revision:1')
    const second = createStrongEtag('claim:revision:1')

    assert.equal(first, second)
    assert.match(first, /^"[A-Za-z0-9_-]+"$/)
  })

  test('matches lists, wildcard and weak validators', ({ assert }) => {
    const etag = createStrongEtag('claim:revision:1')

    assert.isTrue(requestMatchesEtag(`"other", ${etag}`, etag))
    assert.isTrue(requestMatchesEtag('*', etag))
    assert.isTrue(requestMatchesEtag(`W/${etag}`, etag))
    assert.isFalse(requestMatchesEtag(undefined, etag))
  })
})
