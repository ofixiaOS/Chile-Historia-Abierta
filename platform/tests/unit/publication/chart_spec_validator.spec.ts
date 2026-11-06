import {
  assertSnapshotIntegrity,
  validateAntiManipulation,
} from '#modules/publication/domain/anti_manipulation_validator'
import {
  calculateDataSnapshotHash,
  calculateQueryHash,
  type DataSnapshot,
} from '#modules/publication/domain/chart_spec'
import { test } from '@japa/runner'

test.group('ChartSpec Anti-Manipulation Validator (Unit)', () => {
  const seriesData = {
    tpm: [
      { period: '2020', value: 0.5 },
      { period: '2021', value: 4.0 },
      { period: '2022', value: 11.25 },
    ],
  }
  const validSnapshot: DataSnapshot = {
    contentHash: calculateDataSnapshotHash(seriesData),
    series: seriesData,
  }

  test('calculates deterministic queryHash and dataSnapshotHash', ({ assert }) => {
    const queryHash1 = calculateQueryHash({
      method: 'series_trend',
      series: [{ seriesId: 'tpm', unit: '%' }],
      events: [],
      timeRange: { from: '2020', to: '2022' },
      transformations: [],
    })

    const queryHash2 = calculateQueryHash({
      method: 'series_trend',
      series: [{ seriesId: 'tpm', unit: '%' }],
      events: [],
      timeRange: { from: '2020', to: '2022' },
      transformations: [],
    })

    assert.equal(queryHash1, queryHash2)
    assert.match(queryHash1, /^[a-f0-9]{64}$/)
  })

  test('detects and warns on truncated axis', ({ assert }) => {
    const evaluation = validateAntiManipulation({
      title: 'Tasa de Política Monetaria con eje truncado',
      description: 'Prueba de visualización con distorsión de escala',
      method: 'series_trend',
      series: [
        {
          seriesId: 'tpm',
          label: 'TPM',
          unit: '%',
          scale: { zero: false, domain: [8, 12] },
        },
      ],
      events: [],
      timeRange: { from: '2020', to: '2022' },
      transformations: [],
      dataSnapshot: validSnapshot,
      sources: ['bcentral-bde'],
      limitations: [],
    })

    const truncatedWarning = evaluation.warnings.find((w) => w.code === 'TRUNCATED_AXIS')
    assert.isDefined(truncatedWarning)
    assert.include(truncatedWarning?.message, 'no inicia en cero')
  })

  test('detects and warns on dual axis disparity when units differ', ({ assert }) => {
    const evaluation = validateAntiManipulation({
      title: 'Comparación con unidades dispares',
      description: '',
      method: 'descriptive_comparison',
      series: [
        { seriesId: 'tpm', label: 'TPM', unit: '%' },
        { seriesId: 'pib', label: 'PIB Real', unit: 'Millones CLP' },
      ],
      events: [],
      timeRange: { from: '2020', to: '2022' },
      transformations: [],
      dataSnapshot: validSnapshot,
      sources: ['bcentral-bde'],
      limitations: [],
    })

    const dualAxisWarning = evaluation.warnings.find((w) => w.code === 'DUAL_AXIS_DISPARITY')
    assert.isDefined(dualAxisWarning)
    assert.include(dualAxisWarning?.message, 'unidades distintas')
  })

  test('detects temporal discontinuity gap in data snapshot', ({ assert }) => {
    const discontinuousSeries = {
      tpm: [
        { period: '2010', value: 3.0 },
        { period: '2020', value: 0.5 }, // 10 year gap
      ],
    }
    const discontinuousSnapshot: DataSnapshot = {
      contentHash: calculateDataSnapshotHash(discontinuousSeries),
      series: discontinuousSeries,
    }

    const evaluation = validateAntiManipulation({
      title: 'Serie con salto temporal',
      description: '',
      method: 'series_trend',
      series: [{ seriesId: 'tpm', label: 'TPM', unit: '%' }],
      events: [],
      timeRange: { from: '2010', to: '2020' },
      transformations: [],
      dataSnapshot: discontinuousSnapshot,
      sources: ['bcentral-bde'],
      limitations: [],
    })

    const gapWarning = evaluation.warnings.find((w) => w.code === 'DATA_DISCONTINUITY')
    assert.isDefined(gapWarning)
    assert.include(gapWarning?.message, 'discontinuidad temporal de 10 años')
  })

  test('rejects causal_inference method without documented methodology or assumptions', ({
    assert,
  }) => {
    assert.throws(
      () =>
        validateAntiManipulation({
          title: 'Afirmación causal espuria',
          description: '',
          method: 'causal_inference',
          series: [{ seriesId: 'tpm', label: 'TPM', unit: '%' }],
          events: [],
          timeRange: { from: '2020', to: '2022' },
          transformations: [],
          dataSnapshot: validSnapshot,
          sources: ['bcentral-bde'],
          limitations: ['Sin detalles econométricos'],
        }),
      /Un análisis causal requiere registrar explícitamente supuestos de identificación o metodología/
    )
  })

  test('assertSnapshotIntegrity rejects mismatched snapshot hash', ({ assert }) => {
    assert.throws(
      () =>
        assertSnapshotIntegrity(
          {
            contentHash: 'tampered_declared_hash_0000000000000000000000000000000000000000000',
            series: validSnapshot.series,
          },
          validSnapshot.contentHash
        ),
      /El contentHash del snapshot no coincide/
    )
  })
})
