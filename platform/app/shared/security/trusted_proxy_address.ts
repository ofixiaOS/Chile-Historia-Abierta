import { isIP } from 'node:net'

/** Trust one fixed proxy peer only; unset configuration keeps forwarded headers untrusted. */
export function resolveTrustedProxyAddress(value: string | undefined): string | false {
  if (value === undefined || value === '') return false
  if (isIP(value) === 0) {
    throw new Error('TRUSTED_PROXY must be one exact IPv4 or IPv6 address')
  }
  return value
}
