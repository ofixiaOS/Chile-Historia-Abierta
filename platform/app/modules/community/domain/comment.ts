import type { CitedEvidenceReference } from '#modules/publication/domain/publication'
import ApiError from '#shared/errors/api_error'

export const commentTypes = [
  'aporte_evidencia',
  'solicitud_aclaracion',
  'discrepancia_metodologica',
  'comentario_general',
] as const

export type CommentType = (typeof commentTypes)[number]

export const moderationStatuses = ['active', 'flagged', 'quarantined', 'removed'] as const
export type ModerationStatus = (typeof moderationStatuses)[number]

export interface CommentRecord {
  readonly id: string
  readonly publicationId: string
  readonly author: {
    readonly id: string
    readonly displayName: string
  }
  readonly commentType: CommentType
  readonly content: string
  readonly evidence: readonly CitedEvidenceReference[]
  readonly parentCommentId: string | null
  readonly moderationStatus: ModerationStatus
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateCommentParams {
  readonly id?: string
  readonly publicationId: string
  readonly author: {
    readonly id: string
    readonly displayName: string
  }
  readonly commentType: CommentType
  readonly content: string
  readonly evidence?: readonly CitedEvidenceReference[]
  readonly parentCommentId?: string | null
}

export function validateCommentRequirements(params: CreateCommentParams): void {
  if (!params.publicationId || params.publicationId.trim().length === 0) {
    throw new ApiError(
      'E_VALIDATION',
      'El comentario debe asociarse a una publicación válida',
      422,
      {
        field: 'publicationId',
      }
    )
  }

  if (!params.author || !params.author.id || params.author.id.trim().length === 0) {
    throw new ApiError('E_VALIDATION', 'El autor del comentario es obligatorio', 422, {
      field: 'author.id',
    })
  }

  if (!params.author.displayName || params.author.displayName.trim().length === 0) {
    throw new ApiError('E_VALIDATION', 'El nombre visible del autor es obligatorio', 422, {
      field: 'author.displayName',
    })
  }

  if (!params.commentType || !commentTypes.includes(params.commentType)) {
    throw new ApiError('E_VALIDATION', `Tipo de comentario inválido: ${params.commentType}`, 422, {
      field: 'commentType',
    })
  }

  if (!params.content || params.content.trim().length < 10) {
    throw new ApiError(
      'E_VALIDATION',
      'El contenido del comentario debe tener al menos 10 caracteres',
      422,
      {
        field: 'content',
      }
    )
  }

  if (params.commentType === 'aporte_evidencia') {
    if (!params.evidence || params.evidence.length === 0) {
      throw new ApiError(
        'E_VALIDATION',
        'Un comentario de tipo "aporte_evidencia" debe incluir al menos una referencia de evidencia',
        422,
        { field: 'evidence' }
      )
    }
  }

  if (params.commentType === 'discrepancia_metodologica') {
    if (params.content.trim().length < 25) {
      throw new ApiError(
        'E_VALIDATION',
        'Una discrepancia metodológica debe fundamentar la objeción con al menos 25 caracteres',
        422,
        { field: 'content' }
      )
    }
  }
}
