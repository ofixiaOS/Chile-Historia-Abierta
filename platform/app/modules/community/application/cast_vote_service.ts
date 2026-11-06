import type { CommunityRepository } from '#modules/community/application/community_repository'
import {
  assertVoteDoesNotAlterEvidenceStatus,
  validateVoteParams,
  type CommunityVote,
  type VoteTally,
} from '#modules/community/domain/community_vote'

export default class CastVoteService {
  constructor(private readonly repository: CommunityRepository) {}

  async execute(params: {
    targetType: string
    targetId: string
    userId: string
    voteType: string
  }): Promise<VoteTally> {
    validateVoteParams(params)

    // Garantía innegociable de no mutación epistémica
    assertVoteDoesNotAlterEvidenceStatus()

    const vote: CommunityVote = {
      targetType: params.targetType,
      targetId: params.targetId,
      userId: params.userId,
      voteType: params.voteType,
      createdAt: new Date().toISOString(),
    }

    return this.repository.recordVote(vote)
  }

  async getTally(targetType: 'publication' | 'comment', targetId: string): Promise<VoteTally> {
    return this.repository.getVoteTally(targetType, targetId)
  }
}
