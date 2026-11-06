import type {
  CommunityRepository,
  CommentPage,
} from '#modules/community/application/community_repository'
import type {
  CommentRecord,
  CommentType,
  ModerationStatus,
} from '#modules/community/domain/comment'
import type { CommunityVote, TargetType, VoteTally } from '#modules/community/domain/community_vote'
import type {
  ContentReport,
  ModerationDecision,
  ReportCategory,
  ReportStatus,
} from '#modules/community/domain/moderation'
import type { CitedEvidenceReference } from '#modules/publication/domain/publication'
import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'

interface CommentRow {
  id: string
  publication_id: string
  author_id: string
  author_display_name: string
  comment_type: CommentType
  content: string
  evidence: CitedEvidenceReference[] | string
  parent_comment_id: string | null
  moderation_status: ModerationStatus
  created_at: Date | string
  updated_at: Date | string
}

interface ReportRow {
  id: string
  target_type: 'publication' | 'comment'
  target_id: string
  reporter_id: string
  category: ReportCategory
  justification: string
  evidence_url: string | null
  status: ReportStatus
  created_at: Date | string
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function parseJsonField<T>(field: T | string | null | undefined, defaultValue: T): T {
  if (field === null || field === undefined) {
    return defaultValue
  }
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T
    } catch {
      return defaultValue
    }
  }
  return field
}

function mapRowToComment(row: CommentRow): CommentRecord {
  return {
    id: row.id,
    publicationId: row.publication_id,
    author: {
      id: row.author_id,
      displayName: row.author_display_name,
    },
    commentType: row.comment_type,
    content: row.content,
    evidence: parseJsonField<CitedEvidenceReference[]>(row.evidence, []),
    parentCommentId: row.parent_comment_id,
    moderationStatus: row.moderation_status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

export default class PostgresCommunityRepository implements CommunityRepository {
  constructor(private readonly readConnection: 'public' | 'admin' = 'public') {}

  async saveComment(comment: CommentRecord): Promise<void> {
    const parentPlaceholder = comment.parentCommentId ? '?' : 'NULL'

    await db.connection('admin').rawQuery(
      `
        INSERT INTO comments (
          id, publication_id, author_id, author_display_name,
          comment_type, content, evidence, parent_comment_id,
          moderation_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ${parentPlaceholder}, ?, ?, ?)
      `,
      [
        comment.id,
        comment.publicationId,
        comment.author.id,
        comment.author.displayName,
        comment.commentType,
        comment.content,
        JSON.stringify(comment.evidence ?? []),
        ...(comment.parentCommentId ? [comment.parentCommentId] : []),
        comment.moderationStatus,
        comment.createdAt,
        comment.updatedAt,
      ]
    )
  }

  async findCommentById(id: string): Promise<CommentRecord | null> {
    const result = await db.connection('admin').rawQuery(
      `
        SELECT *
        FROM comments
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    )

    const row = result.rows[0] as CommentRow | undefined
    return row ? mapRowToComment(row) : null
  }

  async listCommentsPage(
    publicationId: string,
    limit: number,
    offset: number
  ): Promise<CommentPage> {
    const connection = db.connection(this.readConnection)
    const [rows, count] = await Promise.all([
      connection.rawQuery(
        `SELECT * FROM public_comment_records
         WHERE publication_id = ?
         ORDER BY created_at ASC, id ASC
         LIMIT ? OFFSET ?`,
        [publicationId, limit, offset]
      ),
      connection.rawQuery(
        'SELECT count(*)::bigint AS total FROM public_comment_records WHERE publication_id = ?',
        [publicationId]
      ),
    ])
    return {
      items: (rows.rows as CommentRow[]).map(mapRowToComment),
      total: Number((count.rows[0] as { total: number | string }).total),
      limit,
      offset,
    }
  }

  async recordVote(vote: CommunityVote): Promise<VoteTally> {
    const voteId = randomUUID()

    await db.connection('admin').rawQuery(
      `
        INSERT INTO community_votes (
          id, target_type, target_id, user_id, vote_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (target_type, target_id, user_id)
        DO UPDATE SET
          vote_type = EXCLUDED.vote_type,
          created_at = EXCLUDED.created_at
      `,
      [voteId, vote.targetType, vote.targetId, vote.userId, vote.voteType, vote.createdAt]
    )

    return this.getVoteTally(vote.targetType, vote.targetId)
  }

  async getVoteTally(targetType: TargetType, targetId: string): Promise<VoteTally> {
    const result = await db.connection('admin').rawQuery(
      `
        SELECT
          count(*) FILTER (WHERE vote_type = 'relevante')::integer AS relevante,
          count(*) FILTER (WHERE vote_type = 'metodologia_rigurosa')::integer AS metodologia_rigurosa,
          count(*) FILTER (WHERE vote_type = 'requiere_revision')::integer AS requiere_revision,
          count(*) FILTER (WHERE vote_type = 'discrepo_con_evidencia')::integer AS discrepo_con_evidencia,
          count(*)::integer AS total_votes
        FROM community_votes
        WHERE target_type = ? AND target_id = ?
      `,
      [targetType, targetId]
    )

    const row = result.rows[0] ?? {}
    return {
      targetType,
      targetId,
      relevante: Number(row.relevante ?? 0),
      metodologiaRigurosa: Number(row.metodologia_rigurosa ?? 0),
      requiereRevision: Number(row.requiere_revision ?? 0),
      discrepoConEvidencia: Number(row.discrepo_con_evidencia ?? 0),
      totalVotes: Number(row.total_votes ?? 0),
    }
  }

  async saveReport(report: ContentReport): Promise<void> {
    const evidencePlaceholder = report.evidenceUrl ? '?' : 'NULL'

    await db.connection('admin').rawQuery(
      `
        INSERT INTO content_reports (
          id, target_type, target_id, reporter_id, category,
          justification, evidence_url, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ${evidencePlaceholder}, ?, ?)
      `,
      [
        report.id,
        report.targetType,
        report.targetId,
        report.reporterId,
        report.category,
        report.justification,
        ...(report.evidenceUrl ? [report.evidenceUrl] : []),
        report.status,
        report.createdAt,
      ]
    )
  }

  async findReportById(id: string): Promise<ContentReport | null> {
    const result = await db.connection('admin').rawQuery(
      `
        SELECT *
        FROM content_reports
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    )

    const row = result.rows[0] as ReportRow | undefined
    if (!row) {
      return null
    }

    return {
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      reporterId: row.reporter_id,
      category: row.category,
      justification: row.justification,
      evidenceUrl: row.evidence_url ?? undefined,
      status: row.status,
      createdAt: toIsoString(row.created_at),
    }
  }

  async saveModerationDecision(decision: ModerationDecision): Promise<void> {
    await db.connection('admin').transaction(async (trx) => {
      await trx.rawQuery(
        `
          INSERT INTO moderation_decisions (
            id, report_id, moderator_id, action, rule_broken, decision_notes, applied_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          decision.id,
          decision.reportId,
          decision.moderatorId,
          decision.action,
          decision.ruleBroken,
          decision.decisionNotes,
          decision.appliedAt,
        ]
      )

      await trx.rawQuery(
        `
          UPDATE content_reports
          SET status = 'actioned'
          WHERE id = ?
        `,
        [decision.reportId]
      )
    })
  }

  async updateCommentStatus(commentId: string, status: ModerationStatus): Promise<void> {
    await db.connection('admin').rawQuery(
      `
        UPDATE comments
        SET moderation_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [status, commentId]
    )
  }
}
