import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      ALTER TABLE series_vintages
        ADD CONSTRAINT series_vintages_observations_count_bound_check
          CHECK (jsonb_array_length(observations) BETWEEN 1 AND 10000),
        ADD CONSTRAINT series_vintages_observations_size_bound_check
          CHECK (octet_length(observations::text) <= 2097152)
    `)
  }

  async down() {
    throw new Error('Forward-only security migration: vintage payload bounds must remain enforced')
  }
}
