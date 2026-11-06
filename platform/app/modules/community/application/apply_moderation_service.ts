import type { CommunityRepository } from '#modules/community/application/community_repository'
import {
  validateDecisionParams,
  type ModerationAction,
  type ModerationDecision,
  type ReportCategory,
} from '#modules/community/domain/moderation'
import ApiError from '#shared/errors/api_error'
import { randomUUID } from 'node:crypto'

export interface ApplyModerationParams {
  readonly reportId: string
  readonly moderatorId: string
  readonly action: ModerationAction
  readonly ruleBroken: ReportCategory
  readonly decisionNotes: string
}

export default class ApplyModerationService {
  constructor(private readonly repository: CommunityRepository) {}

  async execute(params: ApplyModerationParams): Promise<ModerationDecision> {
    validateDecisionParams(params)

    const report = await this.repository.findReportById(params.reportId)
    if (!report) {
      throw new ApiError('E_NOT_FOUND', 'Reporte no encontrado', 404, {
        reportId: params.reportId,
      })
    }

    const decision: ModerationDecision = {
      id: randomUUID(),
      reportId: params.reportId,
      moderatorId: params.moderatorId,
      action: params.action,
      ruleBroken: params.ruleBroken,
      decisionNotes: params.decisionNotes.trim(),
      appliedAt: new Date().toISOString(),
    }

    if (report.targetType === 'comment') {
      if (params.action === 'remove') {
        await this.repository.updateCommentStatus(report.targetId, 'removed')
      } else if (params.action === 'quarantine') {
        await this.repository.updateCommentStatus(report.targetId, 'quarantined')
      } else if (params.action === 'flag_disputed') {
        await this.repository.updateCommentStatus(report.targetId, 'flagged')
      }
    }

    await this.repository.saveModerationDecision(decision)
    return decision
  }
}
