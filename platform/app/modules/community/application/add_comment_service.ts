import type { CommunityRepository } from '#modules/community/application/community_repository'
import {
  validateCommentRequirements,
  type CommentRecord,
  type CreateCommentParams,
} from '#modules/community/domain/comment'
import { randomUUID } from 'node:crypto'

export default class AddCommentService {
  constructor(private readonly repository: CommunityRepository) {}

  async execute(params: CreateCommentParams): Promise<CommentRecord> {
    validateCommentRequirements(params)

    const now = new Date().toISOString()
    const comment: CommentRecord = {
      id: params.id ?? randomUUID(),
      publicationId: params.publicationId,
      author: {
        id: params.author.id,
        displayName: params.author.displayName,
      },
      commentType: params.commentType,
      content: params.content.trim(),
      evidence: params.evidence ?? [],
      parentCommentId: params.parentCommentId ?? null,
      moderationStatus: 'active',
      createdAt: now,
      updatedAt: now,
    }

    await this.repository.saveComment(comment)
    return comment
  }
}
