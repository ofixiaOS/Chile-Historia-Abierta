import { calculateDataSnapshotHash } from '#modules/publication/domain/chart_spec'
import type { ValidateChartSpecResult } from '#modules/publication/application/validate_chart_spec_service'
import { readJsonBody, type ApiErrorResponse } from '#tests/helpers/http_json'
import { test } from '@japa/runner'

test.group('POST /v1/chart-specs/validate', () => {
  const seriesData = {
    tpm: [
      { period: '2021', value: 4.0 },
      { period: '2022', value: 11.25 },
    ],
  }
  const contentHash = calculateDataSnapshotHash(seriesData)

  test('validates a correct ChartSpec and returns queryHash and dataHash', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/v1/chart-specs/validate').json({
      title: 'Evolución de la TPM 2021-2022',
      description: 'Datos oficiales del Banco Central de Chile',
      method: 'series_trend',
      series: [
        {
          seriesId: 'tpm',
          label: 'Tasa de Política Monetaria',
          unit: '% anual',
        },
      ],
      timeRange: { from: '2021', to: '2022' },
      dataSnapshot: {
        contentHash,
        series: seriesData,
      },
    })

    response.assertStatus(200)
    const body = readJsonBody<ValidateChartSpecResult>(response)
    assert.isTrue(body.valid)
    assert.isString(body.queryHash)
    assert.isString(body.dataHash)
    assert.isArray(body.warnings)
    assert.isEmpty(body.warnings)
    assert.equal(body.normalizedSpec.renderer.name, 'vega-lite')
    assert.equal(body.normalizedSpec.renderer.version, '5.21.0')
  })

  test('reports anti-manipulation warning for truncated axis', async ({ client, assert }) => {
    const response = await client.post('/v1/chart-specs/validate').json({
      title: 'Evolución con eje truncado',
      method: 'series_trend',
      series: [
        {
          seriesId: 'tpm',
          label: 'TPM',
          unit: '% anual',
          scale: { zero: false, domain: [3.5, 12] },
        },
      ],
      timeRange: { from: '2021', to: '2022' },
      dataSnapshot: {
        contentHash,
        series: seriesData,
      },
    })

    response.assertStatus(200)
    const body = readJsonBody<ValidateChartSpecResult>(response)
    assert.isTrue(body.valid)
    assert.lengthOf(body.warnings, 1)
    assert.equal(body.warnings[0].code, 'TRUNCATED_AXIS')
  })

  test('rejects payload when snapshot contentHash is mismatched', async ({ client, assert }) => {
    const response = await client.post('/v1/chart-specs/validate').json({
      title: 'Gráfico con hash adulterado',
      method: 'series_trend',
      series: [{ seriesId: 'tpm', label: 'TPM', unit: '%' }],
      timeRange: { from: '2021', to: '2022' },
      dataSnapshot: {
        contentHash: 'hash_falso_adulterado_0000000000000000000000000000000000000000000000',
        series: seriesData,
      },
    })

    response.assertStatus(422)
    const body = readJsonBody<ApiErrorResponse>(response)
    assert.equal(body.error.code, 'E_VALIDATION')
    assert.include(body.error.message, 'contentHash del snapshot no coincide')
  })

  test('rejects causal_inference method without documented methodology in limitations', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/v1/chart-specs/validate').json({
      title: 'Afirmación causal no demostrada',
      method: 'causal_inference',
      series: [{ seriesId: 'tpm', label: 'TPM', unit: '%' }],
      timeRange: { from: '2021', to: '2022' },
      dataSnapshot: {
        contentHash,
        series: seriesData,
      },
      limitations: ['Sin detalles'],
    })

    response.assertStatus(422)
    const body = readJsonBody<ApiErrorResponse>(response)
    assert.equal(body.error.code, 'E_VALIDATION')
    assert.include(body.error.message, 'análisis causal requiere registrar explícitamente')
  })

  test('rechaza snapshots con más de 10000 observaciones antes de hashear', async ({
    client,
    assert,
  }) => {
    const manyRows = Array.from({ length: 10_001 }, (_, index) => ({
      period: String(index),
      value: index,
    }))
    const response = await client.post('/v1/chart-specs/validate').json({
      title: 'Snapshot excesivo',
      method: 'series_trend',
      series: [{ seriesId: 'tpm', label: 'TPM', unit: '%' }],
      timeRange: { from: '0', to: '10000' },
      dataSnapshot: { contentHash: 'not-calculated', series: { tpm: manyRows } },
    })

    response.assertStatus(422)
    assert.include(readJsonBody<ApiErrorResponse>(response).error.message, '10000 observaciones')
  })

  test('limita solicitudes repetidas de validación por IP y ruta', async ({ client, assert }) => {
    let response
    let attempts = 0
    do {
      response = await client.post('/v1/chart-specs/validate').json({})
      attempts += 1
      assert.isTrue(response.status() === 422 || response.status() === 429)
    } while (response.status() !== 429 && attempts < 61)

    response.assertStatus(429)
    assert.isAbove(Number(response.header('retry-after')), 0)
    assert.equal(readJsonBody<ApiErrorResponse>(response).error.code, 'E_RATE_LIMITED')
  })
})
