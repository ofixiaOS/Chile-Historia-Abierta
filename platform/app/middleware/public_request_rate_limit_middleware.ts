import ApiError from '#shared/errors/api_error'
import { FixedWindowRateLimiter } from '#shared/security/fixed_window_rate_limiter'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const limiter = new FixedWindowRateLimiter()

export default class PublicRequestRateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const route = ctx.route?.pattern
    if (!route) return next()

    const ip = ctx.request.ip() || 'unknown'
    const decision = limiter.consume(`${route}:${ip}`, 60, 60_000)

    if (!decision.allowed) {
      ctx.response.header('retry-after', String(decision.retryAfterSeconds))
      throw new ApiError('E_RATE_LIMITED', 'Límite de solicitudes alcanzado', 429, {
        retryAfterSeconds: decision.retryAfterSeconds,
      })
    }

    return next()
  }
}
