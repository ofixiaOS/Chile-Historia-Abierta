import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'
import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'
import { assertDatabaseIdentity } from '../scripts/testing/test-environment.mjs'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */
declare module '@japa/api-client/types' {
  interface RoutesRegistry extends Registry {}
}

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [assert(), pluginAdonisJS(app), apiClient()]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
  if (suite.name === 'integration') {
    return suite.setup(async () => {
      const { default: db } = await import('@adonisjs/lucid/services/db')
      const result = await db.connection('admin').rawQuery(
        `SELECT current_database() AS database_name, current_user AS database_user,
                run_id, token FROM public.cha_test_identity`
      )
      if (result.rows.length !== 1) throw new Error('E_TEST_DATABASE_IDENTITY: marcador inválido')
      assertDatabaseIdentity(process.env, result.rows[0])
      const aceModule = await import('@adonisjs/core/services/ace')
      await aceModule.default.exec('migration:run', ['--force'])
    })
  }
}
