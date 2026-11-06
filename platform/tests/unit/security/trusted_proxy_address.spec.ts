import { test } from '@japa/runner'
import { resolveTrustedProxyAddress } from '#shared/security/trusted_proxy_address'

test.group('Trusted proxy address configuration', () => {
  test('does not trust forwarded headers when no proxy address is configured', ({ assert }) => {
    assert.isFalse(resolveTrustedProxyAddress(undefined))
    assert.isFalse(resolveTrustedProxyAddress(''))
  })

  test('accepts one exact IPv4 or IPv6 proxy peer', ({ assert }) => {
    assert.equal(resolveTrustedProxyAddress('127.0.0.1'), '127.0.0.1')
    assert.equal(resolveTrustedProxyAddress('2001:db8::1'), '2001:db8::1')
  })

  test('rejects CIDRs, hostnames, wildcards, lists, and whitespace', ({ assert }) => {
    for (const value of ['127.0.0.0/8', 'localhost', '*', '0.0.0.0/0', '127.0.0.1,10.0.0.1', ' ']) {
      assert.throws(() => resolveTrustedProxyAddress(value), 'TRUSTED_PROXY must be one exact')
    }
  })
})
