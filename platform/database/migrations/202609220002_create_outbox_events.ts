import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE TABLE outbox_events (
        id uuid PRIMARY KEY,
        event_type text NOT NULL,
        aggregate_type text NOT NULL,
        aggregate_id uuid NOT NULL,
        payload jsonb NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        published_at timestamptz,
        retry_count integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT outbox_events_event_type_check CHECK (event_type IN (
          'claim.created', 'claim.published', 'claim.corrected', 'claim.retracted'
        )),
        CONSTRAINT outbox_events_aggregate_type_check CHECK (aggregate_type IN ('claim')),
        CONSTRAINT outbox_events_payload_check CHECK (jsonb_typeof(payload) = 'object'),
        CONSTRAINT outbox_events_retry_count_check CHECK (retry_count >= 0)
      );

      CREATE INDEX outbox_events_pending_idx ON outbox_events(published_at, occurred_at);
      CREATE INDEX outbox_events_aggregate_idx ON outbox_events(aggregate_type, aggregate_id);

      REVOKE ALL ON outbox_events FROM PUBLIC;
    `)
  }

  async down() {
    this.schema.raw(`
      DROP TABLE IF EXISTS outbox_events;
    `)
  }
}
