import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import ApiError from '#shared/errors/api_error'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof ApiError) {
      return ctx.response.status(error.status).send({
        error: {
          code: error.code,
          message: error.message,
          status: error.status,
          requestId: ctx.request.id() ?? 'unavailable',
          ...(error.details ? { details: error.details } : {}),
        },
      })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    if (error instanceof ApiError && error.status < 500) {
      return
    }

    return super.report(error, ctx)
  }
}
