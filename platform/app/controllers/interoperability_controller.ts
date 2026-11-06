import { getPublicClaim } from '#modules/evidence/infrastructure/public_claims'
import {
  transformClaimToProvO,
  transformPublicationToProvO,
} from '#modules/interoperability/domain/prov_o_transformer'
import { transformToSdmxJson } from '#modules/interoperability/domain/sdmx_transformer'
import { mcpServer } from '#modules/interoperability/infrastructure/public_interoperability'
import { getPublicationService } from '#modules/publication/infrastructure/public_publications'
import { statisticsService } from '#modules/statistics/infrastructure/public_statistics'
import { createStrongEtag, requestMatchesEtag } from '#shared/http/etag'
import ApiError from '#shared/errors/api_error'
import type { HttpContext } from '@adonisjs/core/http'

export default class InteroperabilityController {
  async claimsProv({ request, response, params }: HttpContext) {
    const claim = await getPublicClaim.execute(params.id)
    const provGraph = transformClaimToProvO(claim)

    const payload = JSON.stringify(provGraph)
    const etag = createStrongEtag(payload)

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).header('etag', etag).send('')
    }

    return response
      .header('etag', etag)
      .header('cache-control', 'public, max-age=60')
      .header('content-type', 'application/ld+json')
      .send(provGraph)
  }

  async publicationsProv({ request, response, params }: HttpContext) {
    const publication = await getPublicationService.execute(params.id)
    const provGraph = transformPublicationToProvO(publication)

    const payload = JSON.stringify(provGraph)
    const etag = createStrongEtag(payload)

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).header('etag', etag).send('')
    }

    return response
      .header('etag', etag)
      .header('cache-control', 'public, max-age=60')
      .header('content-type', 'application/ld+json')
      .send(provGraph)
  }

  async seriesSdmx({ request, response, params }: HttpContext) {
    const query = request.qs() as Record<string, unknown>
    const options = {
      vintageId: query.vintageId ? String(query.vintageId) : undefined,
      fromPeriod: query.fromPeriod ? String(query.fromPeriod) : undefined,
      toPeriod: query.toPeriod ? String(query.toPeriod) : undefined,
    }

    const result = await statisticsService.getObservations(params.id, options)
    const sdmxMessage = transformToSdmxJson(result.series, result.vintage, result.observations)

    const payload = JSON.stringify(sdmxMessage)
    const etag = createStrongEtag(payload)

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).header('etag', etag).send('')
    }

    return response
      .header('etag', etag)
      .header('cache-control', 'public, max-age=60')
      .header('content-type', 'application/vnd.sdmx.data+json; charset=utf-8')
      .send(sdmxMessage)
  }

  async mcp({ request, response }: HttpContext) {
    const body: unknown = request.body()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ApiError('E_VALIDATION', 'Request body must be a valid JSON-RPC 2.0 object', 422)
    }
    const payload = body as Record<string, unknown>

    const mcpResponse = await mcpServer.handleRequest({
      jsonrpc: payload.jsonrpc as '2.0',
      id: (payload.id as string | number | null) ?? null,
      method: typeof payload.method === 'string' ? payload.method : '',
      params: payload.params as Record<string, unknown>,
    })

    return response.header('content-type', 'application/json').send(mcpResponse)
  }
}
