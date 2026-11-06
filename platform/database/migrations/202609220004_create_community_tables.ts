import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE TABLE comments (
        id uuid PRIMARY KEY,
        publication_id uuid NOT NULL REFERENCES publications(id),
        author_id text NOT NULL,
        author_display_name text NOT NULL,
        comment_type text NOT NULL,
        content text NOT NULL,
        evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
        parent_comment_id uuid REFERENCES comments(id),
        moderation_status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT comments_type_check CHECK (comment_type IN (
          'aporte_evidencia', 'solicitud_aclaracion',
          'discrepancia_metodologica', 'comentario_general'
        )),
        CONSTRAINT comments_content_check CHECK (length(trim(content)) >= 10),
        CONSTRAINT comments_author_id_check CHECK (length(trim(author_id)) > 0),
        CONSTRAINT comments_author_name_check CHECK (length(trim(author_display_name)) > 0),
        CONSTRAINT comments_evidence_check CHECK (jsonb_typeof(evidence) = 'array'),
        CONSTRAINT comments_moderation_status_check CHECK (moderation_status IN (
          'active', 'flagged', 'quarantined', 'removed'
        ))
      );

      CREATE INDEX comments_publication_created_idx ON comments(publication_id, created_at);

      CREATE TABLE community_votes (
        id uuid PRIMARY KEY,
        target_type text NOT NULL,
        target_id uuid NOT NULL,
        user_id text NOT NULL,
        vote_type text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT community_votes_target_type_check CHECK (target_type IN ('publication', 'comment')),
        CONSTRAINT community_votes_user_id_check CHECK (length(trim(user_id)) > 0),
        CONSTRAINT community_votes_vote_type_check CHECK (vote_type IN (
          'relevante', 'metodologia_rigurosa', 'requiere_revision', 'discrepo_con_evidencia'
        )),
        CONSTRAINT community_votes_unique UNIQUE (target_type, target_id, user_id)
      );

      CREATE INDEX community_votes_target_idx ON community_votes(target_type, target_id);

      CREATE TABLE content_reports (
        id uuid PRIMARY KEY,
        target_type text NOT NULL,
        target_id uuid NOT NULL,
        reporter_id text NOT NULL,
        category text NOT NULL,
        justification text NOT NULL,
        evidence_url text,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT content_reports_target_type_check CHECK (target_type IN ('publication', 'comment')),
        CONSTRAINT content_reports_reporter_id_check CHECK (length(trim(reporter_id)) > 0),
        CONSTRAINT content_reports_category_check CHECK (category IN (
          'spam', 'doxxing_pii', 'odio_amenazas', 'difamacion', 'cita_falsa',
          'manipulacion_grafica', 'conflicto_no_declarado', 'acoso_coordinado'
        )),
        CONSTRAINT content_reports_justification_check CHECK (length(trim(justification)) >= 15),
        CONSTRAINT content_reports_status_check CHECK (status IN (
          'pending', 'reviewed', 'dismissed', 'actioned'
        ))
      );

      CREATE TABLE moderation_decisions (
        id uuid PRIMARY KEY,
        report_id uuid NOT NULL REFERENCES content_reports(id),
        moderator_id text NOT NULL,
        action text NOT NULL,
        rule_broken text NOT NULL,
        decision_notes text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT moderation_decisions_moderator_id_check CHECK (length(trim(moderator_id)) > 0),
        CONSTRAINT moderation_decisions_action_check CHECK (action IN (
          'flag_disputed', 'quarantine', 'remove'
        )),
        CONSTRAINT moderation_decisions_rule_broken_check CHECK (rule_broken IN (
          'spam', 'doxxing_pii', 'odio_amenazas', 'difamacion', 'cita_falsa',
          'manipulacion_grafica', 'conflicto_no_declarado', 'acoso_coordinado'
        )),
        CONSTRAINT moderation_decisions_notes_check CHECK (length(trim(decision_notes)) >= 10)
      );

      CREATE VIEW public_comment_records WITH (security_barrier = true) AS
      SELECT
        id::text AS id,
        publication_id::text AS publication_id,
        author_id,
        author_display_name,
        comment_type,
        content,
        evidence,
        parent_comment_id::text AS parent_comment_id,
        moderation_status,
        created_at,
        updated_at
      FROM comments
      WHERE moderation_status != 'removed';

      REVOKE ALL ON comments, community_votes, content_reports, moderation_decisions FROM PUBLIC;
      REVOKE ALL ON public_comment_records FROM PUBLIC;

      DO $grant$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cha_public') THEN
          GRANT SELECT ON public_comment_records TO cha_public;
        END IF;
      END
      $grant$;
    `)
  }

  async down() {
    this.schema.raw(`
      DROP VIEW IF EXISTS public_comment_records;
      DROP TABLE IF EXISTS moderation_decisions;
      DROP TABLE IF EXISTS content_reports;
      DROP TABLE IF EXISTS community_votes;
      DROP TABLE IF EXISTS comments;
    `)
  }
}
