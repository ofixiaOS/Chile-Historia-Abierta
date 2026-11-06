import type { CommentRecord, ModerationStatus } from '#modules/community/domain/comment'
import type { CommunityVote, VoteTally } from '#modules/community/domain/community_vote'
import type { ContentReport, ModerationDecision } from '#modules/community/domain/moderation'

export interface CommentPage {
  readonly items: readonly CommentRecord[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

export interface CommunityRepository {
  saveComment(comment: CommentRecord): Promise<void>
  findCommentById(id: string): Promise<CommentRecord | null>
  listCommentsPage(publicationId: string, limit: number, offset: number): Promise<CommentPage>
  recordVote(vote: CommunityVote): Promise<VoteTally>
  getVoteTally(targetType: 'publication' | 'comment', targetId: string): Promise<VoteTally>
  saveReport(report: ContentReport): Promise<void>
  findReportById(id: string): Promise<ContentReport | null>
  saveModerationDecision(decision: ModerationDecision): Promise<void>
  updateCommentStatus(commentId: string, status: ModerationStatus): Promise<void>
}
