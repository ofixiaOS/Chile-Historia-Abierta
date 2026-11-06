import ApiError from '#shared/errors/api_error'

export const reportCategories = [
  'spam',
  'doxxing_pii',
  'odio_amenazas',
  'difamacion',
  'cita_falsa',
  'manipulacion_grafica',
  'conflicto_no_declarado',
  'acoso_coordinado',
] as const

export type ReportCategory = (typeof reportCategories)[number]

export const reportStatuses = ['pending', 'reviewed', 'dismissed', 'actioned'] as const
export type ReportStatus = (typeof reportStatuses)[number]

export const moderationActions = ['flag_disputed', 'quarantine', 'remove'] as const
export type ModerationAction = (typeof moderationActions)[number]

export interface ContentReport {
  readonly id: string
  readonly targetType: 'publication' | 'comment'
  readonly targetId: string
  readonly reporterId: string
  readonly category: ReportCategory
  readonly justification: string
  readonly evidenceUrl?: string
  readonly status: ReportStatus
  readonly createdAt: string
}

export interface ModerationDecision {
  readonly id: string
  readonly reportId: string
  readonly moderatorId: string
  readonly action: ModerationAction
  readonly ruleBroken: ReportCategory
  readonly decisionNotes: string
  readonly appliedAt: string
}

export interface CreateReportParams {
  readonly id?: string
  readonly targetType: 'publication' | 'comment'
  readonly targetId: string
  readonly reporterId: string
  readonly category: ReportCategory
  readonly justification: string
  readonly evidenceUrl?: string
}

export function validateReportParams(params: CreateReportParams): void {
  if (!params.targetType || !['publication', 'comment'].includes(params.targetType)) {
    throw new ApiError('E_VALIDATION', `Destino de reporte inválido: ${params.targetType}`, 422, {
      field: 'targetType',
    })
  }

  if (!params.targetId || params.targetId.trim().length === 0) {
    throw new ApiError('E_VALIDATION', 'El ID de contenido a reportar es obligatorio', 422, {
      field: 'targetId',
    })
  }

  if (!params.reporterId || params.reporterId.trim().length === 0) {
    throw new ApiError('E_VALIDATION', 'El ID del usuario que reporta es obligatorio', 422, {
      field: 'reporterId',
    })
  }

  if (!params.category || !reportCategories.includes(params.category)) {
    throw new ApiError(
      'E_VALIDATION',
      `Categoría de reporte desconocida: ${params.category}`,
      422,
      {
        field: 'category',
      }
    )
  }

  // Defensa contra brigading: exigencia de justificación verificable de al menos 15 caracteres
  if (!params.justification || params.justification.trim().length < 15) {
    throw new ApiError(
      'E_VALIDATION',
      'El reporte debe incluir una justificación o evidencia de al menos 15 caracteres (defensa contra reportes masivos automatizados)',
      422,
      { field: 'justification' }
    )
  }
}

export function validateDecisionParams(params: {
  moderatorId: string
  action: string
  ruleBroken: string
  decisionNotes: string
}): void {
  if (!params.moderatorId || params.moderatorId.trim().length === 0) {
    throw new ApiError('E_VALIDATION', 'El ID del moderador es obligatorio', 422, {
      field: 'moderatorId',
    })
  }

  if (!moderationActions.includes(params.action as ModerationAction)) {
    throw new ApiError('E_VALIDATION', `Acción de moderación desconocida: ${params.action}`, 422, {
      field: 'action',
    })
  }

  if (!reportCategories.includes(params.ruleBroken as ReportCategory)) {
    throw new ApiError('E_VALIDATION', `Regla infringida inválida: ${params.ruleBroken}`, 422, {
      field: 'ruleBroken',
    })
  }

  if (!params.decisionNotes || params.decisionNotes.trim().length < 10) {
    throw new ApiError(
      'E_VALIDATION',
      'La decisión de moderación debe incluir notas explicativas de al menos 10 caracteres',
      422,
      { field: 'decisionNotes' }
    )
  }
}
