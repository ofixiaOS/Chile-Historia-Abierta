// Test-process guard, not an OS sandbox. Mocks can replace fetch; providers must never be called.
const net = require('node:net')
const dns = require('node:dns')
const { syncBuiltinESMExports } = require('node:module')
const allowed = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const rejectExternal = (host) => {
  if (host && !allowed.has(String(host).toLowerCase())) {
    throw new Error('E_TEST_EXTERNAL_NETWORK: conexión externa bloqueada')
  }
}
const originalConnect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0] : args
  const target = options[0]
  if (target && typeof target === 'object') rejectExternal(target.host)
  else if (typeof options[1] === 'string') rejectExternal(options[1])
  return originalConnect.apply(this, args)
}
const originalLookup = dns.lookup
dns.lookup = function (hostname, ...args) {
  rejectExternal(hostname)
  return originalLookup.call(this, hostname, ...args)
}
const originalPromiseLookup = dns.promises.lookup
dns.promises.lookup = async function (hostname, ...args) {
  rejectExternal(hostname)
  return originalPromiseLookup.call(this, hostname, ...args)
}
const originalFetch = globalThis.fetch
globalThis.fetch = function (input, ...args) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  rejectExternal(url.hostname)
  return originalFetch.call(this, input, ...args)
}
syncBuiltinESMExports()
