import { placeService } from '#modules/geography/infrastructure/public_places'
import {
  spatialCertainties,
  territoryTypes,
  type SpatialCertainty,
  type TerritoryType,
} from '#modules/geography/domain/place_attestation'
import ApiError from '#shared/errors/api_error'
import { decodePlaceCursor, encodePlaceCursor } from '#modules/geography/application/place_cursor'
import { createStrongEtag, requestMatchesEtag } from '#shared/http/etag'
import type { HttpContext } from '@adonisjs/core/http'

export default class PlacesController {
  async geojson({ request, response }: HttpContext) {
    const rawFromYear = request.input('fromYear')
    const rawToYear = request.input('toYear')
    const rawTerritoryType = request.input('territoryType')
    const rawCertainty = request.input('certainty')
    const placeId = request.input('placeId')
    const rawLimit = request.input('limit')
    const rawCursor = request.input('cursor')

    let limit = 100
    if (rawLimit !== undefined) {
      const value = String(rawLimit)
      if (!/^\d{1,3}$/.test(value) || Number(value) < 1 || Number(value) > 500) {
        throw new ApiError('E_VALIDATION', 'limit must be an integer between 1 and 500', 422, {
          field: 'limit',
        })
      }
      limit = Number(value)
    }

    if (rawCursor !== undefined && typeof rawCursor !== 'string') {
      throw new ApiError('E_VALIDATION', 'Invalid pagination cursor', 422, { field: 'cursor' })
    }
    const after = rawCursor ? decodePlaceCursor(rawCursor) : undefined

    let fromYear: number | undefined
    let toYear: number | undefined
    let territoryType: TerritoryType | undefined
    let certainty: SpatialCertainty | undefined

    if (rawFromYear !== undefined && rawFromYear !== '') {
      const value = String(rawFromYear)
      if (!/^-?\d{1,6}$/.test(value) || !Number.isSafeInteger(Number(value))) {
        throw new ApiError('E_VALIDATION', 'fromYear must be a valid integer', 422, {
          field: 'fromYear',
        })
      }
      fromYear = Number(value)
    }

    if (rawToYear !== undefined && rawToYear !== '') {
      const value = String(rawToYear)
      if (!/^-?\d{1,6}$/.test(value) || !Number.isSafeInteger(Number(value))) {
        throw new ApiError('E_VALIDATION', 'toYear must be a valid integer', 422, {
          field: 'toYear',
        })
      }
      toYear = Number(value)
    }

    if (fromYear !== undefined && toYear !== undefined && fromYear > toYear) {
      throw new ApiError('E_VALIDATION', 'fromYear cannot be greater than toYear', 422, {
        field: 'fromYear',
      })
    }

    if (rawTerritoryType !== undefined && rawTerritoryType !== '') {
      if (!territoryTypes.includes(rawTerritoryType as TerritoryType)) {
        throw new ApiError(
          'E_VALIDATION',
          `Invalid territoryType: ${rawTerritoryType}. Allowed: ${territoryTypes.join(', ')}`,
          422,
          { field: 'territoryType' }
        )
      }
      territoryType = rawTerritoryType as TerritoryType
    }

    if (rawCertainty !== undefined && rawCertainty !== '') {
      if (!spatialCertainties.includes(rawCertainty as SpatialCertainty)) {
        throw new ApiError(
          'E_VALIDATION',
          `Invalid certainty: ${rawCertainty}. Allowed: ${spatialCertainties.join(', ')}`,
          422,
          { field: 'certainty' }
        )
      }
      certainty = rawCertainty as SpatialCertainty
    }

    if (
      placeId !== undefined &&
      (typeof placeId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(placeId))
    ) {
      throw new ApiError('E_VALIDATION', 'placeId must be a valid identifier', 422, {
        field: 'placeId',
      })
    }

    const page = await placeService.getAttestationPage(
      {
        fromYear,
        toYear,
        territoryType,
        certainty,
        placeId: typeof placeId === 'string' ? placeId : undefined,
      },
      limit,
      after
    )

    const nextCursor = page.next ? encodePlaceCursor(page.next) : null
    const nextParams = new URLSearchParams()
    if (fromYear !== undefined) nextParams.set('fromYear', String(fromYear))
    if (toYear !== undefined) nextParams.set('toYear', String(toYear))
    if (territoryType) nextParams.set('territoryType', territoryType)
    if (certainty) nextParams.set('certainty', certainty)
    if (typeof placeId === 'string') nextParams.set('placeId', placeId)
    nextParams.set('limit', String(limit))
    if (nextCursor) nextParams.set('cursor', nextCursor)

    const featureCollection = {
      ...placeService.toGeoJsonFeatureCollection(page.items),
      pagination: {
        limit,
        hasMore: nextCursor !== null,
        nextCursor,
        next: nextCursor ? `/v1/places/geojson?${nextParams.toString()}` : null,
      },
    }

    const etag = createStrongEtag(JSON.stringify(featureCollection))

    response.header('etag', etag)
    response.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    response.header('content-type', 'application/geo+json; charset=utf-8')

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).send(null)
    }

    return response.ok(featureCollection)
  }
}
