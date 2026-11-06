import path from 'node:path'
import { createHash, timingSafeEqual } from 'node:crypto'

const digest = (value) =>
  createHash('sha256')
    .update(typeof value === 'string' ? value : '')
    .digest()

const systemKeys = new Set([
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'WINDIR',
  'COMSPEC',
  'TEMP',
  'TMP',
  'HOME',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'CI',
  'TERM',
  'LANG',
])

export function systemEnvironment(source) {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => systemKeys.has(key.toUpperCase()))
  )
}

export function assertLocalDockerEndpoint(endpoint) {
  if (!/^(unix:\/\/\/|npipe:\/\/\/\/\.\/pipe\/)/.test(endpoint.trim())) {
    throw new Error('E_TEST_DOCKER_ENDPOINT: se requiere Docker local por socket o named pipe')
  }
}

export function assertTestEnvironment(environment) {
  const fail = () => {
    throw new Error('E_TEST_DESTINATION: use npm run test:isolated; destino no autorizado')
  }
  if (environment.NODE_ENV !== 'test') fail()
  if (!/^[a-f0-9]{32}$/.test(environment.CHA_TEST_RUN_ID ?? '')) fail()
  if (!/^[a-f0-9]{64}$/.test(environment.CHA_TEST_DATABASE_TOKEN ?? '')) fail()
  if (environment.DB_DATABASE !== `cha_test_${environment.CHA_TEST_RUN_ID}`) fail()
  if (environment.DB_HOST !== '127.0.0.1') fail()
  const port = Number(environment.DB_PORT)
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5432) fail()
  if (environment.DB_ADMIN_USER !== 'cha_owner' || environment.DB_PUBLIC_USER !== 'cha_public')
    fail()
  if (!environment.ENV_PATH || !path.isAbsolute(environment.ENV_PATH)) fail()
  if (environment.LLM_PROVIDER !== 'deterministic') fail()
}

/** Query the connected server before migrations; a test-like database name is insufficient. */
export function assertDatabaseIdentity(environment, identity) {
  assertTestEnvironment(environment)
  if (
    identity?.database_name !== environment.DB_DATABASE ||
    identity?.run_id !== environment.CHA_TEST_RUN_ID ||
    !timingSafeEqual(digest(identity?.token), digest(environment.CHA_TEST_DATABASE_TOKEN)) ||
    identity?.database_user !== 'cha_owner'
  ) {
    throw new Error('E_TEST_DATABASE_IDENTITY: la base conectada no pertenece a esta ejecución')
  }
}

export function assertCompletedRun(output, suites) {
  const events = output.split(/\r?\n/).flatMap((line) => {
    try {
      return [JSON.parse(line)]
    } catch {
      return []
    }
  })
  const summary = events.findLast(
    (event) => event.aggregates && typeof event.hasError === 'boolean'
  )
  const tests = events.filter((event) => event.event === 'test:end')
  if (
    !summary ||
    summary.hasError ||
    tests.length === 0 ||
    tests.some((event) => event.isFailing || event.isSkipped || event.isTodo || event.isPinned) ||
    suites.some(
      (suite) =>
        !events.some(
          (event) => event.event === 'suite:end' && event.name === suite && !event.hasError
        )
    )
  )
    throw new Error('E_TEST_INCOMPLETE: no se completaron todas las pruebas y suites solicitadas')
  return { tests: tests.length, aggregates: summary.aggregates }
}
