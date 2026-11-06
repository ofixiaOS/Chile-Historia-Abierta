import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE TABLE evidence_chunks (
        id text PRIMARY KEY,
        source_id text NOT NULL,
        source_name text NOT NULL,
        source_type text NOT NULL,
        content_hash char(64) NOT NULL,
        text text NOT NULL,
        locator_type text NOT NULL,
        locator_value text NOT NULL,
        epistemic_status text NOT NULL,
        software_license text NOT NULL,
        dataset_license text NOT NULL,
        item_rights text NOT NULL,
        redistribution_policy text NOT NULL,
        required_attribution text NOT NULL,
        retrieved_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        search_vector tsvector GENERATED ALWAYS AS (
          to_tsvector('spanish', text || ' ' || source_name)
        ) STORED,
        CONSTRAINT evidence_chunks_id_check CHECK (length(trim(id)) > 0),
        CONSTRAINT evidence_chunks_source_id_check CHECK (length(trim(source_id)) > 0),
        CONSTRAINT evidence_chunks_source_name_check CHECK (length(trim(source_name)) > 0),
        CONSTRAINT evidence_chunks_source_type_check CHECK (source_type IN (
          'primary_archive', 'official_statistical', 'official_administrative',
          'academic_research', 'secondary_historiography', 'press', 'testimony',
          'community_post', 'ai_output'
        )),
        CONSTRAINT evidence_chunks_content_hash_check CHECK (content_hash ~ '^[0-9a-f]{64}$'),
        CONSTRAINT evidence_chunks_text_check CHECK (length(trim(text)) > 0),
        CONSTRAINT evidence_chunks_locator_type_check CHECK (locator_type IN (
          'page', 'table', 'row', 'selector', 'fragment', 'timecode'
        )),
        CONSTRAINT evidence_chunks_locator_value_check CHECK (length(trim(locator_value)) > 0),
        CONSTRAINT evidence_chunks_epistemic_status_check CHECK (epistemic_status IN (
          'documented', 'inferred', 'disputed', 'hypothesis', 'forecast', 'unknown'
        )),
        CONSTRAINT evidence_chunks_item_rights_check CHECK (length(trim(item_rights)) > 0),
        CONSTRAINT evidence_chunks_redistribution_check CHECK (length(trim(redistribution_policy)) > 0),
        CONSTRAINT evidence_chunks_attribution_check CHECK (length(trim(required_attribution)) > 0)
      );

      CREATE INDEX evidence_chunks_search_vector_idx ON evidence_chunks USING GIN(search_vector);
      CREATE INDEX evidence_chunks_source_id_idx ON evidence_chunks(source_id);
      CREATE INDEX evidence_chunks_epistemic_status_idx ON evidence_chunks(epistemic_status);

      CREATE TRIGGER evidence_chunks_append_only
        BEFORE UPDATE OR DELETE ON evidence_chunks
        FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

      CREATE VIEW public_evidence_chunk_records WITH (security_barrier = true) AS
      SELECT
        id,
        source_id,
        source_name,
        source_type,
        trim(content_hash) AS content_hash,
        text,
        locator_type,
        locator_value,
        epistemic_status,
        software_license,
        dataset_license,
        item_rights,
        redistribution_policy,
        required_attribution,
        retrieved_at,
        created_at,
        search_vector
      FROM evidence_chunks;

      REVOKE ALL ON evidence_chunks FROM PUBLIC;
      REVOKE ALL ON public_evidence_chunk_records FROM PUBLIC;

      DO $grant$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cha_public') THEN
          GRANT SELECT ON public_evidence_chunk_records TO cha_public;
        END IF;
      END
      $grant$;
    `)
  }

  async down() {
    this.schema.raw(`
      DROP VIEW IF EXISTS public_evidence_chunk_records;
      DROP TRIGGER IF EXISTS evidence_chunks_append_only ON evidence_chunks;
      DROP TABLE IF EXISTS evidence_chunks;
    `)
  }
}
