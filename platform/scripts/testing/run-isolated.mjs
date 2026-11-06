import { randomBytes } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import net from 'node:net'
import {
  assertCompletedRun,
  assertLocalDockerEndpoint,
  assertTestEnvironment,
  systemEnvironment,
} from './test-environment.mjs'

const exec = promisify(execFile)
const root = fileURLToPath(new URL('../../', import.meta.url))
const runId = randomBytes(16).toString('hex')
const token = () => randomBytes(32).toString('hex')
const baseEnv = systemEnvironment(process.env)
const container = `cha_test_${runId}`
const database = container
const secrets = Array.from({ length: 6 }, token)
const redact = (value) =>
  secrets.reduce((output, secret) => output.replaceAll(secret, '[REDACTED]'), String(value))
let containerAttempted = false

async function command(file, args, environment = baseEnv, input) {
  const pending = exec(file, args, {
    cwd: root,
    env: environment,
    windowsHide: true,
    timeout: 600000,
    maxBuffer: 20 * 1024 * 1024,
  })
  if (input !== undefined) pending.child.stdin.end(input)
  return pending
}

async function freeHttpPort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = server.address().port
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
  return String(port)
}

async function main() {
  const suites = process.argv.slice(2)
  if (suites.some((suite) => !['unit', 'functional', 'integration'].includes(suite))) {
    throw new Error('Suites admitidas: unit functional integration')
  }
  const selected = new Set(suites.length ? suites : ['unit', 'functional', 'integration'])
  const { stdout: dockerEndpoint } = await command('docker', [
    'context',
    'inspect',
    '--format',
    '{{.Endpoints.docker.Host}}',
  ])
  assertLocalDockerEndpoint(dockerEndpoint)
  await mkdir(path.join(root, 'tmp'), { recursive: true })
  const artifacts = await mkdtemp(path.join(root, 'tmp', 'isolated-tests-'))
  const envPath = path.join(artifacts, 'env')
  await mkdir(envPath)
  console.log(`[TEST] Evidencia local: ${artifacts}`)
  try {
    containerAttempted = true
    await command(
      'docker',
      [
        'run',
        '--detach',
        '--name',
        container,
        '--label',
        `cha.test-run=${runId}`,
        '--publish',
        '127.0.0.1::5432',
        '--env',
        'POSTGRES_PASSWORD',
        '--env',
        `POSTGRES_DB=${database}`,
        'postgres:16-alpine',
      ],
      { ...baseEnv, POSTGRES_PASSWORD: secrets[0] }
    )
    let ready = false
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        await command('docker', [
          'exec',
          container,
          'pg_isready',
          '-U',
          'postgres',
          '-h',
          '127.0.0.1',
          '-q',
        ])
        ready = true
        break
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
    if (!ready) throw new Error('PostgreSQL desechable no disponible')
    const { stdout: binding } = await command('docker', ['port', container, '5432/tcp'])
    const pgPort = /^127\.0\.0\.1:(\d+)\s*$/.exec(binding)?.[1]
    const { stdout: label } = await command('docker', [
      'inspect',
      '--format',
      '{{index .Config.Labels "cha.test-run"}}',
      container,
    ])
    if (!pgPort || label.trim() !== runId) throw new Error('Identidad o puerto Docker no coincide')
    const httpPort = await freeHttpPort()
    const environment = {
      ...baseEnv,
      NODE_ENV: 'test',
      TZ: 'UTC',
      ENV_PATH: envPath,
      NODE_OPTIONS: `--require="${path.join(root, 'scripts/testing/block-external-network.cjs').replaceAll('\\', '/')}"`,
      CHA_TEST_RUN_ID: runId,
      CHA_TEST_DATABASE_TOKEN: secrets[3],
      HOST: '127.0.0.1',
      PORT: httpPort,
      APP_URL: `http://127.0.0.1:${httpPort}`,
      APP_KEY: secrets[4],
      LOG_LEVEL: 'warn',
      LLM_PROVIDER: 'deterministic',
      PILOT_EDITOR_TOKEN: secrets[5],
      PILOT_EDITOR_ID: 'pilot-editor-test',
      PILOT_EDITOR_NAME: 'Editor de prueba',
      DB_HOST: '127.0.0.1',
      DB_PORT: pgPort,
      DB_DATABASE: database,
      DB_ADMIN_USER: 'cha_owner',
      DB_ADMIN_PASSWORD: secrets[1],
      DB_PUBLIC_USER: 'cha_public',
      DB_PUBLIC_PASSWORD: secrets[2],
      CLAIM_REPOSITORY: 'memory',
      PUBLICATION_REPOSITORY: 'memory',
      COMMUNITY_REPOSITORY: 'memory',
      ASSISTANCE_RETRIEVER: 'memory',
      STATISTICS_REPOSITORY: 'memory',
      PLACE_REPOSITORY: 'memory',
      REGULATORY_REPOSITORY: 'memory',
    }
    assertTestEnvironment(environment)
    // Only generated hexadecimal values enter SQL; no inherited URL, password or database name.
    await command(
      'docker',
      ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'],
      baseEnv,
      `
      CREATE ROLE cha_owner LOGIN PASSWORD '${secrets[1]}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
      CREATE ROLE cha_public LOGIN PASSWORD '${secrets[2]}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
      ALTER DATABASE ${database} OWNER TO cha_owner;
      ALTER SCHEMA public OWNER TO cha_owner;
      GRANT CONNECT ON DATABASE ${database} TO cha_owner, cha_public;
      GRANT USAGE ON SCHEMA public TO cha_public;
      CREATE TABLE public.cha_test_identity (run_id text NOT NULL, token text NOT NULL);
      INSERT INTO public.cha_test_identity VALUES ('${runId}', '${secrets[3]}');
      REVOKE ALL ON public.cha_test_identity FROM PUBLIC;
      GRANT SELECT ON public.cha_test_identity TO cha_owner;
    `
    )
    async function stage(name, requestedSuites) {
      console.log(`[TEST] ${name}`)
      try {
        const result = await command(
          process.execPath,
          [
            '--import=@poppinss/ts-exec',
            '--enable-source-maps',
            'bin/test.ts',
            ...requestedSuites,
            '--reporters=ndjson',
          ],
          environment
        )
        const output = redact(result.stdout + result.stderr)
        await writeFile(path.join(artifacts, `${name}.log`), output)
        const summary = assertCompletedRun(result.stdout, requestedSuites)
        console.log(
          `[TEST] ${name}: ${summary.tests} pruebas completadas; ${JSON.stringify(summary.aggregates)}`
        )
      } catch (error) {
        const output = redact((error.stdout ?? '') + (error.stderr ?? ''))
        if (output) await writeFile(path.join(artifacts, `${name}.log`), output)
        console.error(output.slice(-6000))
        throw new Error(
          `Falló ${name}; ${error.message}; código ${error.code ?? 'desconocido'}, señal ${error.signal ?? 'ninguna'}; ver log local`
        )
      }
    }
    const memorySuites = ['unit', 'functional'].filter((suite) => selected.has(suite))
    if (memorySuites.length) await stage('unit-functional', memorySuites)
    if (selected.has('integration')) await stage('integration', ['integration'])
  } finally {
    if (containerAttempted) {
      // Exact name and ownership label; never enumerate or remove unrelated containers.
      const { stdout: label } = await command('docker', [
        'inspect',
        '--format',
        '{{index .Config.Labels "cha.test-run"}}',
        container,
      ])
      if (label.trim() !== runId) throw new Error('Se rechaza limpiar un contenedor ajeno')
      await command('docker', ['rm', '--force', '--volumes', container])
      console.log('[TEST] PostgreSQL desechable eliminado')
    }
  }
}

main().catch((error) => {
  console.error(redact(error.message))
  process.exitCode = 1
})
