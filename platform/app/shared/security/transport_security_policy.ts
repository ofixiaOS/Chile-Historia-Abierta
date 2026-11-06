export function strictTransportSecurityHeader(
  nodeEnv: 'development' | 'test' | 'production'
): string | undefined {
  return nodeEnv === 'production' ? 'max-age=15552000' : undefined
}
