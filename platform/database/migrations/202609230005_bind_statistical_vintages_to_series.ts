import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      ALTER TABLE series_vintages
        ADD CONSTRAINT series_vintages_id_series_id_unique UNIQUE (id, series_id);

      ALTER TABLE statistical_series
        ADD CONSTRAINT statistical_series_current_vintage_same_series_fk
          FOREIGN KEY (current_vintage_id, id)
          REFERENCES series_vintages (id, series_id)
          DEFERRABLE INITIALLY DEFERRED;

      ALTER TABLE forecast_runs
        ADD CONSTRAINT forecast_runs_target_vintage_same_series_fk
          FOREIGN KEY (target_vintage_id, series_id)
          REFERENCES series_vintages (id, series_id);
    `)
  }

  async down() {
    throw new Error(
      'Forward-only security migration: cross-series vintage references must remain blocked'
    )
  }
}
