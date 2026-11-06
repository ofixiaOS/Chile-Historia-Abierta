import { assistanceService } from '#modules/assistance/infrastructure/public_assistance'
import { validateAssistanceQuery } from '#validators/assistance_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class AssistanceController {
  async query({ request, response }: HttpContext) {
    const validatedQuery = validateAssistanceQuery(request.body())
    const result = await assistanceService.query(validatedQuery)

    return response.ok({
      data: result,
      links: {
        self: '/v1/assistance/query',
      },
    })
  }
}
