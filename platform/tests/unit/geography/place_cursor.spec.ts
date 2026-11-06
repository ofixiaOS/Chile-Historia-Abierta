import { decodePlaceCursor, encodePlaceCursor } from '#modules/geography/application/place_cursor'
import { test } from '@japa/runner'

test.group('Place pagination cursor', () => {
  test('round-trips a stable keyset position', ({ assert }) => {
    const position = { fromYear: 1810, id: 'place-1' }
    assert.deepEqual(decodePlaceCursor(encodePlaceCursor(position)), position)
  })

  test('rejects malformed, oversized, and structurally invalid cursors', ({ assert }) => {
    assert.throws(() => decodePlaceCursor('not a cursor'), /Invalid pagination cursor/)
    assert.throws(() => decodePlaceCursor('e30'), /Invalid pagination cursor/)
    assert.throws(() => decodePlaceCursor('a'.repeat(4097)), /Invalid pagination cursor/)
  })
})
