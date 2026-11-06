import { communityRepository } from '#modules/community/infrastructure/public_community'
import ApiError from '#shared/errors/api_error'
import { rejectCommunityWrite } from '#modules/community/application/community_write_gate'
import type { HttpContext } from '@adonisjs/core/http'

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/

export default class CommentsController {
  async index({ params, request, response }: HttpContext) {
    const publicationId = params.id
    if (typeof publicationId !== 'string' || !idPattern.test(publicationId)) {
      throw new ApiError('E_VALIDATION', 'Identificador de publicación inválido', 422, {
        field: 'id',
      })
    }

    const query = request.qs()
    const readPageNumber = (key: string, fallback: number, maximum: number) => {
      const value = query[key]
      if (value === undefined) return fallback
      if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) {
        throw new ApiError('E_VALIDATION', `Invalid ${key}`, 422, { field: key })
      }
      const parsed = Number(value)
      if (!Number.isSafeInteger(parsed) || parsed > maximum || (key === 'limit' && parsed < 1)) {
        throw new ApiError('E_VALIDATION', `Invalid ${key}`, 422, { field: key })
      }
      return parsed
    }
    const limit = readPageNumber('limit', 50, 100)
    const offset = readPageNumber('offset', 0, 10_000)
    const page = await communityRepository.listCommentsPage(publicationId, limit, offset)
    const commentsUrl = (pageOffset: number) => {
      const search = new URLSearchParams({ limit: String(limit), offset: String(pageOffset) })
      return `/v1/publications/${encodeURIComponent(publicationId)}/comments?${search}`
    }
    return response.ok({
      data: page.items,
      total: page.total,
      limit,
      offset,
      links: {
        self: commentsUrl(offset),
        ...(offset > 0 ? { previous: commentsUrl(Math.max(0, offset - limit)) } : {}),
        ...(offset + page.items.length < page.total ? { next: commentsUrl(offset + limit) } : {}),
      },
    })
  }

  async store() {
    rejectCommunityWrite()
  }
}
