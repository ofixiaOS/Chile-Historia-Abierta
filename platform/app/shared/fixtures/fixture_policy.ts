/** The bundled examples are test fixtures, never a public corpus. */
export function shouldSeedFixtures(nodeEnvironment: string): boolean {
  return nodeEnvironment === 'test'
}
