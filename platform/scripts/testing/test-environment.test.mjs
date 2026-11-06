import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  assertCompletedRun,
  assertLocalDockerEndpoint,
  assertDatabaseIdentity,
  assertTestEnvironment,
  systemEnvironment,
} from './test-environment.mjs'

const runId = 'a'.repeat(32)
test('a stored remote Docker context is rejected even after filtering environment overrides', () => {
  assert.doesNotThrow(() => assertLocalDockerEndpoint('unix:///var/run/docker.sock\n'))
  assert.doesNotThrow(() => assertLocalDockerEndpoint('npipe:////./pipe/dockerDesktopLinuxEngine'))
  for (const endpoint of [
    '',
    'ssh://production.invalid',
    'tcp://production.invalid:2376',
    'tcp://127.0.0.1:2375',
  ]) {
    assert.throws(() => assertLocalDockerEndpoint(endpoint), /E_TEST_DOCKER_ENDPOINT/)
  }
})
test('zero exit code cannot hide startup errors, empty runs or missing suites', () => {
  const records = [
    { event: 'test:end', isFailing: false },
    { event: 'suite:end', name: 'unit', hasError: false },
    { aggregates: { passed: 1 }, hasError: false },
  ]
  const encode = (values) => values.map((value) => JSON.stringify(value)).join('\n')
  assert.equal(assertCompletedRun(encode(records), ['unit']).tests, 1)
  for (const output of [
    '',
    'Error: startup failed',
    encode(records.slice(0, 2)),
    encode(records.slice(1)),
  ]) {
    assert.throws(() => assertCompletedRun(output, ['unit']), /E_TEST_INCOMPLETE/)
  }
  assert.throws(
    () => assertCompletedRun(encode(records), ['unit', 'functional']),
    /E_TEST_INCOMPLETE/
  )
  for (const flag of ['isFailing', 'isSkipped', 'isTodo', 'isPinned']) {
    assert.throws(
      () =>
        assertCompletedRun(encode([{ ...records[0], [flag]: true }, ...records.slice(1)]), [
          'unit',
        ]),
      /E_TEST_INCOMPLETE/
    )
  }
  assert.throws(
    () =>
      assertCompletedRun(encode([...records.slice(0, 2), { aggregates: {}, hasError: true }]), [
        'unit',
      ]),
    /E_TEST_INCOMPLETE/
  )
})
const environment = {
  NODE_ENV: 'test',
  CHA_TEST_RUN_ID: runId,
  CHA_TEST_DATABASE_TOKEN: 'b'.repeat(64),
  DB_HOST: '127.0.0.1',
  DB_PORT: '49152',
  DB_DATABASE: `cha_test_${runId}`,
  DB_ADMIN_USER: 'cha_owner',
  DB_PUBLIC_USER: 'cha_public',
  ENV_PATH: fileURLToPath(new URL('../../tmp/isolated-test/env', import.meta.url)),
  LLM_PROVIDER: 'deterministic',
}

test('inherited application settings, credentials and execution hooks are discarded', () => {
  assert.deepEqual(
    systemEnvironment({
      PATH: '/usr/bin',
      SystemRoot: 'C:/Windows',
      NODE_OPTIONS: '--require=malicious.cjs',
      DB_HOST: 'production.invalid',
      DB_DATABASE: 'customers',
      DATABASE_URL: 'private',
      GEMINI_API_KEY: 'secret',
      ENV_PATH: '/production',
      PGHOST: 'production.invalid',
      DOCKER_HOST: 'tcp://production.invalid:2375',
    }),
    { PATH: '/usr/bin', SystemRoot: 'C:/Windows' }
  )
})

test('direct Japa entrypoint rejects an inherited destination before application startup', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  assert.throws(
    () =>
      execFileSync(process.execPath, ['--import=@poppinss/ts-exec', 'bin/test.ts', 'integration'], {
        cwd: root,
        env: { ...systemEnvironment(process.env), NODE_ENV: 'test', DB_HOST: 'production.invalid' },
        encoding: 'utf8',
        timeout: 10000,
        windowsHide: true,
        stdio: 'pipe',
      }),
    (error) => error.status !== 0 && /E_TEST_DESTINATION/.test(String(error.stderr))
  )
})

test('only an explicit disposable test environment passes the guard', () => {
  assert.doesNotThrow(() => assertTestEnvironment(environment))
  for (const override of [
    { NODE_ENV: 'production' },
    { CHA_TEST_RUN_ID: undefined },
    { CHA_TEST_DATABASE_TOKEN: undefined },
    { DB_HOST: 'localhost' },
    { DB_HOST: '192.0.2.1' },
    { DB_PORT: '5432' },
    { DB_PORT: 'NaN' },
    { DB_PORT: '65536' },
    { DB_DATABASE: 'chile_historia_abierta_test' },
    { DB_DATABASE: 'customers' },
    { ENV_PATH: undefined },
    { ENV_PATH: 'relative' },
    { DB_ADMIN_USER: 'postgres' },
    { DB_PUBLIC_USER: 'cha_owner' },
    { LLM_PROVIDER: 'gemini' },
  ])
    assert.throws(
      () => assertTestEnvironment({ ...environment, ...override }),
      /E_TEST_DESTINATION/
    )
})

test('a plausible test name is insufficient without the connected database marker', () => {
  const identity = {
    database_name: environment.DB_DATABASE,
    database_user: 'cha_owner',
    run_id: runId,
    token: environment.CHA_TEST_DATABASE_TOKEN,
  }
  assert.doesNotThrow(() => assertDatabaseIdentity(environment, identity))
  for (const override of [
    { database_name: 'customers' },
    { database_user: 'postgres' },
    { run_id: 'c'.repeat(32) },
    { token: 'd'.repeat(64) },
  ])
    assert.throws(
      () => assertDatabaseIdentity(environment, { ...identity, ...override }),
      /E_TEST_DATABASE_IDENTITY/
    )
  assert.throws(() => assertDatabaseIdentity(environment, undefined), /E_TEST_DATABASE_IDENTITY/)
})

test('external fetch, direct IP sockets and DNS are rejected before contacting a provider', () => {
  const preload = fileURLToPath(new URL('./block-external-network.cjs', import.meta.url))
  const output = execFileSync(
    process.execPath,
    [
      '--require',
      preload,
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict'
    import net from 'node:net'
    import dns from 'node:dns'
    assert.throws(() => fetch('https://example.invalid/'), /E_TEST_EXTERNAL_NETWORK/)
    assert.throws(() => net.connect({ host: '192.0.2.1', port: 443 }), /E_TEST_EXTERNAL_NETWORK/)
    assert.throws(() => dns.lookup('example.invalid', () => {}), /E_TEST_EXTERNAL_NETWORK/)
    await assert.rejects(dns.promises.lookup('example.invalid'), /E_TEST_EXTERNAL_NETWORK/)
    console.log('external requests rejected')
  `,
    ],
    { env: systemEnvironment(process.env), encoding: 'utf8', timeout: 10000, windowsHide: true }
  )
  assert.match(output, /external requests rejected/)
})
