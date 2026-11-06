import type { AssistanceQuery } from '#modules/assistance/domain/assistance'
import ApiError from '#shared/errors/api_error'

export function validateAssistanceQuery(body: unknown): AssistanceQuery {
  if (!body || typeof body !== 'object') {
    throw new ApiError('E_VALIDATION', 'El cuerpo de la solicitud debe ser un objeto JSON', 422)
  }

  const payload = body as Record<string, unknown>

  if (typeof payload.queryText !== 'string' || payload.queryText.trim().length === 0) {
    throw new ApiError('E_VALIDATION', 'El campo queryText es obligatorio', 422, {
      field: 'queryText',
    })
  }

  const trimmedQuery = payload.queryText.trim()
  if (trimmedQuery.length < 3) {
    throw new ApiError('E_VALIDATION', 'El campo queryText debe tener al menos 3 caracteres', 422, {
      field: 'queryText',
    })
  }

  if (trimmedQuery.length > 500) {
    throw new ApiError('E_VALIDATION', 'El campo queryText no puede exceder 500 caracteres', 422, {
      field: 'queryText',
    })
  }

  let timeRange: AssistanceQuery['timeRange'] | undefined
  if (payload.timeRange !== undefined && payload.timeRange !== null) {
    if (typeof payload.timeRange !== 'object') {
      throw new ApiError('E_VALIDATION', 'El campo timeRange debe ser un objeto', 422, {
        field: 'timeRange',
      })
    }
    const tr = payload.timeRange as Record<string, unknown>
    let fromYear: number | undefined
    let toYear: number | undefined

    if (tr.fromYear !== undefined && tr.fromYear !== null) {
      const parsed = Number(tr.fromYear)
      if (!Number.isInteger(parsed) || parsed < 1500 || parsed > 2100) {
        throw new ApiError('E_VALIDATION', 'fromYear debe ser un entero entre 1500 y 2100', 422, {
          field: 'timeRange.fromYear',
        })
      }
      fromYear = parsed
    }

    if (tr.toYear !== undefined && tr.toYear !== null) {
      const parsed = Number(tr.toYear)
      if (!Number.isInteger(parsed) || parsed < 1500 || parsed > 2100) {
        throw new ApiError('E_VALIDATION', 'toYear debe ser un entero entre 1500 y 2100', 422, {
          field: 'timeRange.toYear',
        })
      }
      toYear = parsed
    }

    if (fromYear !== undefined && toYear !== undefined && fromYear > toYear) {
      throw new ApiError('E_VALIDATION', 'fromYear no puede ser mayor que toYear', 422, {
        field: 'timeRange',
      })
    }

    timeRange = { fromYear, toYear }
  }

  let sourceFilters: readonly string[] | undefined
  if (payload.sourceFilters !== undefined && payload.sourceFilters !== null) {
    if (!Array.isArray(payload.sourceFilters)) {
      throw new ApiError(
        'E_VALIDATION',
        'sourceFilters debe ser un arreglo de cadenas de texto',
        422,
        {
          field: 'sourceFilters',
        }
      )
    }
    if (payload.sourceFilters.length > 10) {
      throw new ApiError('E_VALIDATION', 'sourceFilters no puede contener más de 10 fuentes', 422, {
        field: 'sourceFilters',
      })
    }
    for (const item of payload.sourceFilters) {
      if (typeof item !== 'string' || item.trim().length === 0) {
        throw new ApiError(
          'E_VALIDATION',
          'Cada elemento de sourceFilters debe ser un texto no vacío',
          422,
          {
            field: 'sourceFilters',
          }
        )
      }
    }
    sourceFilters = payload.sourceFilters.map((s) => (s as string).trim())
  }

  return {
    queryText: trimmedQuery,
    timeRange,
    sourceFilters,
  }
}
