import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE TABLE sources (
        id uuid PRIMARY KEY,
        source_type text NOT NULL,
        source_name text NOT NULL,
        responsible_agent text NOT NULL,
        source_url text NOT NULL,
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT sources_type_check CHECK (source_type IN (
          'primary_archive', 'official_statistical', 'official_administrative',
          'academic_research', 'secondary_historiography', 'press', 'testimony',
          'community_post', 'ai_output'
        )),
        CONSTRAINT sources_name_check CHECK (length(trim(source_name)) > 0),
        CONSTRAINT sources_agent_check CHECK (length(trim(responsible_agent)) > 0),
        CONSTRAINT sources_url_check CHECK (length(trim(source_url)) > 0)
      );

      CREATE TABLE source_artifacts (
        id uuid PRIMARY KEY,
        source_id uuid NOT NULL REFERENCES sources(id),
        retrieved_at timestamptz NOT NULL,
        content_hash char(64) NOT NULL,
        hash_algorithm text NOT NULL DEFAULT 'sha256',
        software_license text NOT NULL,
        dataset_license text NOT NULL,
        item_rights text NOT NULL,
        redistribution_policy text NOT NULL,
        required_attribution text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT source_artifacts_hash_algorithm_check CHECK (hash_algorithm = 'sha256'),
        CONSTRAINT source_artifacts_hash_check CHECK (content_hash ~ '^[0-9a-f]{64}$'),
        CONSTRAINT source_artifacts_item_rights_check CHECK (length(trim(item_rights)) > 0),
        CONSTRAINT source_artifacts_redistribution_check CHECK (length(trim(redistribution_policy)) > 0),
        CONSTRAINT source_artifacts_attribution_check CHECK (length(trim(required_attribution)) > 0),
        CONSTRAINT source_artifacts_source_hash_unique UNIQUE (source_id, content_hash)
      );

      CREATE TABLE claims (
        id uuid PRIMARY KEY,
        current_revision_id uuid,
        projected_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE claim_revisions (
        id uuid PRIMARY KEY,
        claim_id uuid NOT NULL REFERENCES claims(id),
        revision_number integer NOT NULL,
        statement text NOT NULL,
        evidence_status text NOT NULL,
        editorial_status text NOT NULL,
        published_at timestamptz,
        supersedes_revision_id uuid,
        limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT claim_revisions_number_check CHECK (revision_number > 0),
        CONSTRAINT claim_revisions_statement_check CHECK (length(trim(statement)) > 0),
        CONSTRAINT claim_revisions_evidence_status_check CHECK (evidence_status IN (
          'documented', 'inferred', 'disputed', 'hypothesis', 'forecast', 'unknown'
        )),
        CONSTRAINT claim_revisions_editorial_status_check CHECK (editorial_status IN (
          'draft', 'in_review', 'published', 'corrected', 'retracted', 'archived'
        )),
        CONSTRAINT claim_revisions_published_at_check CHECK (
          editorial_status NOT IN ('published', 'corrected') OR published_at IS NOT NULL
        ),
        CONSTRAINT claim_revisions_limitations_check CHECK (jsonb_typeof(limitations) = 'array'),
        CONSTRAINT claim_revisions_claim_number_unique UNIQUE (claim_id, revision_number),
        CONSTRAINT claim_revisions_claim_id_id_unique UNIQUE (claim_id, id),
        CONSTRAINT claim_revisions_supersedes_same_claim_fk
          FOREIGN KEY (claim_id, supersedes_revision_id)
          REFERENCES claim_revisions(claim_id, id)
          DEFERRABLE INITIALLY IMMEDIATE
      );

      ALTER TABLE claims
        ADD CONSTRAINT claims_current_revision_same_claim_fk
        FOREIGN KEY (id, current_revision_id)
        REFERENCES claim_revisions(claim_id, id)
        DEFERRABLE INITIALLY IMMEDIATE;

      CREATE TABLE evidence_links (
        id uuid PRIMARY KEY,
        revision_id uuid NOT NULL REFERENCES claim_revisions(id),
        source_artifact_id uuid NOT NULL REFERENCES source_artifacts(id),
        link_type text NOT NULL,
        locator_type text NOT NULL,
        locator_value text NOT NULL,
        transformation_method text NOT NULL,
        limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT evidence_links_type_check CHECK (
          link_type IN ('supports', 'contradicts', 'contextualizes', 'mentions')
        ),
        CONSTRAINT evidence_links_locator_type_check CHECK (
          locator_type IN ('page', 'table', 'row', 'selector', 'fragment', 'timecode')
        ),
        CONSTRAINT evidence_links_locator_value_check CHECK (length(trim(locator_value)) > 0),
        CONSTRAINT evidence_links_method_check CHECK (length(trim(transformation_method)) > 0),
        CONSTRAINT evidence_links_limitations_check CHECK (jsonb_typeof(limitations) = 'array'),
        CONSTRAINT evidence_links_reference_unique UNIQUE (
          revision_id, source_artifact_id, link_type, locator_type, locator_value
        )
      );

      CREATE INDEX source_artifacts_source_id_idx ON source_artifacts(source_id);
      CREATE INDEX claim_revisions_claim_id_idx ON claim_revisions(claim_id);
      CREATE INDEX evidence_links_revision_id_idx ON evidence_links(revision_id);
      CREATE INDEX evidence_links_artifact_id_idx ON evidence_links(source_artifact_id);

      CREATE FUNCTION reject_append_only_mutation() RETURNS trigger
      LANGUAGE plpgsql AS $function$
      BEGIN
        RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
      END
      $function$;

      CREATE TRIGGER sources_append_only
        BEFORE UPDATE OR DELETE ON sources
        FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

      CREATE TRIGGER source_artifacts_append_only
        BEFORE UPDATE OR DELETE ON source_artifacts
        FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

      CREATE TRIGGER claim_revisions_append_only
        BEFORE UPDATE OR DELETE ON claim_revisions
        FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

      CREATE TRIGGER evidence_links_append_only
        BEFORE UPDATE OR DELETE ON evidence_links
        FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

      CREATE FUNCTION enforce_public_claim_evidence() RETURNS trigger
      LANGUAGE plpgsql AS $function$
      DECLARE
        revision_record claim_revisions%ROWTYPE;
      BEGIN
        IF NEW.current_revision_id IS NULL THEN
          RETURN NEW;
        END IF;

        SELECT * INTO STRICT revision_record
        FROM claim_revisions
        WHERE id = NEW.current_revision_id AND claim_id = NEW.id;

        IF revision_record.editorial_status IN ('published', 'corrected') THEN
          IF NOT EXISTS (
            SELECT 1 FROM evidence_links WHERE revision_id = revision_record.id
          ) THEN
            RAISE EXCEPTION 'public claim revision requires evidence'
              USING ERRCODE = '23514';
          END IF;

          IF revision_record.evidence_status = 'documented' AND NOT EXISTS (
            SELECT 1
            FROM evidence_links link
            JOIN source_artifacts artifact ON artifact.id = link.source_artifact_id
            JOIN sources source ON source.id = artifact.source_id
            WHERE link.revision_id = revision_record.id
              AND link.link_type = 'supports'
              AND source.source_type <> 'ai_output'
          ) THEN
            RAISE EXCEPTION 'documented claim requires non-AI supporting evidence'
              USING ERRCODE = '23514';
          END IF;
        END IF;

        RETURN NEW;
      END
      $function$;

      CREATE CONSTRAINT TRIGGER claims_public_evidence_guard
        AFTER INSERT OR UPDATE ON claims
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION enforce_public_claim_evidence();

      CREATE VIEW public_claim_records WITH (security_barrier = true) AS
      SELECT
        claim.id::text AS claim_id,
        revision.id::text AS revision_id,
        revision.revision_number,
        revision.statement,
        revision.evidence_status,
        revision.editorial_status,
        revision.published_at,
        revision.supersedes_revision_id::text AS supersedes_revision_id,
        revision.limitations,
        claim.projected_at,
        jsonb_agg(
          jsonb_build_object(
            'linkType', link.link_type,
            'source', jsonb_build_object(
              'id', source.id::text,
              'sourceType', source.source_type,
              'sourceName', source.source_name,
              'responsibleAgent', source.responsible_agent,
              'sourceUrl', source.source_url,
              'publishedAt', source.published_at
            ),
            'artifact', jsonb_build_object(
              'id', artifact.id::text,
              'retrievedAt', artifact.retrieved_at,
              'contentHash', trim(artifact.content_hash),
              'hashAlgorithm', artifact.hash_algorithm,
              'softwareLicense', artifact.software_license,
              'datasetLicense', artifact.dataset_license,
              'itemRights', artifact.item_rights,
              'redistributionPolicy', artifact.redistribution_policy,
              'requiredAttribution', artifact.required_attribution
            ),
            'locator', jsonb_build_object(
              'type', link.locator_type,
              'value', link.locator_value
            ),
            'transformationMethod', link.transformation_method,
            'limitations', link.limitations
          ) ORDER BY link.id
        ) AS evidence
      FROM claims claim
      JOIN claim_revisions revision ON revision.id = claim.current_revision_id
      JOIN evidence_links link ON link.revision_id = revision.id
      JOIN source_artifacts artifact ON artifact.id = link.source_artifact_id
      JOIN sources source ON source.id = artifact.source_id
      WHERE revision.editorial_status IN ('published', 'corrected')
      GROUP BY claim.id, revision.id;

      REVOKE ALL ON sources, source_artifacts, claims, claim_revisions, evidence_links FROM PUBLIC;
      REVOKE ALL ON public_claim_records FROM PUBLIC;

      DO $grant$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cha_public') THEN
          GRANT USAGE ON SCHEMA public TO cha_public;
          GRANT SELECT ON public_claim_records TO cha_public;
        END IF;
      END
      $grant$;
    `)
  }

  async down() {
    this.schema.raw(`
      DROP VIEW IF EXISTS public_claim_records;
      DROP TABLE IF EXISTS evidence_links;
      ALTER TABLE IF EXISTS claims DROP CONSTRAINT IF EXISTS claims_current_revision_same_claim_fk;
      DROP TABLE IF EXISTS claim_revisions;
      DROP TABLE IF EXISTS claims;
      DROP TABLE IF EXISTS source_artifacts;
      DROP TABLE IF EXISTS sources;
      DROP FUNCTION IF EXISTS enforce_public_claim_evidence();
      DROP FUNCTION IF EXISTS reject_append_only_mutation();
    `)
  }
}
