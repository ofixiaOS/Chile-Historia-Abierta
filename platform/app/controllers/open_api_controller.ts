import { publicOpenApi } from '#openapi/public_openapi'
import type { HttpContext } from '@adonisjs/core/http'

export default class OpenApiController {
  show({ response }: HttpContext) {
    response.header('cache-control', 'public, max-age=300')
    return response.ok(publicOpenApi)
  }
}
