import type { CommunityRepository } from '#modules/community/application/community_repository'
import {
  validateReportParams,
  type ContentReport,
  type CreateReportParams,
} from '#modules/community/domain/moderation'
import { randomUUID } from 'node:crypto'

export default class ReportContentService {
  constructor(private readonly repository: CommunityRepository) {}

  async execute(params: CreateReportParams): Promise<ContentReport> {
    validateReportParams(params)

    const report: ContentReport = {
      id: params.id ?? randomUUID(),
      targetType: params.targetType,
      targetId: params.targetId,
      reporterId: params.reporterId,
      category: params.category,
      justification: params.justification.trim(),
      evidenceUrl: params.evidenceUrl,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    await this.repository.saveReport(report)
    return report
  }
}
