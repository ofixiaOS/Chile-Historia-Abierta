import type { CreatePublicationInput } from '#modules/publication/application/create_publication_service'
import {
  createPublicationService,
  getPublicationService,
} from '#modules/publication/infrastructure/public_publications'
import ApiError from '#shared/errors/api_error'
import { createStrongEtag, requestMatchesEtag } from '#shared/http/etag'
import { requirePilotEditor } from '#modules/identity/infrastructure/pilot_editor'
import type { HttpContext } from '@adonisjs/core/http'

const publicationIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/

export default class PublicationsController {
  async store({ request, response }: HttpContext) {
    const author = requirePilotEditor(request.header('authorization'))
    const body = request.body() as Record<string, unknown>
    if (!body || typeof body !== 'object') {
      throw new ApiError('E_VALIDATION', 'El cuerpo de la solicitud debe ser un objeto JSON', 422)
    }

    const created = await createPublicationService.execute({
      ...(body as unknown as CreatePublicationInput),
      author,
    })
    response.header('cache-control', 'no-store')
    return response.status(201).send({
      data: {
        type: 'publication',
        id: created.id,
        publicationType: created.type,
        revisionId: created.currentRevision.id,
        title: created.currentRevision.title,
        warnings: created.currentRevision.warnings,
      },
      links: {
        self: `/v1/publications/${encodeURIComponent(created.id)}`,
      },
    })
  }

  async show({ params, request, response }: HttpContext) {
    const id = params.id
    if (typeof id !== 'string' || !publicationIdPattern.test(id)) {
      throw new ApiError('E_VALIDATION', 'Identificador de publicación inválido', 422, {
        field: 'id',
      })
    }

    const representation = await getPublicationService.execute(id)
    const etag = createStrongEtag(representation.version)

    response.header('etag', etag)
    response.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')

    if (requestMatchesEtag(request.header('if-none-match'), etag)) {
      return response.status(304).send(null)
    }

    return response.ok(representation)
  }
}
