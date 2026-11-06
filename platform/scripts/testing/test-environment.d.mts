export type TestEnvironment = Record<string, string | undefined>
export function systemEnvironment(source: TestEnvironment): TestEnvironment
export function assertLocalDockerEndpoint(endpoint: string): void
export function assertTestEnvironment(environment: TestEnvironment): void
export function assertCompletedRun(
  output: string,
  suites: string[]
): { tests: number; aggregates: unknown }
export function assertDatabaseIdentity(
  environment: TestEnvironment,
  identity:
    | {
        database_name?: string
        database_user?: string
        run_id?: string
        token?: string
      }
    | undefined
): void
