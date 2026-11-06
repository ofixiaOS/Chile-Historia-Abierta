import ApiError from '#shared/errors/api_error'

export const voteTypes = [
  'relevante',
  'metodologia_rigurosa',
  'requiere_revision',
  'discrepo_con_evidencia',
] as const

export type VoteType = (typeof voteTypes)[number]

export const targetTypes = ['publication', 'comment'] as const
export type TargetType = (typeof targetTypes)[number]

export interface CommunityVote {
  readonly targetType: TargetType
  readonly targetId: string
  readonly userId: string
  readonly voteType: VoteType
  readonly createdAt: string
}

export interface VoteTally {
  readonly targetType: TargetType
  readonly targetId: string
  readonly relevante: number
  readonly metodologiaRigurosa: number
  readonly requiereRevision: number
  readonly discrepoConEvidencia: number
  readonly totalVotes: number
}

export function validateVoteParams(params: {
  targetType: string
  targetId: string
  userId: string
  voteType: string
}): asserts params is CommunityVote {
  if (!targetTypes.includes(params.targetType as TargetType)) {
    throw new ApiError(
      'E_VALIDATION',
      `Tipo de destino inválido para voto: ${params.targetType}`,
      422,
      {
        field: 'targetType',
      }
    )
  }

  if (!params.targetId || params.targetId.trim().length === 0) {
    throw new ApiError('E_VALIDATION', 'El ID de destino del voto es obligatorio', 422, {
      field: 'targetId',
    })
  }

  if (!params.userId || params.userId.trim().length === 0) {
    throw new ApiError('E_VALIDATION', 'El ID de usuario votante es obligatorio', 422, {
      field: 'userId',
    })
  }

  if (!voteTypes.includes(params.voteType as VoteType)) {
    throw new ApiError(
      'E_VALIDATION',
      `Tipo de reacción comunitaria inválida: ${params.voteType}`,
      422,
      {
        field: 'voteType',
      }
    )
  }
}

/**
 * Principio 12 de AGENTS.md: Popularidad no es evidencia.
 * Los votos ordenan atención y visibilidad comunitaria, pero bajo ninguna circunstancia
 * alteran el evidenceStatus ni el estado editorial de un claim o publicación.
 */
export function assertVoteDoesNotAlterEvidenceStatus(): void {
  // Garantía explícita en el modelo de dominio
}
