import type { PublicationRepository } from '#modules/publication/application/publication_repository'
import type {
  ChartSpec,
  ChartWarning,
  DataObservation,
} from '#modules/publication/domain/chart_spec'
import type {
  CitedEvidenceReference,
  ConflictDeclaration,
  PublicationType,
} from '#modules/publication/domain/publication'
import ApiError from '#shared/errors/api_error'

export interface PublicPublicationResponse {
  readonly data: {
    readonly type: 'publication'
    readonly id: string
    readonly publicationType: PublicationType
    readonly attributes: {
      readonly title: string
      readonly content: string
      readonly revisionNumber: number
      readonly publishedAt: string
      readonly author: {
        readonly id: string
        readonly displayName: string
      }
      readonly conflictsOfInterest: readonly ConflictDeclaration[]
      readonly forkedFromPublicationId: string | null
    }
    readonly evidence: readonly CitedEvidenceReference[]
    readonly chartSpec: ChartSpec | null
    readonly tabularData?: Record<string, readonly DataObservation[]>
    readonly limitations: readonly string[]
    readonly warnings: readonly ChartWarning[]
  }
  readonly asOf: string
  readonly version: string
  readonly freshness: {
    readonly generatedAt: string
  }
  readonly links: {
    readonly self: string
  }
}

export default class GetPublicationService {
  constructor(private readonly repository: PublicationRepository) {}

  async execute(id: string): Promise<PublicPublicationResponse> {
    const publication = await this.repository.findById(id)
    if (!publication) {
      throw new ApiError('E_NOT_FOUND', 'Publicación no encontrada', 404, { id })
    }

    const rev = publication.currentRevision
    const asOf = publication.projectedAt
    const version = `${publication.id}:rev:${rev.revisionNumber}:${rev.id}`

    return {
      data: {
        type: 'publication',
        id: publication.id,
        publicationType: publication.type,
        attributes: {
          title: rev.title,
          content: rev.content,
          revisionNumber: rev.revisionNumber,
          publishedAt: rev.publishedAt,
          author: publication.author,
          conflictsOfInterest: publication.conflictsOfInterest,
          forkedFromPublicationId: publication.forkedFromPublicationId,
        },
        evidence: rev.evidence,
        chartSpec: rev.chartSpec,
        tabularData: rev.chartSpec?.dataSnapshot?.series,
        limitations: rev.limitations,
        warnings: rev.warnings,
      },
      asOf,
      version,
      freshness: {
        generatedAt: asOf,
      },
      links: {
        self: `/v1/publications/${encodeURIComponent(publication.id)}`,
      },
    }
  }
}
