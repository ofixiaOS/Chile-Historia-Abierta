import type { PublicationRepository } from '#modules/publication/application/publication_repository'
import ValidateChartSpecService, {
  type ValidateChartSpecInput,
} from '#modules/publication/application/validate_chart_spec_service'
import type { ChartSpec, ChartWarning } from '#modules/publication/domain/chart_spec'
import {
  validatePublicationRequirements,
  type CitedEvidenceReference,
  type ConflictDeclaration,
  type PublicationRecord,
  type PublicationType,
} from '#modules/publication/domain/publication'
import { randomUUID } from 'node:crypto'

export interface CreatePublicationInput {
  readonly id?: string
  readonly type: PublicationType
  readonly author: {
    readonly id: string
    readonly displayName: string
  }
  readonly conflictsOfInterest?: readonly ConflictDeclaration[]
  readonly forkedFromPublicationId?: string | null
  readonly title: string
  readonly content: string
  readonly evidence?: readonly CitedEvidenceReference[]
  readonly chartSpec?: ValidateChartSpecInput | null
  readonly limitations?: readonly string[]
}

export default class CreatePublicationService {
  private readonly chartValidator = new ValidateChartSpecService()

  constructor(private readonly repository: PublicationRepository) {}

  async execute(input: CreatePublicationInput): Promise<PublicationRecord> {
    let normalizedChartSpec: ChartSpec | null = null
    let chartWarnings: readonly ChartWarning[] = []

    if (input.chartSpec) {
      const validationResult = this.chartValidator.execute(input.chartSpec)
      normalizedChartSpec = validationResult.normalizedSpec
      chartWarnings = validationResult.warnings
    }

    const evidence = input.evidence ?? []

    validatePublicationRequirements({
      type: input.type,
      author: input.author,
      conflictsOfInterest: input.conflictsOfInterest,
      forkedFromPublicationId: input.forkedFromPublicationId,
      title: input.title,
      content: input.content,
      evidence,
      chartSpec: normalizedChartSpec,
      limitations: input.limitations,
    })

    const publicationId = input.id ?? randomUUID()
    const revisionId = randomUUID()
    const now = new Date().toISOString()

    const publication: PublicationRecord = {
      id: publicationId,
      type: input.type,
      author: input.author,
      conflictsOfInterest: input.conflictsOfInterest ?? [],
      forkedFromPublicationId: input.forkedFromPublicationId ?? null,
      currentRevision: {
        id: revisionId,
        revisionNumber: 1,
        title: input.title.trim(),
        content: input.content.trim(),
        evidence,
        chartSpec: normalizedChartSpec,
        limitations: input.limitations ?? [],
        warnings: chartWarnings,
        publishedAt: now,
        supersedesRevisionId: null,
      },
      projectedAt: now,
    }

    await this.repository.save(publication)
    return publication
  }
}
