import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE TABLE place_attestations (
        id text PRIMARY KEY,
        place_id text NOT NULL,
        place_name text NOT NULL,
        territory_type text NOT NULL,
        latitude double precision NOT NULL,
        longitude double precision NOT NULL,
        from_year integer NOT NULL,
        to_year integer,
        certainty text NOT NULL,
        source_id text NOT NULL,
        source_name text NOT NULL,
        source_url text,
        evidence_status text NOT NULL,
        software_license text NOT NULL,
        dataset_license text NOT NULL,
        item_rights text NOT NULL,
        redistribution_policy text NOT NULL,
        required_attribution text NOT NULL,
        notes text,
        related_claim_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT place_attestations_id_check CHECK (length(trim(id)) > 0),
        CONSTRAINT place_attestations_place_id_check CHECK (length(trim(place_id)) > 0),
        CONSTRAINT place_attestations_place_name_check CHECK (length(trim(place_name)) > 0),
        CONSTRAINT place_attestations_territory_type_check CHECK (territory_type IN (
          'city', 'region', 'province', 'boundary', 'site'
        )),
        CONSTRAINT place_attestations_latitude_check CHECK (latitude >= -90.0 AND latitude <= 90.0),
        CONSTRAINT place_attestations_longitude_check CHECK (longitude >= -180.0 AND longitude <= 180.0),
        CONSTRAINT place_attestations_time_range_check CHECK (to_year IS NULL OR from_year <= to_year),
        CONSTRAINT place_attestations_certainty_check CHECK (certainty IN (
          'exact', 'approximate', 'inferred', 'disputed'
        )),
        CONSTRAINT place_attestations_source_id_check CHECK (length(trim(source_id)) > 0),
        CONSTRAINT place_attestations_source_name_check CHECK (length(trim(source_name)) > 0),
        CONSTRAINT place_attestations_epistemic_status_check CHECK (evidence_status IN (
          'documented', 'inferred', 'disputed', 'hypothesis', 'forecast', 'unknown'
        )),
        CONSTRAINT place_attestations_item_rights_check CHECK (length(trim(item_rights)) > 0),
        CONSTRAINT place_attestations_redistribution_check CHECK (length(trim(redistribution_policy)) > 0),
        CONSTRAINT place_attestations_attribution_check CHECK (length(trim(required_attribution)) > 0)
      );

      CREATE INDEX place_attestations_place_id_idx ON place_attestations(place_id);
      CREATE INDEX place_attestations_time_range_idx ON place_attestations(from_year, to_year);
      CREATE INDEX place_attestations_territory_type_idx ON place_attestations(territory_type);
      CREATE INDEX place_attestations_certainty_idx ON place_attestations(certainty);

      CREATE TRIGGER place_attestations_append_only
        BEFORE UPDATE OR DELETE ON place_attestations
        FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

      CREATE VIEW public_place_attestation_records WITH (security_barrier = true) AS
      SELECT
        id,
        place_id,
        place_name,
        territory_type,
        latitude,
        longitude,
        from_year,
        to_year,
        certainty,
        source_id,
        source_name,
        source_url,
        evidence_status,
        software_license,
        dataset_license,
        item_rights,
        redistribution_policy,
        required_attribution,
        notes,
        related_claim_ids,
        created_at
      FROM place_attestations;

      REVOKE ALL ON place_attestations FROM PUBLIC;
      REVOKE ALL ON public_place_attestation_records FROM PUBLIC;

      DO $grant$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cha_public') THEN
          GRANT SELECT ON public_place_attestation_records TO cha_public;
        END IF;
      END
      $grant$;
    `)
  }

  async down() {
    this.schema.raw(`
      DROP VIEW IF EXISTS public_place_attestation_records;
      DROP TRIGGER IF EXISTS place_attestations_append_only ON place_attestations;
      DROP TABLE IF EXISTS place_attestations;
    `)
  }
}
