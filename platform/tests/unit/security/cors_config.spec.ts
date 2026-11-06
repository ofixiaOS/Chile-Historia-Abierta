import corsConfig from '#config/cors'
import { test } from '@japa/runner'

test.group('CORS configuration', () => {
  test('disables credentials and permits only implemented browser methods and headers', ({
    assert,
  }) => {
    assert.isFalse(corsConfig.credentials)
    assert.deepEqual(corsConfig.methods, ['GET', 'HEAD', 'POST'])
    assert.deepEqual(corsConfig.headers, [
      'Content-Type',
      'Authorization',
      'If-None-Match',
      'If-Match',
    ])
  })
})
