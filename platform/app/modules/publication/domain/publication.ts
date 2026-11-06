import type { ChartSpec, ChartWarning } from '#modules/publication/domain/chart_spec'
import ApiError from '#shared/errors/api_error'

export const publicationTypes = ['dato', 'interpretacion', 'hipotesis'] as const
export type PublicationType = (typeof publicationTypes)[number]

export interface ConflictDeclaration {
  readonly entity: string
  readonly relationship: string
}

export interface CitedEvidenceReference {
  readonly claimId?: string
  readonly sourceId?: string
  readonly artifactId?: string
  readonly locator?: {
    readonly type: string
    readonly value: string
  }
  readonly description: string
}

export interface PublicationRevision {
  readonly id: string
  readonly revisionNumber: number
  readonly title: string
  readonly content: string
  readonly evidence: readonly CitedEvidenceReference[]
  readonly chartSpec: ChartSpec | null
  readonly limitations: readonly string[]
  readonly warnings: readonly ChartWarning[]
  readonly publishedAt: string
  readonly supersedesRevisionId: string | null
}

export interface PublicationRecord {
  readonly id: string
  readonly type: PublicationType
  readonly author: {
    readonly id: string
    readonly displayName: string
  }
  readonly conflictsOfInterest: readonly ConflictDeclaration[]
  readonly forkedFromPublicationId: string | null
  readonly currentRevision: PublicationRevision
  readonly projectedAt: string
}

export interface CreatePublicationParams {
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
  readonly evidence: readonly CitedEvidenceReference[]
  readonly chartSpec?: ChartSpec | null
  readonly limitations?: readonly string[]
}

export function validatePublicationRequirements(params: CreatePublicationParams): void {
  if (!params.title || params.title.trim().length < 5) {
    throw new ApiError(
      'E_VALIDATION',
      'El título de la publicación debe tener al menos 5 caracteres',
      422,
      {
        field: 'title',
      }
    )
  }

  if (!params.content || params.content.trim().length < 10) {
    throw new ApiError(
      'E_VALIDATION',
      'El contenido de la publicación debe tener al menos 10 caracteres',
      422,
      {
        field: 'content',
      }
    )
  }

  // Type-specific requirements (docs/forum-and-charts.md)
  switch (params.type) {
    case 'dato': {
      if (!params.evidence || params.evidence.length === 0) {
        throw new ApiError(
          'E_VALIDATION',
          'Una publicación clasificada como "dato" exige al menos una fuente u observación empírica localizable',
          422,
          { field: 'evidence' }
        )
      }
      const hasUnitAndPeriod =
        params.limitations?.some(
          (l) => l.toLowerCase().includes('unidad') || l.toLowerCase().includes('periodo')
        ) ||
        (params.chartSpec && params.chartSpec.series.every((s) => s.unit.trim().length > 0))

      if (!hasUnitAndPeriod) {
        throw new ApiError(
          'E_VALIDATION',
          'Una publicación clasificada como "dato" exige declarar unidad y período de observación explícitos',
          422,
          { field: 'limitations' }
        )
      }
      break
    }

    case 'interpretacion': {
      if (!params.evidence || params.evidence.length === 0) {
        throw new ApiError(
          'E_VALIDATION',
          'Una publicación clasificada como "interpretación" debe sustentar su razonamiento en al menos una afirmación o evidencia identificada',
          422,
          { field: 'evidence' }
        )
      }
      if (params.content.trim().length < 20) {
        throw new ApiError(
          'E_VALIDATION',
          'Una interpretación exige un razonamiento explícito detallado de al menos 20 caracteres',
          422,
          { field: 'content' }
        )
      }
      break
    }

    case 'hipotesis': {
      if (!params.limitations || params.limitations.length === 0) {
        throw new ApiError(
          'E_VALIDATION',
          'Una publicación clasificada como "hipótesis" debe registrar explícitamente en limitations el criterio falsable o qué evidencia la refutaría',
          422,
          { field: 'limitations' }
        )
      }
      break
    }

    default:
      throw new ApiError('E_VALIDATION', `Tipo de publicación desconocido: ${params.type}`, 422, {
        field: 'type',
      })
  }
}
