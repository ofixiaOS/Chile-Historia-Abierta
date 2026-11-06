import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE TABLE release_source_reviews (
        id uuid PRIMARY KEY,
        source_id text NOT NULL,
        scope_identifier text NOT NULL,
        source_type text NOT NULL,
        source_name text NOT NULL,
        responsible_agent text NOT NULL,
        source_url text NOT NULL,
        sample_content_hash char(64) NOT NULL,
        sample_locator text NOT NULL,
        rights_evidence_url text,
        rights_summary text NOT NULL,
        decision text NOT NULL,
        reviewer text NOT NULL,
        revision_number integer NOT NULL,
        reviewed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT release_source_reviews_source_id_check CHECK (
          source_id ~ '^[a-z0-9][a-z0-9._-]{1,79}$'
        ),
        CONSTRAINT release_source_reviews_scope_check CHECK (
          length(scope_identifier) BETWEEN 1 AND 256
        ),
        CONSTRAINT release_source_reviews_source_type_check CHECK (
          source_type IN ('primary_archive', 'official_statistical', 'official_administrative',
            'academic_research', 'secondary_historiography', 'press', 'testimony')
        ),
        CONSTRAINT release_source_reviews_urls_check CHECK (
          source_url ~ '^https://' AND
          (rights_evidence_url IS NULL OR rights_evidence_url ~ '^https://')
        ),
        CONSTRAINT release_source_reviews_hash_check CHECK (
          sample_content_hash ~ '^[0-9a-f]{64}$'
        ),
        CONSTRAINT release_source_reviews_decision_check CHECK (
          decision IN ('approved_for_pilot', 'blocked')
        ),
        CONSTRAINT release_source_reviews_reviewer_check CHECK (length(trim(reviewer)) >= 3),
        CONSTRAINT release_source_reviews_revision_check CHECK (revision_number > 0),
        CONSTRAINT release_source_reviews_revision_unique UNIQUE
          (source_id, scope_identifier, revision_number),
        CONSTRAINT release_source_reviews_decision_evidence_check CHECK (
          decision <> 'approved_for_pilot' OR
          (rights_evidence_url IS NOT NULL AND length(trim(sample_locator)) > 0
            AND length(trim(rights_summary)) >= 20)
        )
      );

      CREATE INDEX release_source_reviews_latest_idx
        ON release_source_reviews (source_id, scope_identifier, revision_number DESC);
      CREATE TRIGGER release_source_reviews_append_only
        BEFORE UPDATE OR DELETE ON release_source_reviews
        FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

      ALTER TABLE release_batches
        ADD COLUMN source_review_id uuid REFERENCES release_source_reviews(id);

      REVOKE ALL ON release_source_reviews FROM PUBLIC;
      REVOKE ALL ON release_batches FROM PUBLIC;
    `)
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE release_batches DROP COLUMN IF EXISTS source_review_id;
      DROP TRIGGER IF EXISTS release_source_reviews_append_only ON release_source_reviews;
      DROP TABLE IF EXISTS release_source_reviews;
    `)
  }
}
