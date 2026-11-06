import type {
  CommunityRepository,
  CommentPage,
} from '#modules/community/application/community_repository'
import type { CommentRecord, ModerationStatus } from '#modules/community/domain/comment'
import type { CommunityVote, TargetType, VoteTally } from '#modules/community/domain/community_vote'
import type { ContentReport, ModerationDecision } from '#modules/community/domain/moderation'

export default class InMemoryCommunityRepository implements CommunityRepository {
  private readonly comments = new Map<string, CommentRecord>()
  private readonly votes = new Map<string, CommunityVote>()
  private readonly reports = new Map<string, ContentReport>()
  private readonly decisions: ModerationDecision[] = []

  async saveComment(comment: CommentRecord): Promise<void> {
    this.comments.set(comment.id, comment)
  }

  async findCommentById(id: string): Promise<CommentRecord | null> {
    return this.comments.get(id) ?? null
  }

  async listCommentsPage(
    publicationId: string,
    limit: number,
    offset: number
  ): Promise<CommentPage> {
    const comments = Array.from(this.comments.values())
      .filter((c) => c.publicationId === publicationId && c.moderationStatus !== 'removed')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    return { items: comments.slice(offset, offset + limit), total: comments.length, limit, offset }
  }

  async recordVote(vote: CommunityVote): Promise<VoteTally> {
    const key = `${vote.targetType}:${vote.targetId}:${vote.userId}`
    this.votes.set(key, vote)
    return this.getVoteTally(vote.targetType, vote.targetId)
  }

  async getVoteTally(targetType: TargetType, targetId: string): Promise<VoteTally> {
    let relevante = 0
    let metodologiaRigurosa = 0
    let requiereRevision = 0
    let discrepoConEvidencia = 0

    for (const vote of this.votes.values()) {
      if (vote.targetType === targetType && vote.targetId === targetId) {
        switch (vote.voteType) {
          case 'relevante':
            relevante++
            break
          case 'metodologia_rigurosa':
            metodologiaRigurosa++
            break
          case 'requiere_revision':
            requiereRevision++
            break
          case 'discrepo_con_evidencia':
            discrepoConEvidencia++
            break
        }
      }
    }

    const totalVotes = relevante + metodologiaRigurosa + requiereRevision + discrepoConEvidencia

    return {
      targetType,
      targetId,
      relevante,
      metodologiaRigurosa,
      requiereRevision,
      discrepoConEvidencia,
      totalVotes,
    }
  }

  async saveReport(report: ContentReport): Promise<void> {
    this.reports.set(report.id, report)
  }

  async findReportById(id: string): Promise<ContentReport | null> {
    return this.reports.get(id) ?? null
  }

  async saveModerationDecision(decision: ModerationDecision): Promise<void> {
    this.decisions.push(decision)
    const report = this.reports.get(decision.reportId)
    if (report) {
      this.reports.set(report.id, {
        ...report,
        status: 'actioned',
      })
    }
  }

  async updateCommentStatus(commentId: string, status: ModerationStatus): Promise<void> {
    const existing = this.comments.get(commentId)
    if (existing) {
      this.comments.set(commentId, {
        ...existing,
        moderationStatus: status,
        updatedAt: new Date().toISOString(),
      })
    }
  }
}
