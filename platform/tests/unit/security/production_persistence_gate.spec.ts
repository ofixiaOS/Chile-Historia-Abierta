import {
  assertDatabaseCredentialPolicy,
  databaseTlsOptions,
  assertEditorialWritesAllowed,
  assertProductionHttpProcessRole,
  assertProductionPersistence,
  databaseAccessPolicy,
} from '#shared/security/production_persistence_gate'
import { test } from '@japa/runner'

test.group('Production persistence gate', () => {
  test('exige TLS con verificación en producción y permite conexiones locales sin TLS', ({
    assert,
  }) => {
    assert.isFalse(databaseTlsOptions('test'))
    assert.deepEqual(databaseTlsOptions('production'), { rejectUnauthorized: true })
    assert.deepEqual(
      databaseTlsOptions(
        'production',
        '-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----'
      ),
      {
        rejectUnauthorized: true,
        ca: '-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----',
      }
    )
  })

  test('permite memoria en desarrollo y pruebas', ({ assert }) => {
    assert.doesNotThrow(() => assertProductionPersistence('development', { claims: 'memory' }))
    assert.doesNotThrow(() => assertProductionPersistence('test', { claims: 'memory' }))
  })

  test('permite producción solo cuando todos los módulos usan PostgreSQL', ({ assert }) => {
    assert.doesNotThrow(() =>
      assertProductionPersistence('production', {
        claims: 'postgres',
        publications: 'postgres',
        community: 'postgres',
        assistance: 'postgres',
        statistics: 'postgres',
        places: 'postgres',
      })
    )
  })

  test('rechaza producción con repositorios de memoria o selectores ausentes', ({ assert }) => {
    assert.throws(
      () =>
        assertProductionPersistence('production', {
          claims: 'postgres',
          publications: 'memory',
          community: 'postgres',
          assistance: 'postgres',
          statistics: 'postgres',
          places: undefined,
        }),
      'Producción requiere PostgreSQL para todos los módulos públicos: publications, places'
    )
  })

  test('excluye credenciales administrativas de producción y las exige fuera de ella', ({
    assert,
  }) => {
    assert.doesNotThrow(() =>
      assertDatabaseCredentialPolicy(
        'production',
        'web',
        undefined,
        undefined,
        'cha_public',
        'secret'
      )
    )
    assert.throws(
      () =>
        assertDatabaseCredentialPolicy(
          'production',
          'web',
          'cha_owner',
          'secret',
          'cha_public',
          'secret'
        ),
      'El proceso web de producción no debe recibir credenciales administrativas de base de datos'
    )
    assert.throws(
      () =>
        assertDatabaseCredentialPolicy('test', 'web', undefined, undefined, 'cha_public', 'secret'),
      'Este proceso requiere credenciales administrativas para migraciones'
    )
    assert.doesNotThrow(() =>
      assertDatabaseCredentialPolicy(
        'production',
        'migration',
        'cha_owner',
        'secret',
        undefined,
        undefined
      )
    )
    assert.throws(
      () =>
        assertDatabaseCredentialPolicy(
          'production',
          'migration',
          undefined,
          undefined,
          undefined,
          undefined
        ),
      'Este proceso requiere credenciales administrativas para migraciones'
    )
    assert.throws(
      () =>
        assertDatabaseCredentialPolicy(
          'production',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ),
      'Producción requiere CHA_PROCESS_ROLE=web o CHA_PROCESS_ROLE=migration'
    )
  })

  test('exige credenciales públicas solo en web y las rechaza en migración de producción', ({
    assert,
  }) => {
    assert.doesNotThrow(() =>
      assertDatabaseCredentialPolicy(
        'production',
        'web',
        undefined,
        undefined,
        'cha_public',
        'secret'
      )
    )
    assert.throws(
      () =>
        assertDatabaseCredentialPolicy(
          'production',
          'web',
          undefined,
          undefined,
          undefined,
          undefined
        ),
      'El proceso web de producción requiere credenciales PostgreSQL públicas'
    )
    assert.throws(
      () =>
        assertDatabaseCredentialPolicy(
          'production',
          'migration',
          'cha_owner',
          'secret',
          'cha_public',
          'secret'
        ),
      'El proceso de migración de producción no debe recibir credenciales públicas de base de datos'
    )
    assert.throws(
      () =>
        assertDatabaseCredentialPolicy(
          'production',
          'web',
          undefined,
          undefined,
          'cha_public',
          undefined
        ),
      'DB_PUBLIC_USER y DB_PUBLIC_PASSWORD deben configurarse juntos'
    )
    assert.doesNotThrow(() =>
      assertDatabaseCredentialPolicy('test', 'web', 'cha_owner', 'secret', 'cha_public', 'secret')
    )
  })

  test('usa solo conexión pública como predeterminada en producción', ({ assert }) => {
    assert.deepEqual(databaseAccessPolicy('production', 'web'), {
      defaultConnection: 'public',
      includeAdminConnection: false,
      includePublicConnection: true,
    })
    assert.deepEqual(databaseAccessPolicy('production', 'migration'), {
      defaultConnection: 'admin',
      includeAdminConnection: true,
      includePublicConnection: false,
    })
    assert.deepEqual(databaseAccessPolicy('test', undefined), {
      defaultConnection: 'admin',
      includeAdminConnection: true,
      includePublicConnection: true,
    })
  })

  test('impide ejecutar el entrypoint HTTP con rol de migración en producción', ({ assert }) => {
    assert.doesNotThrow(() => assertProductionHttpProcessRole('production', 'web'))
    assert.throws(
      () => assertProductionHttpProcessRole('production', 'migration'),
      'El servidor HTTP de producción requiere CHA_PROCESS_ROLE=web'
    )
  })

  test('mantiene deshabilitada la escritura editorial HTTP en producción', ({ assert }) => {
    assert.doesNotThrow(() => assertEditorialWritesAllowed('test'))
    assert.throws(
      () => assertEditorialWritesAllowed('production'),
      'La escritura editorial HTTP está deshabilitada en producción hasta aislar el proceso escritor'
    )
  })
})
