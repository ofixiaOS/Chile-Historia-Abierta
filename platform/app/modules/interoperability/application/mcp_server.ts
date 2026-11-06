import type { ChunkRetriever } from '#modules/assistance/application/assistance_service'
import type GetPublicClaim from '#modules/evidence/application/get_public_claim'
import type ValidateChartSpecService from '#modules/publication/application/validate_chart_spec_service'
import type { StatisticsService } from '#modules/statistics/application/statistics_service'
import ApiError from '#shared/errors/api_error'

export interface McpToolDefinition {
  readonly name: string
  readonly description: string
  readonly inputSchema: {
    readonly type: 'object'
    readonly properties: Record<string, unknown>
    readonly required?: readonly string[]
  }
}

export interface McpRequest {
  readonly jsonrpc: '2.0'
  readonly id?: string | number | null
  readonly method: string
  readonly params?: Record<string, unknown>
}

export interface McpResponse {
  readonly jsonrpc: '2.0'
  readonly id: string | number | null
  readonly result?: Record<string, unknown>
  readonly error?: {
    readonly code: number
    readonly message: string
    readonly data?: unknown
  }
}

export class McpServer {
  constructor(
    private readonly dependencies: {
      getPublicClaim: GetPublicClaim
      chunkRetriever: ChunkRetriever
      statisticsService: StatisticsService
      validateChartSpecService: ValidateChartSpecService
    }
  ) {}

