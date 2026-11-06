import { castVoteService } from '#modules/community/infrastructure/public_community'
import ApiError from '#shared/errors/api_error'
import { rejectCommunityWrite } from '#modules/community/application/community_write_gate'
import type { HttpContext } from '@adonisjs/core/http'

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/

export default class VotesController {
  async show({ params, response }: HttpContext) {
    const publicationId = params.id
    if (typeof publicationId !== 'string' || !idPattern.test(publicationId)) {
      throw new ApiError('E_VALIDATION', 'Identificador de publicación inválido', 422, {
        field: 'id',
      })
    }

    const tally = await castVoteService.getTally('publication', publicationId)
    return response.ok({
      data: tally,
      links: {
        self: `/v1/publications/${encodeURIComponent(publicationId)}/votes`,
      },
    })
  }

  async store() {
    rejectCommunityWrite()
  }
}
