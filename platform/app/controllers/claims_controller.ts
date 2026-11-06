import { getPublicClaim, listPublicClaims } from '#modules/evidence/infrastructure/public_claims'
import ApiError from '#shared/errors/api_error'
import { createStrongEtag, requestMatchesEtag } from '#shared/http/etag'
import { validateClaimQueryFilters } from '#validators/claim_query_validator'
import type { HttpContext } from '@adonisjs/core/http'

const claimIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/

export default class ClaimsController {
  async index({ request, response }: HttpContext) {
    const filters = validateClaimQueryFilters(request.qs())
    const representation = await listPublicClaims.execute(filters)
    const etag = createStrongEtag(representation.version)

    response.header('etag', etag)
    response.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).send(null)
    }

    return response.ok(representation)
  }

  async show({ params, request, response }: HttpContext) {
    const id = params.id
    if (typeof id !== 'string' || !claimIdPattern.test(id)) {
      throw new ApiError('E_VALIDATION', 'Invalid claim identifier', 422, {
        field: 'id',
      })
    }

    const representation = await getPublicClaim.execute(id)
    const etag = createStrongEtag(representation.version)

    response.header('etag', etag)
    response.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).send(null)
    }

    return response.ok(representation)
  }
}
