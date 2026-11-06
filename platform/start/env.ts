/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'
import {
  assertDatabaseCredentialPolicy,
  assertProductionPersistence,
} from '#shared/security/production_persistence_gate'

const env = await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  CHA_PROCESS_ROLE: Env.schema.enum.optional(['web', 'migration'] as const),
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  TRUSTED_PROXY: Env.schema.string.optional(),
  PILOT_EDITOR_TOKEN: Env.schema.string.optional(),
  PILOT_EDITOR_ID: Env.schema.string.optional(),
  PILOT_EDITOR_NAME: Env.schema.string.optional(),

  // Persistence
  CLAIM_REPOSITORY: Env.schema.enum(['memory', 'postgres'] as const),
  PUBLICATION_REPOSITORY: Env.schema.enum.optional(['memory', 'postgres'] as const),
  COMMUNITY_REPOSITORY: Env.schema.enum.optional(['memory', 'postgres'] as const),
  ASSISTANCE_RETRIEVER: Env.schema.enum.optional(['memory', 'postgres'] as const),
  STATISTICS_REPOSITORY: Env.schema.enum.optional(['memory', 'postgres'] as const),
  PLACE_REPOSITORY: Env.schema.enum.optional(['memory', 'postgres'] as const),
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_DATABASE: Env.schema.string(),
  DB_SSL_CA: Env.schema.string.optional(),
  DB_ADMIN_USER: Env.schema.string.optional(),
  DB_ADMIN_PASSWORD: Env.schema.secret.optional(),
  DB_PUBLIC_USER: Env.schema.string.optional(),
  DB_PUBLIC_PASSWORD: Env.schema.secret.optional(),
})

assertDatabaseCredentialPolicy(
  env.get('NODE_ENV'),
  env.get('CHA_PROCESS_ROLE'),
  env.get('DB_ADMIN_USER'),
  env.get('DB_ADMIN_PASSWORD')?.release(),
  env.get('DB_PUBLIC_USER'),
  env.get('DB_PUBLIC_PASSWORD')?.release()
)

assertProductionPersistence(env.get('NODE_ENV'), {
  claims: env.get('CLAIM_REPOSITORY'),
  publications: env.get('PUBLICATION_REPOSITORY'),
  community: env.get('COMMUNITY_REPOSITORY'),
  assistance: env.get('ASSISTANCE_RETRIEVER'),
  statistics: env.get('STATISTICS_REPOSITORY'),
  places: env.get('PLACE_REPOSITORY'),
})

export default env
