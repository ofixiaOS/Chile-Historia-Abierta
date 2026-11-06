import { FixedWindowRateLimiter } from '#shared/security/fixed_window_rate_limiter'
import { test } from '@japa/runner'

test.group('Fixed window rate limiter', () => {
  test('permite hasta el límite, informa espera y reinicia la ventana', ({ assert }) => {
    let now = 1_000
    const limiter = new FixedWindowRateLimiter(10, () => now)

    assert.isTrue(limiter.consume('route:ip', 2, 60_000).allowed)
    assert.isTrue(limiter.consume('route:ip', 2, 60_000).allowed)
    assert.deepEqual(limiter.consume('route:ip', 2, 60_000), {
      allowed: false,
      retryAfterSeconds: 60,
    })

    now += 60_000
    assert.isTrue(limiter.consume('route:ip', 2, 60_000).allowed)
  })

  test('rechaza claves nuevas cuando su almacenamiento acotado está lleno', ({ assert }) => {
    let now = 10_000
    const limiter = new FixedWindowRateLimiter(1, () => now)
    assert.isTrue(limiter.consume('first', 1, 60_000).allowed)
    assert.isFalse(limiter.consume('second', 1, 60_000).allowed)

    now += 60_000
    assert.isTrue(limiter.consume('second', 1, 60_000).allowed)
  })
})
