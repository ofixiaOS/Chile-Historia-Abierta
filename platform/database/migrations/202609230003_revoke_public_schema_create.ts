import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;

      DO $privilege$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cha_public') THEN
          REVOKE CREATE ON SCHEMA public FROM cha_public;
        END IF;
      END
      $privilege$;
    `)
  }

  async down() {
    throw new Error(
      'This security migration is forward-only; reverting it would restore schema creation privileges.'
    )
  }
}
