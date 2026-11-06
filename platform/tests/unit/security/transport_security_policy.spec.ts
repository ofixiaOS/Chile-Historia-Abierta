import { test } from '@japa/runner'
import { strictTransportSecurityHeader } from '#shared/security/transport_security_policy'

test.group('Production transport security headers', () => {
  test('sends HSTS in production with bounded host scope', ({ assert }) => {
    assert.equal(strictTransportSecurityHeader('production'), 'max-age=15552000')
    assert.notInclude(strictTransportSecurityHeader('production')!, 'includeSubDomains')
    assert.notInclude(strictTransportSecurityHeader('production')!, 'preload')
  })

  test('omits HSTS in development and tests', ({ assert }) => {
    assert.isUndefined(strictTransportSecurityHeader('development'))
    assert.isUndefined(strictTransportSecurityHeader('test'))
  })
})