  public getToolDefinitions(): readonly McpToolDefinition[] {
    return [
      {
        name: 'get_claim',
        description:
          'Consulta una afirmación histórica o económica por su identificador unívoco. Retorna sobre factual con estado de evidencia (documented, inferred, disputed, hypothesis, forecast, unknown), fuentes primarias, locators y límites metodológicos.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Identificador único de la afirmación (ej. claim-bcentral-tpm-2024)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_evidence',
        description:
          'Busca fragmentos documentales primarios verificados (EvidenceChunk) en el corpus de Chile Historia Abierta mediante búsqueda lematizada en español con ranking de relevancia.',
        inputSchema: {
          type: 'object',
          properties: {
            queryText: {
              type: 'string',
              description: 'Texto de la consulta histórica o económica a buscar en la evidencia',
            },
            sourceFilters: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Filtro opcional por identificadores de fuente documental (ej. bcentral-cl, bcn-ley-chile)',
            },
          },
          required: ['queryText'],
        },
      },
      {
        name: 'get_statistical_series',
        description:
          'Consulta una serie estadística con sus observaciones históricas y metadatos SDMX. Permite seleccionar un vintage inmutable específico y filtrar por rango cronológico.',
        inputSchema: {
          type: 'object',
          properties: {
            seriesId: {
              type: 'string',
              description: 'Identificador de la serie (ej. bcentral-tpm)',
            },
            vintageId: {
              type: 'string',
              description: 'Identificador opcional del vintage histórico congelado',
            },
            fromPeriod: {
              type: 'string',
              description: 'Período inicial inclusive (ej. 2024-01)',
            },
            toPeriod: {
              type: 'string',
              description: 'Período final inclusive (ej. 2024-06)',
            },
          },
          required: ['seriesId'],
        },
      },
      {
        name: 'get_forecast',
        description:
          'Consulta una corrida de pronóstico delimitada (ForecastRun). Incluye el modelo evaluado, verificación obligatoria contra el baseline ingenuo (Hito 5), métricas de backtesting (MAE/RMSE) y abanicos de incertidumbre P10-P50-P90.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Identificador único del pronóstico (ej. forecast-bcentral-tpm-2024)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'validate_chart_spec',
        description:
          'Valida una especificación gráfica reproducible ChartSpec (Vega-Lite) contra las reglas anti-manipulación (ejes truncados engañosos, disparidad de doble eje, discontinuidad temporal y rechazo de causalidad espuria).',
        inputSchema: {
          type: 'object',
          properties: {
            chartSpec: {
              type: 'object',
              description: 'Objeto de especificación gráfica ChartSpec con snapshot tabular',
            },
          },
          required: ['chartSpec'],
        },
      },
    ]
  }

  public async handleRequest(request: McpRequest): Promise<McpResponse> {
    const id = request.id ?? null

    if (
      (typeof id !== 'string' && typeof id !== 'number' && id !== null) ||
      (typeof id === 'string' && id.length > 128) ||
      (typeof id === 'number' && !Number.isSafeInteger(id)) ||
      typeof request.method !== 'string' ||
      request.method.length > 100 ||
      (request.params !== undefined &&
        (!request.params || typeof request.params !== 'object' || Array.isArray(request.params)))
    ) {
      return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }
    }

    if (request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
      }
    }

    try {
      if (request.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: this.getToolDefinitions(),
          },
        }
      }

      if (request.method === 'tools/call') {
        const params = request.params as { name?: unknown; arguments?: unknown } | undefined
        if (!params || typeof params.name !== 'string') {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params: tool name is required' },
          }
        }

        if (
          params.arguments !== undefined &&
          (!params.arguments ||
            typeof params.arguments !== 'object' ||
            Array.isArray(params.arguments))
        ) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params: arguments must be an object' },
          }
        }
        if (params.name.length > 100) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params: tool name is too long' },
          }
        }
        const toolArgs = (params.arguments ?? {}) as Record<string, unknown>
        const toolResult = await this.executeTool(params.name, toolArgs)

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(toolResult, null, 2),
              },
            ],
          },
        }
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      }
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: {
                    code: error.code,
                    message: error.message,
                    status: error.status,
                  },
                }),
              },
            ],
            isError: true,
          },
        }
      }

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
        },
      }
    }
  }

  private async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'get_claim': {
        const claimId = String(args.id ?? '')
        if (!claimId) {
          throw new ApiError('E_VALIDATION', 'Parameter "id" is required for get_claim', 422)
        }
        return this.dependencies.getPublicClaim.execute(claimId)
      }

      case 'search_evidence': {
        if (typeof args.queryText !== 'string') {
          throw new ApiError('E_VALIDATION', 'Parameter "queryText" must be a string', 422)
        }
        const queryText = args.queryText.trim()
        if (queryText.length < 3 || queryText.length > 500) {
          throw new ApiError(
            'E_VALIDATION',
            'Parameter "queryText" must contain between 3 and 500 characters',
            422
          )
        }
        if (args.sourceFilters !== undefined && !Array.isArray(args.sourceFilters)) {
          throw new ApiError('E_VALIDATION', 'Parameter "sourceFilters" must be an array', 422)
        }
        const rawFilters = args.sourceFilters as unknown[] | undefined
        if (
          rawFilters &&
          (rawFilters.length > 10 ||
            rawFilters.some(
              (f) => typeof f !== 'string' || f.trim().length === 0 || f.length > 160
            ))
        ) {
          throw new ApiError(
            'E_VALIDATION',
            'Parameter "sourceFilters" is invalid or too large',
            422
          )
        }
        const sourceFilters = rawFilters?.map((f) => (f as string).trim())
        return this.dependencies.chunkRetriever.retrieveChunks({ queryText, sourceFilters })
      }

      case 'get_statistical_series': {
        const seriesId = typeof args.seriesId === 'string' ? args.seriesId.trim() : ''
        if (!seriesId || seriesId.length > 160) {
          throw new ApiError('E_VALIDATION', 'Parameter "seriesId" is required', 422)
        }
        const vintageId = args.vintageId ? String(args.vintageId) : undefined
        const fromPeriod = args.fromPeriod ? String(args.fromPeriod) : undefined
        const toPeriod = args.toPeriod ? String(args.toPeriod) : undefined

        return this.dependencies.statisticsService.getObservations(seriesId, {
          vintageId,
          fromPeriod,
          toPeriod,
        })
      }

      case 'get_forecast': {
        const forecastId = String(args.id ?? '')
        if (!forecastId) {
          throw new ApiError('E_VALIDATION', 'Parameter "id" is required for get_forecast', 422)
        }
        return this.dependencies.statisticsService.getForecast(forecastId)
      }

      case 'validate_chart_spec': {
        const chartSpec = args.chartSpec as Parameters<ValidateChartSpecService['execute']>[0]
        if (!chartSpec || typeof chartSpec !== 'object') {
          throw new ApiError(
            'E_VALIDATION',
            'Parameter "chartSpec" must be an object for validate_chart_spec',
            422
          )
        }
        return this.dependencies.validateChartSpecService.execute(chartSpec)
      }

      default:
        throw new ApiError(
          'E_TOOL_NOT_FOUND',
          `Tool "${name}" is not implemented in MCP server`,
          404
        )
    }
  }
}
