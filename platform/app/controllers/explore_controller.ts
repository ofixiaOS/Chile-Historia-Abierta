import { getExplorationReadModel } from '#modules/evidence/infrastructure/public_claims'
import { createStrongEtag, requestMatchesEtag } from '#shared/http/etag'
import { validateClaimQueryFilters } from '#validators/claim_query_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class ExploreController {
  async index({ request, response }: HttpContext) {
    const filters = validateClaimQueryFilters(request.qs())
    const representation = await getExplorationReadModel.execute(filters)
    const etag = createStrongEtag(representation.version)

    response.header('etag', etag)
    response.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).send(null)
    }

    return response.ok(representation)
  }
}
