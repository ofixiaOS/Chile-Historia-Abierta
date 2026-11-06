import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      ALTER TABLE place_attestations
        ADD CONSTRAINT place_attestations_id_format_check
          CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$'),
        ADD CONSTRAINT place_attestations_place_id_format_check
          CHECK (place_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$'),
        ADD CONSTRAINT place_attestations_place_name_size_check
          CHECK (octet_length(place_name) <= 512),
        ADD CONSTRAINT place_attestations_source_id_size_check
          CHECK (octet_length(source_id) <= 128),
        ADD CONSTRAINT place_attestations_source_name_size_check
          CHECK (octet_length(source_name) <= 512),
        ADD CONSTRAINT place_attestations_source_url_size_check
          CHECK (source_url IS NULL OR octet_length(source_url) <= 2048),
        ADD CONSTRAINT place_attestations_notes_size_check
          CHECK (notes IS NULL OR octet_length(notes) <= 8192),
        ADD CONSTRAINT place_attestations_rights_size_check
          CHECK (
            octet_length(software_license) <= 128 AND
            octet_length(dataset_license) <= 128 AND
            octet_length(item_rights) <= 1024 AND
            octet_length(redistribution_policy) <= 1024 AND
            octet_length(required_attribution) <= 1024
          ),
        ADD CONSTRAINT place_attestations_relations_size_check
          CHECK (octet_length(related_claim_ids::text) <= 16384);

      CREATE INDEX place_attestations_public_page_idx
        ON place_attestations (from_year ASC, id COLLATE "C" ASC);
    `)
  }

  async down() {
    this.schema.raw(`
      DROP INDEX IF EXISTS place_attestations_public_page_idx;
      ALTER TABLE place_attestations
        DROP CONSTRAINT IF EXISTS place_attestations_id_format_check,
        DROP CONSTRAINT IF EXISTS place_attestations_place_id_format_check,
        DROP CONSTRAINT IF EXISTS place_attestations_place_name_size_check,
        DROP CONSTRAINT IF EXISTS place_attestations_source_id_size_check,
        DROP CONSTRAINT IF EXISTS place_attestations_source_name_size_check,
        DROP CONSTRAINT IF EXISTS place_attestations_source_url_size_check,
        DROP CONSTRAINT IF EXISTS place_attestations_notes_size_check,
        DROP CONSTRAINT IF EXISTS place_attestations_rights_size_check,
        DROP CONSTRAINT IF EXISTS place_attestations_relations_size_check;
    `)
  }
}
