import type { OutboxRepository } from '#modules/evidence/application/claim_write_repository'
import type { ClaimOutboxEvent } from '#modules/evidence/domain/editorial_claim'
import db from '@adonisjs/lucid/services/db'

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

interface OutboxRow {
  id: string
  event_type: ClaimOutboxEvent['eventType']
  aggregate_type: 'claim'
  aggregate_id: string
  payload: Record<string, unknown> | string
  occurred_at: Date | string
  published_at: Date | string | null
  retry_count: number
}

export default class PostgresOutboxRepository implements OutboxRepository {
  async findPending(limit: number): Promise<readonly ClaimOutboxEvent[]> {
    const result = await db.connection('admin').rawQuery(
      `
        SELECT
          id,
          event_type,
          aggregate_type,
          aggregate_id,
          payload,
          occurred_at,
          published_at,
          retry_count
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY occurred_at ASC
        LIMIT ?
      `,
      [limit]
    )

    return (result.rows as OutboxRow[]).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload ?? {}),
      occurredAt: toIsoString(row.occurred_at),
      publishedAt: row.published_at ? toIsoString(row.published_at) : null,
      retryCount: Number(row.retry_count),
    }))
  }

  async markPublished(ids: readonly string[], publishedAt: string): Promise<void> {
    if (ids.length === 0) {
      return
    }

    await db.connection('admin').rawQuery(
      `
        UPDATE outbox_events
        SET published_at = ?
        WHERE id = ANY(?::uuid[])
      `,
      [publishedAt, [...ids]]
    )
  }
}
