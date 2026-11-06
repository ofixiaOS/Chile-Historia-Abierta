import { calculateDataSnapshotHash } from '#modules/publication/domain/chart_spec'
import { McpServer } from '#modules/interoperability/application/mcp_server'
import { mcpServer } from '#modules/interoperability/infrastructure/public_interoperability'
import { test } from '@japa/runner'

test.group('MCP Server (Unit)', () => {
  test('tools/list retorna las 5 herramientas de solo lectura con esquemas válidos', async ({
    assert,
  }) => {
    const response = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'req-1',
      method: 'tools/list',
    })

    assert.equal(response.id, 'req-1')
    assert.isUndefined(response.error)
    assert.isDefined(response.result)

    const tools = response.result!.tools as readonly { name: string; description: string }[]
    assert.equal(tools.length, 5)

    const names = tools.map((t) => t.name)
    assert.include(names, 'get_claim')
    assert.include(names, 'search_evidence')
    assert.include(names, 'get_statistical_series')
    assert.include(names, 'get_forecast')
    assert.include(names, 'validate_chart_spec')
  })

  test('tools/call ejecuta get_claim y retorna sobre factual en formato text', async ({
    assert,
  }) => {
    const response = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'req-2',
      method: 'tools/call',
      params: {
        name: 'get_claim',
        arguments: { id: 'fixture-claim-001' },
      },
    })

    assert.equal(response.id, 'req-2')
    assert.isUndefined(response.error)
    assert.isDefined(response.result)

    const content = response.result!.content as readonly { type: string; text: string }[]
    assert.equal(content[0]!.type, 'text')

    const parsed = JSON.parse(content[0]!.text)
    assert.equal(parsed.data.id, 'fixture-claim-001')
    assert.isDefined(parsed.data.attributes.statement)
    assert.equal(parsed.evidenceStatus, 'documented')
  })

  test('tools/call ejecuta search_evidence y retorna fragmentos documentales', async ({
    assert,
  }) => {
    const response = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'req-3',
      method: 'tools/call',
      params: {
        name: 'search_evidence',
        arguments: { queryText: 'política monetaria Banco Central' },
      },
    })

    assert.isUndefined(response.error)
    const content = response.result!.content as readonly { type: string; text: string }[]
    const results = JSON.parse(content[0]!.text)
    assert.isArray(results)
    assert.isAbove(results.length, 0)
    assert.equal(results[0].id, 'chunk-bcentral-tpm-2024')
  })

  test('tools/call ejecuta get_statistical_series y retorna serie con observaciones', async ({
    assert,
  }) => {
    const response = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'req-4',
      method: 'tools/call',
      params: {
        name: 'get_statistical_series',
        arguments: {
          seriesId: 'bcentral-tpm',
          fromPeriod: '2024-01',
          toPeriod: '2024-04',
        },
      },
    })

    assert.isUndefined(response.error)
    const content = response.result!.content as readonly { type: string; text: string }[]
    const result = JSON.parse(content[0]!.text)
    assert.equal(result.series.id, 'bcentral-tpm')
    assert.equal(result.observations.length, 4)
  })

  test('tools/call ejecuta get_forecast y retorna corrida con bandas P10-P50-P90', async ({
    assert,
  }) => {
    const response = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'req-5',
      method: 'tools/call',
      params: {
        name: 'get_forecast',
        arguments: { id: 'forecast-bcentral-tpm-2024' },
      },
    })

    assert.isUndefined(response.error)
    const content = response.result!.content as readonly { type: string; text: string }[]
    const run = JSON.parse(content[0]!.text)
    assert.equal(run.id, 'forecast-bcentral-tpm-2024')
    assert.equal(run.beatsBaseline, true)
    assert.equal(run.epistemicStatus, 'forecast')
    assert.isAbove(run.forecastPoints.length, 0)
  })

  test('tools/call ejecuta validate_chart_spec y detecta advertencia de eje truncado', async ({
    assert,
  }) => {
    const seriesData = {
      tpm: [
        { period: '2021', value: 4.0 },
        { period: '2022', value: 11.25 },
      ],
    }
    const contentHash = calculateDataSnapshotHash(seriesData)

    const response = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'req-6',
      method: 'tools/call',
      params: {
        name: 'validate_chart_spec',
        arguments: {
          chartSpec: {
            title: 'Gráfico con eje truncado',
            description: '',
            method: 'series_trend',
            series: [
              {
                seriesId: 'tpm',
                label: 'TPM',
                unit: '%',
                scale: { zero: false, domain: [3.5, 12] },
              },
            ],
            events: [],
            timeRange: { from: '2021', to: '2022' },
            transformations: [],
            dataSnapshot: {
              contentHash,
              series: seriesData,
            },
            sources: ['bcentral-bde'],
            limitations: [],
          },
        },
      },
    })

    assert.isUndefined(response.error)
    const content = response.result!.content as readonly { type: string; text: string }[]
    const evalResult = JSON.parse(content[0]!.text)
    assert.isTrue(evalResult.valid)
    assert.isAbove(evalResult.warnings.length, 0)
    assert.equal(evalResult.warnings[0].code, 'TRUNCATED_AXIS')
  })

  test('retorna error JSON-RPC ante método o tool no existente', async ({ assert }) => {
    const unknownMethodRes = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'req-err-1',
      method: 'unknown/method',
    })
    assert.equal(unknownMethodRes.error?.code, -32601)

    const unknownToolRes = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'req-err-2',
      method: 'tools/call',
      params: { name: 'mutar_historia_oficial' },
    })
    assert.isTrue(unknownToolRes.result?.isError)
  })

  test('rechaza búsquedas MCP excesivas y argumentos que no son objetos', async ({ assert }) => {
    const longQuery = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'bounded-query',
      method: 'tools/call',
      params: { name: 'search_evidence', arguments: { queryText: 'x'.repeat(501) } },
    })
    assert.isTrue(longQuery.result?.isError)
    assert.include(JSON.stringify(longQuery.result), '500')

    const invalidArguments = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'invalid-args',
      method: 'tools/call',
      params: {
        name: 'search_evidence',
        arguments: ['unexpected'] as unknown as Record<string, unknown>,
      },
    })
    assert.equal(invalidArguments.error?.code, -32602)
  })

  test('oculta mensajes de excepciones inesperadas al cliente MCP', async ({ assert }) => {
    const brokenServer = new McpServer({} as never)
    const response = await brokenServer.handleRequest({
      jsonrpc: '2.0',
      id: 'unexpected-error',
      method: 'tools/call',
      params: { name: 'search_evidence', arguments: { queryText: 'consulta valida' } },
    })

    assert.equal(response.error?.code, -32603)
    assert.equal(response.error?.message, 'Internal error')
    assert.notInclude(JSON.stringify(response), 'Cannot read')
  })
})
