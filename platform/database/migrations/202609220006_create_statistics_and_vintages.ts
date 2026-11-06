import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE TABLE statistical_series (
        id text PRIMARY KEY,
        concept text NOT NULL,
        provider_agency text NOT NULL,
        source_id text NOT NULL,
        frequency text NOT NULL,
        base_unit text NOT NULL,
        methodology text NOT NULL,
        current_vintage_id text,
        limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT statistical_series_id_check CHECK (length(trim(id)) > 0),
        CONSTRAINT statistical_series_concept_check CHECK (length(trim(concept)) > 0),
        CONSTRAINT statistical_series_provider_check CHECK (length(trim(provider_agency)) > 0),
        CONSTRAINT statistical_series_source_id_check CHECK (length(trim(source_id)) > 0),
        CONSTRAINT statistical_series_frequency_check CHECK (frequency IN (
          'daily', 'monthly', 'quarterly', 'annual'
        )),
        CONSTRAINT statistical_series_base_unit_check CHECK (length(trim(base_unit)) > 0),
        CONSTRAINT statistical_series_methodology_check CHECK (length(trim(methodology)) > 0),
        CONSTRAINT statistical_series_limitations_check CHECK (jsonb_typeof(limitations) = 'array')
      );

      CREATE TABLE series_vintages (
        id text PRIMARY KEY,
        series_id text NOT NULL REFERENCES statistical_series(id),
        vintage_date timestamptz NOT NULL,
        coverage_start text NOT NULL,
        coverage_end text NOT NULL,
        observations jsonb NOT NULL,
        content_hash char(64) NOT NULL,
        publication_notes text,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT series_vintages_id_check CHECK (length(trim(id)) > 0),
        CONSTRAINT series_vintages_coverage_start_check CHECK (length(trim(coverage_start)) > 0),
        CONSTRAINT series_vintages_coverage_end_check CHECK (length(trim(coverage_end)) > 0),
        CONSTRAINT series_vintages_observations_check CHECK (jsonb_typeof(observations) = 'array'),
        CONSTRAINT series_vintages_content_hash_check CHECK (content_hash ~ '^[0-9a-f]{64}$')
      );

      ALTER TABLE statistical_series
        ADD CONSTRAINT fk_statistical_series_current_vintage
        FOREIGN KEY (current_vintage_id) REFERENCES series_vintages(id) DEFERRABLE INITIALLY DEFERRED;

      CREATE TABLE forecast_runs (
        id text PRIMARY KEY,
        series_id text NOT NULL REFERENCES statistical_series(id),
        target_vintage_id text NOT NULL REFERENCES series_vintages(id),
        model_name text NOT NULL,
        baseline_model text NOT NULL,
        split_period text NOT NULL,
        metric text NOT NULL,
        model_metric_value double precision NOT NULL,
        baseline_metric_value double precision NOT NULL,
        beats_baseline boolean NOT NULL,
        forecast_horizon integer NOT NULL,
        forecast_points jsonb NOT NULL,
        epistemic_status text NOT NULL,
        limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
        generated_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT forecast_runs_id_check CHECK (length(trim(id)) > 0),
        CONSTRAINT forecast_runs_model_check CHECK (length(trim(model_name)) > 0),
        CONSTRAINT forecast_runs_baseline_check CHECK (length(trim(baseline_model)) > 0),
        CONSTRAINT forecast_runs_split_check CHECK (length(trim(split_period)) > 0),
        CONSTRAINT forecast_runs_metric_check CHECK (metric IN ('mae', 'rmse', 'mape')),
        CONSTRAINT forecast_runs_beats_baseline_check CHECK (beats_baseline = true),
        CONSTRAINT forecast_runs_horizon_check CHECK (forecast_horizon > 0),
        CONSTRAINT forecast_runs_forecast_points_check CHECK (jsonb_typeof(forecast_points) = 'array'),
        CONSTRAINT forecast_runs_epistemic_status_check CHECK (epistemic_status = 'forecast'),
        CONSTRAINT forecast_runs_limitations_check CHECK (jsonb_typeof(limitations) = 'array')
      );

      CREATE INDEX series_vintages_series_id_idx ON series_vintages(series_id);
      CREATE INDEX series_vintages_vintage_date_idx ON series_vintages(vintage_date);
      CREATE INDEX forecast_runs_series_id_idx ON forecast_runs(series_id);
      CREATE INDEX forecast_runs_target_vintage_idx ON forecast_runs(target_vintage_id);

      CREATE TRIGGER series_vintages_append_only
        BEFORE UPDATE OR DELETE ON series_vintages
        FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

      CREATE TRIGGER forecast_runs_append_only
        BEFORE UPDATE OR DELETE ON forecast_runs
        FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

      CREATE VIEW public_statistical_series_records WITH (security_barrier = true) AS
      SELECT
        id,
        concept,
        provider_agency,
        source_id,
        frequency,
        base_unit,
        methodology,
        current_vintage_id,
        limitations,
        created_at,
        updated_at
      FROM statistical_series;

      CREATE VIEW public_series_vintage_records WITH (security_barrier = true) AS
      SELECT
        id,
        series_id,
        vintage_date,
        coverage_start,
        coverage_end,
        observations,
        trim(content_hash) AS content_hash,
        publication_notes,
        created_at
      FROM series_vintages;

      CREATE VIEW public_forecast_run_records WITH (security_barrier = true) AS
      SELECT
        id,
        series_id,
        target_vintage_id,
        model_name,
        baseline_model,
        split_period,
        metric,
        model_metric_value,
        baseline_metric_value,
        beats_baseline,
        forecast_horizon,
        forecast_points,
        epistemic_status,
        limitations,
        generated_at,
        created_at
      FROM forecast_runs;

      REVOKE ALL ON statistical_series FROM PUBLIC;
      REVOKE ALL ON series_vintages FROM PUBLIC;
      REVOKE ALL ON forecast_runs FROM PUBLIC;
      REVOKE ALL ON public_statistical_series_records FROM PUBLIC;
      REVOKE ALL ON public_series_vintage_records FROM PUBLIC;
      REVOKE ALL ON public_forecast_run_records FROM PUBLIC;

      DO $grant$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cha_public') THEN
          GRANT SELECT ON public_statistical_series_records TO cha_public;
          GRANT SELECT ON public_series_vintage_records TO cha_public;
          GRANT SELECT ON public_forecast_run_records TO cha_public;
        END IF;
      END
      $grant$;
    `)
  }

  async down() {
    this.schema.raw(`
      DROP VIEW IF EXISTS public_forecast_run_records;
      DROP VIEW IF EXISTS public_series_vintage_records;
      DROP VIEW IF EXISTS public_statistical_series_records;
      DROP TRIGGER IF EXISTS forecast_runs_append_only ON forecast_runs;
      DROP TRIGGER IF EXISTS series_vintages_append_only ON series_vintages;
      DROP TABLE IF EXISTS forecast_runs;
      ALTER TABLE IF EXISTS statistical_series DROP CONSTRAINT IF EXISTS fk_statistical_series_current_vintage;
      DROP TABLE IF EXISTS series_vintages;
      DROP TABLE IF EXISTS statistical_series;
    `)
  }
}
