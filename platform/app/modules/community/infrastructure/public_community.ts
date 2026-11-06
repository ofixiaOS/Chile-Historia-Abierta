import AddCommentService from '#modules/community/application/add_comment_service'
import ApplyModerationService from '#modules/community/application/apply_moderation_service'
import CastVoteService from '#modules/community/application/cast_vote_service'
import ReportContentService from '#modules/community/application/report_content_service'
import InMemoryCommunityRepository from '#modules/community/infrastructure/in_memory_community_repository'
import PostgresCommunityRepository from '#modules/community/infrastructure/postgres_community_repository'
import env from '#start/env'

export const communityRepository =
  env.get('COMMUNITY_REPOSITORY') === 'postgres'
    ? new PostgresCommunityRepository()
    : new InMemoryCommunityRepository()

export const addCommentService = new AddCommentService(communityRepository)
export const castVoteService = new CastVoteService(communityRepository)
export const reportContentService = new ReportContentService(communityRepository)
export const applyModerationService = new ApplyModerationService(communityRepository)
