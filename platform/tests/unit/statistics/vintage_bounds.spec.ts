import { assertVintageIntegrity, type SeriesVintage } from '#modules/statistics/domain/series'
import { test } from '@japa/runner'

test.group('Series vintage payload bounds', () => {
  function vintage(observations: SeriesVintage['observations']): SeriesVintage {
    return {
      id: 'vintage-bounds-test',
      seriesId: 'series-bounds-test',
      vintageDate: '2026-09-23T00:00:00.000Z',
      coverageStart: 'p0',
      coverageEnd: 'p1',
      observations,
      contentHash: '1'.repeat(64),
    }
  }

  test('rechaza más de 10.000 observaciones', ({ assert }) => {
    const observations = Array.from({ length: 10_001 }, (_, index) => ({
      period: `p${index}`,
      value: 1,
      status: 'normal' as const,
      unit: '%',
    }))

    let error: unknown
    try {
      assertVintageIntegrity(vintage(observations))
    } catch (caught) {
      error = caught
    }
    assert.isDefined(error)
    assert.include((error as Error).message, '10000')
  })

  test('rechaza un payload JSON superior a 2 MiB', ({ assert }) => {
    const observations = Array.from({ length: 5_000 }, (_, index) => ({
      period: `p${index}`,
      value: 1,
      status: 'normal' as const,
      unit: '%',
      locator: 'x'.repeat(512),
    }))

    let error: unknown
    try {
      assertVintageIntegrity(vintage(observations))
    } catch (caught) {
      error = caught
    }
    assert.isDefined(error)
    assert.include((error as Error).message, '2097152 bytes')
  })
})
