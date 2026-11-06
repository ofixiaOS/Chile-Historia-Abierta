import ApiError from '#shared/errors/api_error'

export interface ValidatedObservationsQuery {
  vintageId?: string
  fromPeriod?: string
  toPeriod?: string
  limit: number
  offset: number
}

export interface ValidatedVintagesQuery {
  limit: number
  offset: number
}

export interface ValidatedSeriesQuery {
  limit: number
  offset: number
}

function pageNumber(query: Record<string, unknown>, key: string, fallback: number, max: number) {
  const value = query[key]
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new ApiError('E_VALIDATION', `Invalid ${key}`, 422, { field: key })
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed > max || (key === 'limit' && parsed < 1)) {
    throw new ApiError('E_VALIDATION', `Invalid ${key}`, 422, { field: key })
  }
  return parsed
}

export function validateObservationsQuery(
  query: Record<string, unknown>
): ValidatedObservationsQuery {
  let vintageId: string | undefined
  let fromPeriod: string | undefined
  let toPeriod: string | undefined

  if (typeof query.vintageId === 'string' && query.vintageId.trim().length > 0) {
    vintageId = query.vintageId.trim()
  }

  if (typeof query.fromPeriod === 'string' && query.fromPeriod.trim().length > 0) {
    fromPeriod = query.fromPeriod.trim()
  }

  if (typeof query.toPeriod === 'string' && query.toPeriod.trim().length > 0) {
    toPeriod = query.toPeriod.trim()
  }

  if (fromPeriod && toPeriod && fromPeriod > toPeriod) {
    throw new ApiError('E_VALIDATION', 'fromPeriod cannot be greater than toPeriod', 422, {
      field: 'fromPeriod',
    })
  }

  return {
    vintageId,
    fromPeriod,
    toPeriod,
    limit: pageNumber(query, 'limit', 500, 1000),
    offset: pageNumber(query, 'offset', 0, 10_000),
  }
}

export function validateVintagesQuery(query: Record<string, unknown>): ValidatedVintagesQuery {
  return {
    limit: pageNumber(query, 'limit', 100, 500),
    offset: pageNumber(query, 'offset', 0, 10_000),
  }
}

export function validateSeriesQuery(query: Record<string, unknown>): ValidatedSeriesQuery {
  return {
    limit: pageNumber(query, 'limit', 100, 500),
    offset: pageNumber(query, 'offset', 0, 10_000),
  }
}
