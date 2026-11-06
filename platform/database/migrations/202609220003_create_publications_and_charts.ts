import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE TABLE chart_specs (
        id uuid PRIMARY KEY,
        schema_version text NOT NULL DEFAULT '1.0.0',
        renderer_name text NOT NULL DEFAULT 'vega-lite',
        renderer_version text NOT NULL DEFAULT '5.21.0',
        title text NOT NULL,
        description text NOT NULL,
        method text NOT NULL,
        series jsonb NOT NULL,
        events jsonb NOT NULL DEFAULT '[]'::jsonb,
        time_range jsonb NOT NULL,
        transformations jsonb NOT NULL DEFAULT '[]'::jsonb,
        query_hash char(64) NOT NULL,
        data_snapshot jsonb NOT NULL,
        sources jsonb NOT NULL DEFAULT '[]'::jsonb,
        limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
        warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chart_specs_method_check CHECK (method IN (
          'descriptive_comparison', 'series_trend', 'event_overlay',
          'cross_sectional', 'causal_inference'
        )),
        CONSTRAINT chart_specs_query_hash_check CHECK (query_hash ~ '^[0-9a-f]{64}$'),
        CONSTRAINT chart_specs_series_check CHECK (jsonb_typeof(series) = 'array'),
        CONSTRAINT chart_specs_data_snapshot_check CHECK (jsonb_typeof(data_snapshot) = 'object'),
        CONSTRAINT chart_specs_events_check CHECK (jsonb_typeof(events) = 'array'),
        CONSTRAINT chart_specs_transformations_check CHECK (jsonb_typeof(transformations) = 'array'),
        CONSTRAINT chart_specs_sources_check CHECK (jsonb_typeof(sources) = 'array'),
        CONSTRAINT chart_specs_limitations_check CHECK (jsonb_typeof(limitations) = 'array'),
        CONSTRAINT chart_specs_warnings_check CHECK (jsonb_typeof(warnings) = 'array')
      );

      CREATE TABLE publications (
        id uuid PRIMARY KEY,
        type text NOT NULL,
        author_id text NOT NULL,
        author_display_name text NOT NULL,
        conflicts_of_interest jsonb NOT NULL DEFAULT '[]'::jsonb,
        forked_from_publication_id uuid REFERENCES publications(id),
        current_revision_id uuid,
        projected_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT publications_type_check CHECK (type IN (
          'dato', 'interpretacion', 'hipotesis', 'prediccion'
        )),
        CONSTRAINT publications_author_id_check CHECK (length(trim(author_id)) > 0),
        CONSTRAINT publications_author_name_check CHECK (length(trim(author_display_name)) > 0),
        CONSTRAINT publications_conflicts_check CHECK (jsonb_typeof(conflicts_of_interest) = 'array')
      );

      CREATE TABLE publication_revisions (
        id uuid PRIMARY KEY,
        publication_id uuid NOT NULL REFERENCES publications(id),
        revision_number integer NOT NULL CHECK (revision_number > 0),
        title text NOT NULL CHECK (length(trim(title)) >= 5),
        content text NOT NULL CHECK (length(trim(content)) >= 10),
        evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
        chart_spec_id uuid REFERENCES chart_specs(id),
        limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
        warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
        published_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        supersedes_revision_id uuid,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT publication_revisions_number_unique UNIQUE (publication_id, revision_number),
        CONSTRAINT publication_revisions_pub_id_id_unique UNIQUE (publication_id, id),
        CONSTRAINT publication_revisions_evidence_check CHECK (jsonb_typeof(evidence) = 'array'),
        CONSTRAINT publication_revisions_limitations_check CHECK (jsonb_typeof(limitations) = 'array'),
        CONSTRAINT publication_revisions_warnings_check CHECK (jsonb_typeof(warnings) = 'array'),
        CONSTRAINT publication_revisions_supersedes_fk
          FOREIGN KEY (publication_id, supersedes_revision_id)
          REFERENCES publication_revisions(publication_id, id)
          DEFERRABLE INITIALLY IMMEDIATE
      );

      ALTER TABLE publications
        ADD CONSTRAINT publications_current_revision_fk
        FOREIGN KEY (id, current_revision_id)
        REFERENCES publication_revisions(publication_id, id)
        DEFERRABLE INITIALLY IMMEDIATE;

      -- Actualizar constraints de outbox_events para soportar publicaciones
      ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS outbox_events_event_type_check;
      ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_event_type_check CHECK (event_type IN (
        'claim.created', 'claim.published', 'claim.corrected', 'claim.retracted',
        'publication.created', 'publication.corrected', 'publication.retracted'
      ));

      ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS outbox_events_aggregate_type_check;
      ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_aggregate_type_check CHECK (aggregate_type IN (
        'claim', 'publication'
      ));

      -- Vista pública segura
      CREATE VIEW public_publication_records WITH (security_barrier = true) AS
      SELECT
        p.id::text AS publication_id,
        p.type,
        p.author_id,
        p.author_display_name,
        p.conflicts_of_interest,
        p.forked_from_publication_id::text AS forked_from_publication_id,
        r.id::text AS revision_id,
        r.revision_number,
        r.title,
        r.content,
        r.evidence,
        r.limitations,
        r.warnings,
        r.published_at,
        r.supersedes_revision_id::text AS supersedes_revision_id,
        p.projected_at,
        CASE
          WHEN c.id IS NOT NULL THEN
            jsonb_build_object(
              'id', c.id::text,
              'schemaVersion', c.schema_version,
              'renderer', jsonb_build_object(
                'name', c.renderer_name,
                'version', c.renderer_version
              ),
              'title', c.title,
              'description', c.description,
              'method', c.method,
              'series', c.series,
              'events', c.events,
              'timeRange', c.time_range,
              'transformations', c.transformations,
              'queryHash', trim(c.query_hash),
              'dataSnapshot', c.data_snapshot,
              'sources', c.sources,
              'limitations', c.limitations,
              'warnings', c.warnings
            )
          ELSE NULL
        END AS chart_spec
      FROM publications p
      JOIN publication_revisions r ON r.id = p.current_revision_id
      LEFT JOIN chart_specs c ON c.id = r.chart_spec_id;

      REVOKE ALL ON chart_specs, publications, publication_revisions FROM PUBLIC;
      REVOKE ALL ON public_publication_records FROM PUBLIC;

      DO $grant$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cha_public') THEN
          GRANT SELECT ON public_publication_records TO cha_public;
        END IF;
      END
      $grant$;
    `)
  }

  async down() {
    this.schema.raw(`
      DROP VIEW IF EXISTS public_publication_records;
      ALTER TABLE IF EXISTS publications DROP CONSTRAINT IF EXISTS publications_current_revision_fk;
      DROP TABLE IF EXISTS publication_revisions;
      DROP TABLE IF EXISTS publications;
      DROP TABLE IF EXISTS chart_specs;

      DELETE FROM outbox_events WHERE aggregate_type = 'publication';

      ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS outbox_events_event_type_check;
      ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_event_type_check CHECK (event_type IN (
        'claim.created', 'claim.published', 'claim.corrected', 'claim.retracted'
      ));

      ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS outbox_events_aggregate_type_check;
      ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_aggregate_type_check CHECK (aggregate_type IN (
        'claim'
      ));
    `)
  }
}
