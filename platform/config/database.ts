import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'
import {
  databaseAccessPolicy,
  databaseTlsOptions,
} from '#shared/security/production_persistence_gate'

const accessPolicy = databaseAccessPolicy(env.get('NODE_ENV'), env.get('CHA_PROCESS_ROLE'))

const commonConnection = {
  host: env.get('DB_HOST'),
  port: env.get('DB_PORT'),
  database: env.get('DB_DATABASE'),
  ssl: databaseTlsOptions(env.get('NODE_ENV'), env.get('DB_SSL_CA')),
}

const publicConnection = accessPolicy.includePublicConnection
  ? {
      client: 'pg' as const,
      connection: {
        ...commonConnection,
        user: env.get('DB_PUBLIC_USER')!,
        password: env.get('DB_PUBLIC_PASSWORD')!.release(),
      },
    }
  : undefined

const adminConnection = accessPolicy.includeAdminConnection
  ? {
      client: 'pg' as const,
      connection: {
        ...commonConnection,
        user: env.get('DB_ADMIN_USER')!,
        password: env.get('DB_ADMIN_PASSWORD')!.release(),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      schemaGeneration: {
        enabled: false,
      },
    }
  : undefined

const dbConfig = defineConfig({
  connection: accessPolicy.defaultConnection,
  connections: {
    ...(adminConnection ? { admin: adminConnection } : {}),
    ...(publicConnection ? { public: publicConnection } : {}),
  },
})

export default dbConfig
