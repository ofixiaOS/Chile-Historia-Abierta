import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE TABLE release_batches (
        id uuid PRIMARY KEY,
        data_version text NOT NULL UNIQUE,
        bundle_hash char(64) NOT NULL UNIQUE,
        source_hash char(64) NOT NULL,
        manifest jsonb NOT NULL,
        raw_content bytea NOT NULL,
        status text NOT NULL DEFAULT 'staged',
        approved_by text,
        approved_at timestamptz,
        claim_id uuid UNIQUE REFERENCES claims(id),
        activated_at timestamptz,
        staged_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT release_batches_hash_check CHECK (
          bundle_hash ~ '^[0-9a-f]{64}$' AND source_hash ~ '^[0-9a-f]{64}$'
        ),
        CONSTRAINT release_batches_content_check CHECK (
          octet_length(raw_content) BETWEEN 1 AND 1048576
        ),
        CONSTRAINT release_batches_manifest_check CHECK (jsonb_typeof(manifest) = 'object'),
        CONSTRAINT release_batches_status_check CHECK (status IN ('staged', 'approved', 'active')),
        CONSTRAINT release_batches_approval_check CHECK (
          (status = 'staged' AND approved_by IS NULL AND approved_at IS NULL)
          OR (status IN ('approved', 'active') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
        ),
        CONSTRAINT release_batches_activation_check CHECK (
          (status = 'active' AND claim_id IS NOT NULL AND activated_at IS NOT NULL)
          OR (status <> 'active' AND claim_id IS NULL AND activated_at IS NULL)
        )
      );

      ALTER TABLE source_artifacts
        ADD COLUMN release_batch_id uuid REFERENCES release_batches(id);
      CREATE UNIQUE INDEX source_artifacts_release_batch_unique
        ON source_artifacts(release_batch_id) WHERE release_batch_id IS NOT NULL;

      REVOKE ALL ON release_batches FROM PUBLIC;
    `)
  }

  async down() {
    this.schema.raw(`
      DROP INDEX IF EXISTS source_artifacts_release_batch_unique;
      ALTER TABLE source_artifacts DROP COLUMN IF EXISTS release_batch_id;
      DROP TABLE IF EXISTS release_batches;
    `)
  }
}
