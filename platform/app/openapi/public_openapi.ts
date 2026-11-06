export const publicOpenApi = {
  openapi: '3.1.0',
  info: {
    title: 'Chile Historia Abierta API',
    version: '0.1.0',
    description:
      'API pública orientada a evidencia. El corte actual expone fixtures técnicos y datos de ingesta piloto con frontera de lectura pública.',
  },
  paths: {
    '/v1/claims': {
      get: {
        operationId: 'listClaims',
        summary: 'Lista colecciones de claims públicos con cursor opaco y filtros',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'cursor',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'evidenceStatus',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['documented', 'inferred', 'disputed', 'hypothesis', 'forecast', 'unknown'],
            },
          },
          {
            name: 'sourceType',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: [
                'primary_archive',
                'official_statistical',
                'official_administrative',
                'academic_research',
                'secondary_historiography',
                'press',
                'testimony',
                'community_post',
                'ai_output',
              ],
            },
          },
          {
            name: 'q',
            in: 'query',
            required: false,
            schema: { type: 'string', maxLength: 256 },
          },
          {
            name: 'If-None-Match',
            in: 'header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Colección paginada de claims con sobre factual',
            headers: {
              'ETag': { schema: { type: 'string' } },
              'Cache-Control': { schema: { type: 'string' } },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ListPublicClaimsResponse' },
              },
            },
          },
          '304': { description: 'La representación no cambió' },
          '422': {
            description: 'Parámetros de consulta o cursor inválidos',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/claims/{id}': {
      get: {
        operationId: 'getClaim',
        summary: 'Obtiene la revisión pública vigente de un claim',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', minLength: 1, maxLength: 128 },
          },
          {
            name: 'If-None-Match',
            in: 'header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Claim con fuentes y estado de evidencia',
            headers: {
              'ETag': { schema: { type: 'string' } },
              'Cache-Control': { schema: { type: 'string' } },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicClaimResponse' },
              },
            },
          },
          '304': { description: 'La representación no cambió' },
          '404': {
            description: 'Claim inexistente o no público',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '422': {
            description: 'Identificador inválido o sobre de evidencia insuficiente',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/explore': {
      get: {
        operationId: 'exploreReadModel',
        summary:
          'Read model coordinado para exploración de timeline, lista y mapa con facetas (ADR 0003)',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'cursor',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'evidenceStatus',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['documented', 'inferred', 'disputed', 'hypothesis', 'forecast', 'unknown'],
            },
          },
          {
            name: 'sourceType',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: [
                'primary_archive',
                'official_statistical',
                'official_administrative',
                'academic_research',
                'secondary_historiography',
                'press',
                'testimony',
                'community_post',
                'ai_output',
              ],
            },
          },
          {
            name: 'q',
            in: 'query',
            required: false,
            schema: { type: 'string', maxLength: 256 },
          },
          {
            name: 'If-None-Match',
            in: 'header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Read model de exploración con items, facetas y rango temporal',
            headers: {
              'ETag': { schema: { type: 'string' } },
              'Cache-Control': { schema: { type: 'string' } },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExplorationResponse' },
              },
            },
          },
          '304': { description: 'La representación no cambió' },
          '422': {
            description: 'Parámetros de consulta o cursor inválidos',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/chart-specs/validate': {
      post: {
        operationId: 'validateChartSpec',
        summary: 'Valida un ChartSpec reproducible y detecta advertencias anti-manipulacion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Resultado de validacion y advertencias calculadas',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChartSpecValidationResponse' },
              },
            },
          },
          '422': {
            description: 'ChartSpec invalido o violacion de reglas anti-manipulacion',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '429': {
            description: 'Límite de solicitudes por IP y ruta alcanzado',
            headers: { 'Retry-After': { schema: { type: 'integer' } } },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/publications': {
      post: {
        operationId: 'createPublication',
        summary: 'Crea una publicacion editorial en piloto cerrado',
        description:
          'Requiere token editorial configurado en el servidor. El autor se deriva de la identidad autenticada y el campo author del cuerpo se ignora.',
        security: [{ PilotEditorBearer: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Publicacion creada exitosamente',
            content: {
              'application/json': { schema: { type: 'object' } },
            },
          },
          '401': {
            description: 'Credencial editorial ausente o inválida',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '503': {
            description:
              'Escritura editorial deshabilitada por falta de configuración o en producción hasta aislar el proceso escritor',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '422': {
            description: 'Requisitos epistemologicos por tipo de publicacion no cumplidos',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/publications/{id}': {
      get: {
        operationId: 'getPublication',
        summary:
          'Obtiene una publicacion citable con ChartSpec reproducible y datos tabulares accesibles',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'If-None-Match',
            in: 'header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Publicacion con sobre factual, advertencias y datos tabulares',
            headers: {
              'ETag': { schema: { type: 'string' } },
              'Cache-Control': { schema: { type: 'string' } },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicPublicationResponse' },
              },
            },
          },
          '304': { description: 'La representacion no cambio' },
          '404': {
            description: 'Publicacion no encontrada',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/publications/{id}/comments': {
      get: {
        operationId: 'listPublicationComments',
        summary: 'Lista comentarios asociados a una publicación',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 0, maximum: 10000, default: 0 },
          },
        ],
        responses: {
          '200': {
            description:
              'Página de comentarios activos en orden cronológico con total y enlaces de navegación',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { type: 'object' } },
                    total: { type: 'integer' },
                    limit: { type: 'integer' },
                    offset: { type: 'integer' },
                    links: { type: 'object' },
                  },
                },
              },
            },
          },
          '422': { description: 'Paginación inválida' },
        },
      },
      post: {
        operationId: 'addPublicationComment',
        summary: 'Escritura de comentarios deshabilitada hasta habilitar identidad individual',
        deprecated: true,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '503': {
            description: 'Escritura comunitaria deshabilitada',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/publications/{id}/votes': {
      get: {
        operationId: 'getPublicationVotes',
        summary: 'Obtiene el conteo transparente de reacciones comunitarias',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Conteo de votos por tipo' },
        },
      },
      post: {
        operationId: 'castPublicationVote',
        summary: 'Escritura de votos deshabilitada hasta habilitar identidad individual',
        deprecated: true,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '503': {
            description: 'Escritura comunitaria deshabilitada',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/reports': {
      post: {
        operationId: 'reportContent',
        summary: 'Reportes deshabilitados hasta habilitar identidad y control de abuso',
        deprecated: true,
        responses: {
          '503': {
            description: 'Escritura comunitaria deshabilitada',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/assistance/query': {
      post: {
        operationId: 'queryAssistance',
        summary: 'Consulta asistida con evidencia y verificación estricta de citas',
        description:
          'Sintetiza hechos históricos respaldados únicamente por chunks canónicos verificados. Falla cerrado con abstención ("NO VERIFICADO") ante falta de evidencia, intento de prompt injection o alucinación de citas.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AssistanceQueryRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Respuesta asistida con citas verificables o abstención explícita',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AssistanceQueryResponse' },
              },
            },
          },
          '422': {
            description: 'Parámetros de consulta inválidos',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '429': {
            description: 'Límite de solicitudes por IP y ruta alcanzado',
            headers: { 'Retry-After': { schema: { type: 'integer' } } },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/series': {
      get: {
        operationId: 'listStatisticalSeries',
        summary: 'Lista series estadísticas disponibles',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 0, maximum: 10000, default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'Página del catálogo con total, límite, offset y enlaces de navegación',
          },
          '422': { description: 'Paginación inválida' },
        },
      },
    },
    '/v1/series/{id}': {
      get: {
        operationId: 'getStatisticalSeries',
        summary: 'Obtiene metadatos y vintage actual de una serie',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Sobre factual con metadatos de la serie y versión' },
          '404': { description: 'Serie no encontrada' },
        },
      },
    },
    '/v1/series/{id}/vintages': {
      get: {
        operationId: 'listSeriesVintages',
        summary: 'Lista el historial de revisiones (vintages) de una serie estadística',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 0, maximum: 10000, default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'Página de resúmenes inmutables de vintages, sin arrays de observaciones',
          },
          '404': { description: 'Serie no encontrada' },
          '422': { description: 'Paginación inválida' },
        },
      },
    },
    '/v1/series/{id}/observations': {
      get: {
        operationId: 'getSeriesObservations',
        summary: 'Obtiene observaciones de una serie estadística con filtros temporales',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'vintageId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'fromPeriod',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'toPeriod',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 1000, default: 500 },
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 0, maximum: 10000, default: 0 },
          },
        ],
        responses: {
          '200': {
            description:
              'Página de observaciones con total filtrado, límite, offset y enlaces de página',
          },
          '404': { description: 'Serie o vintage no encontrado' },
          '422': { description: 'Parámetros temporales inválidos' },
        },
      },
    },
    '/v1/forecasts/{id}': {
      get: {
        operationId: 'getForecast',
        summary: 'Obtiene un pronóstico evaluado con métricas de backtesting contra baseline',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Pronóstico con abanico de incertidumbre y verificación de baseline',
          },
          '404': { description: 'Pronóstico no encontrado' },
        },
      },
    },
    '/v1/claims/{id}/prov': {
      get: {
        operationId: 'getClaimProvO',
        summary: 'Exporta grafo de procedencia W3C PROV-O en JSON-LD para una afirmación',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Grafo W3C PROV-O en formato JSON-LD',
            content: { 'application/ld+json': {} },
          },
          '404': { description: 'Afirmación no encontrada' },
        },
      },
    },
    '/v1/publications/{id}/prov': {
      get: {
        operationId: 'getPublicationProvO',
        summary: 'Exporta grafo de procedencia W3C PROV-O en JSON-LD para una publicación',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Grafo W3C PROV-O en formato JSON-LD',
            content: { 'application/ld+json': {} },
          },
          '404': { description: 'Publicación no encontrada' },
        },
      },
    },
    '/v1/series/{id}/sdmx': {
      get: {
        operationId: 'getSeriesSdmx',
        summary: 'Exporta observaciones de una serie estadística en formato estándar SDMX-JSON 2.1',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'vintageId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Mensaje de datos SDMX-JSON 2.1',
            content: { 'application/vnd.sdmx.data+json': {} },
          },
          '404': { description: 'Serie no encontrada' },
        },
      },
    },
    '/v1/mcp': {
      post: {
        operationId: 'mcpJsonRpc',
        summary: 'Servidor Model Context Protocol (MCP) de solo lectura sobre JSON-RPC 2.0',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['jsonrpc', 'method'],
                properties: {
                  jsonrpc: { type: 'string', enum: ['2.0'] },
                  id: { type: ['string', 'number', 'null'] },
                  method: { type: 'string', enum: ['tools/list', 'tools/call'] },
                  params: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Respuesta JSON-RPC 2.0 del servidor MCP' },
          '422': { description: 'Petición JSON-RPC malformada' },
          '429': {
            description: 'Límite de solicitudes por IP y ruta alcanzado',
            headers: { 'Retry-After': { schema: { type: 'integer' } } },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/places/geojson': {
      get: {
        operationId: 'getPlacesGeoJson',
        summary: 'Obtiene colección GeoJSON RFC 7946 de atestaciones territoriales históricas',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
            description: 'Máximo de atestaciones por página (hasta 500)',
          },
          {
            name: 'cursor',
            in: 'query',
            required: false,
            schema: { type: 'string', maxLength: 4096 },
            description: 'Cursor opaco devuelto en pagination.nextCursor',
          },
          {
            name: 'fromYear',
            in: 'query',
            required: false,
            schema: { type: 'integer' },
            description: 'Año inicial del intervalo histórico',
          },
          {
            name: 'toYear',
            in: 'query',
            required: false,
            schema: { type: 'integer' },
            description: 'Año final del intervalo histórico',
          },
          {
            name: 'territoryType',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['city', 'region', 'province', 'boundary', 'site'],
            },
            description: 'Tipo de demarcación territorial',
          },
          {
            name: 'certainty',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['exact', 'approximate', 'inferred', 'disputed'],
            },
            description: 'Nivel de certeza espacial de la delimitación',
          },
          {
            name: 'placeId',
            in: 'query',
            required: false,
            schema: { type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$' },
            description: 'Identificador estable del lugar',
          },
          {
            name: 'If-None-Match',
            in: 'header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'FeatureCollection GeoJSON con propiedades históricas y licencias',
            headers: {
              'ETag': { schema: { type: 'string' } },
              'Cache-Control': { schema: { type: 'string' } },
            },
            content: {
              'application/geo+json': {
                schema: {
                  type: 'object',
                  required: ['type', 'features', 'pagination'],
                  properties: {
                    type: { type: 'string', enum: ['FeatureCollection'] },
                    pagination: {
                      type: 'object',
                      required: ['limit', 'hasMore', 'nextCursor', 'next'],
                      properties: {
                        limit: { type: 'integer', maximum: 500 },
                        hasMore: { type: 'boolean' },
                        nextCursor: { type: ['string', 'null'] },
                        next: { type: ['string', 'null'] },
                      },
                    },
                    features: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['type', 'id', 'geometry', 'properties'],
                        properties: {
                          type: { type: 'string', enum: ['Feature'] },
                          id: { type: 'string' },
                          geometry: {
                            type: 'object',
                            required: ['type', 'coordinates'],
                            properties: {
                              type: { type: 'string', enum: ['Point'] },
                              coordinates: {
                                type: 'array',
                                items: { type: 'number' },
                                minItems: 2,
                                maxItems: 2,
                              },
                            },
                          },
                          properties: { type: 'object' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '304': { description: 'La representación GeoJSON no cambió' },
          '422': { description: 'Filtros temporales o territoriales inválidos' },
        },
      },
    },
    '/openapi.json': {
      get: {
        operationId: 'getOpenApi',
        summary: 'Obtiene este contrato OpenAPI',
        responses: {
          '200': { description: 'Documento OpenAPI 3.1' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      PilotEditorBearer: {
        type: 'http',
        scheme: 'bearer',
        description: 'Credencial editorial de piloto cerrado; no habilita identidad comunitaria',
      },
    },
    schemas: {
      PublicClaimResponse: {
        type: 'object',
        required: [
          'data',
          'sources',
          'evidenceStatus',
          'asOf',
          'version',
          'freshness',
          'limitations',
          'links',
        ],
        properties: {
          data: { type: 'object' },
          included: { type: 'array', items: {} },
          sources: { type: 'array', minItems: 1, items: { type: 'object' } },
          evidenceStatus: {
            type: 'string',
            enum: ['documented', 'inferred', 'disputed', 'hypothesis', 'forecast', 'unknown'],
          },
          asOf: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          freshness: { type: 'object' },
          limitations: { type: 'array', items: { type: 'string' } },
          links: { type: 'object' },
        },
      },
      ListPublicClaimsResponse: {
        type: 'object',
        required: ['data', 'pagination', 'asOf', 'version', 'freshness', 'links'],
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'id', 'attributes', 'sourceCount', 'links'],
              properties: {
                type: { type: 'string', enum: ['claim'] },
                id: { type: 'string' },
                attributes: { type: 'object' },
                sourceCount: { type: 'integer' },
                links: { type: 'object' },
              },
            },
          },
          pagination: {
            type: 'object',
            required: ['limit', 'nextCursor', 'hasMore'],
            properties: {
              limit: { type: 'integer' },
              nextCursor: { type: ['string', 'null'] },
              hasMore: { type: 'boolean' },
            },
          },
          asOf: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          freshness: { type: 'object' },
          links: {
            type: 'object',
            required: ['self'],
            properties: {
              self: { type: 'string' },
              next: { type: ['string', 'null'] },
            },
          },
        },
      },
      ExplorationResponse: {
        type: 'object',
        required: ['data', 'pagination', 'asOf', 'version', 'freshness', 'links'],
        properties: {
          data: {
            type: 'object',
            required: ['items', 'facets', 'timeRange'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  required: [
                    'id',
                    'statement',
                    'evidenceStatus',
                    'publishedAt',
                    'sourceTypes',
                    'sourceCount',
                  ],
                  properties: {
                    id: { type: 'string' },
                    statement: { type: 'string' },
                    evidenceStatus: { type: 'string' },
                    publishedAt: { type: 'string', format: 'date-time' },
                    sourceTypes: { type: 'array', items: { type: 'string' } },
                    sourceCount: { type: 'integer' },
                  },
                },
              },
              facets: {
                type: 'object',
                required: ['byEvidenceStatus', 'bySourceType', 'totalMatching'],
                properties: {
                  byEvidenceStatus: { type: 'object' },
                  bySourceType: { type: 'object' },
                  totalMatching: { type: 'integer' },
                },
              },
              timeRange: {
                type: 'object',
                required: ['minDate', 'maxDate'],
                properties: {
                  minDate: { type: ['string', 'null'], format: 'date-time' },
                  maxDate: { type: ['string', 'null'], format: 'date-time' },
                },
              },
            },
          },
          pagination: {
            type: 'object',
            required: ['limit', 'nextCursor', 'hasMore'],
            properties: {
              limit: { type: 'integer' },
              nextCursor: { type: ['string', 'null'] },
              hasMore: { type: 'boolean' },
            },
          },
          asOf: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          freshness: { type: 'object' },
          links: {
            type: 'object',
            required: ['self'],
            properties: {
              self: { type: 'string' },
              next: { type: ['string', 'null'] },
            },
          },
        },
      },
      ChartSpecValidationResponse: {
        type: 'object',
        required: ['valid', 'queryHash', 'dataHash', 'warnings', 'normalizedSpec'],
        properties: {
          valid: { type: 'boolean' },
          queryHash: { type: 'string' },
          dataHash: { type: 'string' },
          warnings: {
            type: 'array',
            items: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                field: { type: 'string' },
              },
            },
          },
          normalizedSpec: { type: 'object' },
        },
      },
      PublicPublicationResponse: {
        type: 'object',
        required: ['data', 'asOf', 'version', 'freshness', 'links'],
        properties: {
          data: {
            type: 'object',
            required: [
              'type',
              'id',
              'publicationType',
              'attributes',
              'evidence',
              'limitations',
              'warnings',
            ],
            properties: {
              type: { type: 'string', enum: ['publication'] },
              id: { type: 'string' },
              publicationType: { type: 'string', enum: ['dato', 'interpretacion', 'hipotesis'] },
              attributes: { type: 'object' },
              evidence: { type: 'array', items: { type: 'object' } },
              chartSpec: { type: ['object', 'null'] },
              tabularData: { type: 'object' },
              limitations: { type: 'array', items: { type: 'string' } },
              warnings: { type: 'array', items: { type: 'object' } },
            },
          },
          asOf: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          freshness: { type: 'object' },
          links: {
            type: 'object',
            required: ['self'],
            properties: {
              self: { type: 'string' },
            },
          },
        },
      },
      AssistanceQueryRequest: {
        type: 'object',
        required: ['queryText'],
        properties: {
          queryText: { type: 'string', minLength: 3, maxLength: 500 },
          timeRange: {
            type: 'object',
            properties: {
              fromYear: { type: 'integer', minimum: 1500, maximum: 2100 },
              toYear: { type: 'integer', minimum: 1500, maximum: 2100 },
            },
          },
          sourceFilters: {
            type: 'array',
            maxItems: 10,
            items: { type: 'string' },
          },
        },
      },
      AssistanceQueryResponse: {
        type: 'object',
        required: ['data', 'links'],
        properties: {
          data: {
            type: 'object',
            required: [
              'answer',
              'verification',
              'evidenceStatus',
              'citations',
              'disagreements',
              'abstained',
              'abstentionReason',
              'metrics',
            ],
            properties: {
              answer: { type: 'string' },
              verification: {
                type: 'object',
                description:
                  'Literal matching only covers retrieved fragments, not original-source authenticity or interpretation.',
                required: [
                  'citationStatus',
                  'sourceAuthenticity',
                  'sourceCurrency',
                  'interpretationStatus',
                ],
                properties: {
                  citationStatus: { type: 'string', enum: ['not_checked', 'verified', 'failed'] },
                  sourceAuthenticity: { type: 'string', enum: ['unverified'] },
                  sourceCurrency: { type: 'string', enum: ['unverified'] },
                  interpretationStatus: { type: 'string', enum: ['unverified'] },
                },
              },
              evidenceStatus: {
                type: 'string',
                enum: ['not_verified'],
              },
              citations: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['chunkId', 'sourceId', 'sourceName', 'locator', 'quoteExcerpt'],
                  properties: {
                    chunkId: { type: 'string' },
                    sourceId: { type: 'string' },
                    sourceName: { type: 'string' },
                    locator: {
                      type: 'object',
                      required: ['type', 'value'],
                      properties: {
                        type: { type: 'string' },
                        value: { type: 'string' },
                      },
                    },
                    quoteExcerpt: { type: 'string' },
                  },
                },
              },
              disagreements: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['topic', 'postureA', 'postureB', 'sourcesA', 'sourcesB'],
                  properties: {
                    topic: { type: 'string' },
                    postureA: { type: 'string' },
                    postureB: { type: 'string' },
                    sourcesA: { type: 'array', items: { type: 'string' } },
                    sourcesB: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              abstained: { type: 'boolean' },
              abstentionReason: {
                type: ['string', 'null'],
                enum: [
                  'EVIDENCE_INSUFFICIENT',
                  'POTENTIAL_INJECTION_DETECTED',
                  'CITATION_UNVERIFIED',
                  'INTERPRETATION_UNVERIFIED',
                  'DISPUTE_UNRESOLVED',
                  'OUT_OF_SCOPE',
                  null,
                ],
              },
              metrics: {
                type: 'object',
                required: ['latencyMs', 'tokensEstimated', 'modelId'],
                properties: {
                  latencyMs: { type: 'integer' },
                  tokensEstimated: { type: 'integer' },
                  modelId: { type: 'string' },
                },
              },
            },
          },
          links: {
            type: 'object',
            required: ['self'],
            properties: {
              self: { type: 'string' },
            },
          },
        },
      },
      StatisticalSeries: {
        type: 'object',
        required: [
          'id',
          'concept',
          'providerAgency',
          'sourceId',
          'frequency',
          'baseUnit',
          'methodology',
          'currentVintageId',
          'limitations',
        ],
        properties: {
          id: { type: 'string' },
          concept: { type: 'string' },
          providerAgency: { type: 'string' },
          sourceId: { type: 'string' },
          frequency: {
            type: 'string',
            enum: ['daily', 'monthly', 'quarterly', 'annual'],
          },
          baseUnit: { type: 'string' },
          methodology: { type: 'string' },
          currentVintageId: { type: 'string' },
          limitations: { type: 'array', items: { type: 'string' } },
        },
      },
      Observation: {
        type: 'object',
        required: ['period', 'value', 'status', 'unit'],
        properties: {
          period: { type: 'string' },
          value: { type: 'number' },
          status: {
            type: 'string',
            enum: ['normal', 'provisional', 'revised', 'estimated', 'imputed'],
          },
          unit: { type: 'string' },
          locator: { type: 'string' },
        },
      },
      SeriesVintage: {
        type: 'object',
        required: [
          'id',
          'seriesId',
          'vintageDate',
          'coverageStart',
          'coverageEnd',
          'observations',
          'contentHash',
        ],
        properties: {
          id: { type: 'string' },
          seriesId: { type: 'string' },
          vintageDate: { type: 'string', format: 'date-time' },
          coverageStart: { type: 'string' },
          coverageEnd: { type: 'string' },
          observations: {
            type: 'array',
            items: { $ref: '#/components/schemas/Observation' },
          },
          contentHash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          publicationNotes: { type: 'string' },
        },
      },
      ForecastRun: {
        type: 'object',
        required: [
          'id',
          'seriesId',
          'targetVintageId',
          'modelName',
          'baselineModel',
          'splitPeriod',
          'metric',
          'modelMetricValue',
          'baselineMetricValue',
          'beatsBaseline',
          'forecastHorizon',
          'forecastPoints',
          'epistemicStatus',
          'limitations',
          'generatedAt',
        ],
        properties: {
          id: { type: 'string' },
          seriesId: { type: 'string' },
          targetVintageId: { type: 'string' },
          modelName: { type: 'string' },
          baselineModel: { type: 'string' },
          splitPeriod: { type: 'string' },
          metric: { type: 'string', enum: ['mae', 'rmse', 'mape'] },
          modelMetricValue: { type: 'number' },
          baselineMetricValue: { type: 'number' },
          beatsBaseline: { type: 'boolean' },
          forecastHorizon: { type: 'integer' },
          forecastPoints: {
            type: 'array',
            items: {
              type: 'object',
              required: ['period', 'p10', 'p50', 'p90'],
              properties: {
                period: { type: 'string' },
                p10: { type: 'number' },
                p50: { type: 'number' },
                p90: { type: 'number' },
              },
            },
          },
          epistemicStatus: { type: 'string', enum: ['forecast'] },
          limitations: { type: 'array', items: { type: 'string' } },
          generatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'status', 'requestId'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              status: { type: 'integer' },
              requestId: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
    },
  },
} as const

const publicRateLimitResponse = {
  description: 'Límite local de 60 solicitudes por minuto para esta ruta e IP alcanzado',
  headers: { 'Retry-After': { schema: { type: 'integer' } } },
  content: {
    'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
  },
}

const mutablePublicPaths = publicOpenApi.paths as unknown as Record<string, Record<string, unknown>>
for (const [path, pathItem] of Object.entries(mutablePublicPaths)) {
  if (!path.startsWith('/v1/')) continue
  for (const method of ['get', 'post']) {
    const operation = pathItem[method] as { responses: Record<string, unknown> } | undefined
    if (operation) operation.responses['429'] = publicRateLimitResponse
  }
}
