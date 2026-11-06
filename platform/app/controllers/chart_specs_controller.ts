import type { ValidateChartSpecInput } from '#modules/publication/application/validate_chart_spec_service'
import { validateChartSpecService } from '#modules/publication/infrastructure/public_publications'
import ApiError from '#shared/errors/api_error'
import type { HttpContext } from '@adonisjs/core/http'

export default class ChartSpecsController {
  async validate({ request, response }: HttpContext) {
    const body = request.body() as Record<string, unknown>
    if (!body || typeof body !== 'object') {
      throw new ApiError('E_VALIDATION', 'El cuerpo de la solicitud debe ser un objeto JSON', 422)
    }

    const result = validateChartSpecService.execute(body as unknown as ValidateChartSpecInput)
    return response.ok(result)
  }
}
