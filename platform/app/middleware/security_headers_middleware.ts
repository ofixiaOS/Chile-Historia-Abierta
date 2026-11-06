import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'
import { strictTransportSecurityHeader } from '#shared/security/transport_security_policy'

export default class SecurityHeadersMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await next()

    ctx.response.header('X-Content-Type-Options', 'nosniff')
    ctx.response.header('X-Frame-Options', 'DENY')
    ctx.response.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    ctx.response.header(
      'Permissions-Policy',
      'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
    )
    const hsts = strictTransportSecurityHeader(env.get('NODE_ENV'))
    if (hsts) ctx.response.header('Strict-Transport-Security', hsts)
    if (ctx.request.url().split('?')[0] !== '/') {
      ctx.response.header(
        'Content-Security-Policy',
        "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
      )
    }
  }
}
