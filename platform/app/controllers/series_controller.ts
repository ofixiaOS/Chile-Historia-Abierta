import { statisticsService } from '#modules/statistics/infrastructure/public_statistics'
import ApiError from '#shared/errors/api_error'
import { createStrongEtag, requestMatchesEtag } from '#shared/http/etag'
import {
  validateObservationsQuery,
  validateSeriesQuery,
  validateVintagesQuery,
} from '#validators/series_validator'
import type { HttpContext } from '@adonisjs/core/http'

const identifierPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/

function validateIdentifier(id: unknown, fieldName: string): string {
  if (typeof id !== 'string' || !identifierPattern.test(id)) {
    throw new ApiError('E_VALIDATION', `Invalid identifier for ${fieldName}`, 422, {
      field: fieldName,
    })
  }
  return id
}

export default class SeriesController {
  async index({ request, response }: HttpContext) {
    const query = validateSeriesQuery(request.qs())
    const page = await statisticsService.listSeries(query.limit, query.offset)
    const base = '/v1/series'
    return response.ok({
      data: page.items,
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      links: {
        self: `${base}?limit=${page.limit}&offset=${page.offset}`,
        ...(page.offset > 0
          ? {
              previous: `${base}?limit=${page.limit}&offset=${Math.max(0, page.offset - page.limit)}`,
            }
          : {}),
        ...(page.offset + page.items.length < page.total
          ? { next: `${base}?limit=${page.limit}&offset=${page.offset + page.limit}` }
          : {}),
      },
    })
  }

  async show({ params, request, response }: HttpContext) {
    const id = validateIdentifier(params.id, 'id')
    const series = await statisticsService.getSeries(id)

    const representation = {
      data: series,
      evidenceStatus: 'documented' as const,
      asOf: new Date().toISOString(),
      version: `${series.id}:${series.currentVintageId}`,
      limitations: series.limitations,
      links: {
        self: `/v1/series/${series.id}`,
        vintages: `/v1/series/${series.id}/vintages`,
        observations: `/v1/series/${series.id}/observations`,
      },
    }

    const etag = createStrongEtag(representation.version)
    response.header('etag', etag)
    response.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).send(null)
    }

    return response.ok(representation)
  }

  async vintages({ params, request, response }: HttpContext) {
    const seriesId = validateIdentifier(params.id, 'id')
    const query = validateVintagesQuery(request.qs())
    const page = await statisticsService.listVintages(seriesId, query.limit, query.offset)
    const nextOffset = page.offset + page.limit
    const base = `/v1/series/${seriesId}/vintages`

    return response.ok({
      seriesId,
      data: page.items,
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      links: {
        self: `${base}?limit=${page.limit}&offset=${page.offset}`,
        ...(nextOffset < page.total
          ? { next: `${base}?limit=${page.limit}&offset=${nextOffset}` }
          : {}),
      },
    })
  }

  async observations({ params, request, response }: HttpContext) {
    const seriesId = validateIdentifier(params.id, 'id')
    const query = validateObservationsQuery(request.qs())

    const result = await statisticsService.getObservations(seriesId, query)
    const observationUrl = (offset: number) => {
      const search = new URLSearchParams()
      search.set('limit', String(result.limit))
      search.set('offset', String(offset))
      if (query.vintageId) search.set('vintageId', query.vintageId)
      if (query.fromPeriod) search.set('fromPeriod', query.fromPeriod)
      if (query.toPeriod) search.set('toPeriod', query.toPeriod)
      return `/v1/series/${seriesId}/observations?${search.toString()}`
    }

    const representation = {
      seriesId: result.series.id,
      vintageId: result.vintage.id,
      coverage: {
        start: result.vintage.coverageStart,
        end: result.vintage.coverageEnd,
      },
      data: result.observations,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      links: {
        self: observationUrl(result.offset),
        ...(result.offset > 0
          ? { previous: observationUrl(Math.max(0, result.offset - result.limit)) }
          : {}),
        ...(result.offset + result.observations.length < result.total
          ? { next: observationUrl(result.offset + result.limit) }
          : {}),
        series: `/v1/series/${seriesId}`,
        vintage: `/v1/series/${seriesId}/vintages`,
      },
    }

    const etag = createStrongEtag(
      JSON.stringify({
        vintageId: result.vintage.id,
        fromPeriod: query.fromPeriod,
        toPeriod: query.toPeriod,
        limit: result.limit,
        offset: result.offset,
        total: result.total,
      })
    )
    response.header('etag', etag)
    response.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).send(null)
    }

    return response.ok(representation)
  }

  async forecast({ params, request, response }: HttpContext) {
    const id = validateIdentifier(params.id, 'id')
    const run = await statisticsService.getForecast(id)

    const representation = {
      data: run,
      evidenceStatus: run.epistemicStatus,
      asOf: run.generatedAt,
      version: run.id,
      limitations: run.limitations,
      links: {
        self: `/v1/forecasts/${run.id}`,
        series: `/v1/series/${run.seriesId}`,
      },
    }

    const etag = createStrongEtag(representation.version)
    response.header('etag', etag)
    response.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).send(null)
    }

    return response.ok(representation)
  }
}
