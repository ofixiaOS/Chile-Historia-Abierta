import { decodeCursor, encodeCursor } from '#shared/http/cursor'
import { test } from '@japa/runner'

test.group('HTTP Pagination Cursor (Unit)', () => {
  test('encodes and decodes cursor payload roundtrip', ({ assert }) => {
    const original = {
      publishedAt: '2026-09-22T14:30:00.000Z',
      id: 'claim-uuid-1234',
    }

    const encoded = encodeCursor(original)
    assert.isString(encoded)
    assert.notInclude(encoded, '=')

    const decoded = decodeCursor(encoded)
    assert.deepEqual(decoded, original)
  })

  test('rejects empty, malformed or invalid base64 cursors with E_VALIDATION', ({ assert }) => {
    const invalidInputs = [
      '',
      '   ',
      'not-a-json',
      Buffer.from('plain text').toString('base64url'),
      Buffer.from(JSON.stringify({ other: 123 })).toString('base64url'),
      Buffer.from(JSON.stringify({ p: 'invalid-date', i: '123' })).toString('base64url'),
      Buffer.from(JSON.stringify({ p: '2026-09-22T14:30:00.000Z', i: '   ' })).toString(
        'base64url'
      ),
    ]

    for (const input of invalidInputs) {
      assert.throws(() => decodeCursor(input), /Invalid pagination cursor/)
    }
  })
})
