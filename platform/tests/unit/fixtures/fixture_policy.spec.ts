import { test } from '@japa/runner'
import { shouldSeedFixtures } from '#shared/fixtures/fixture_policy'
import InMemoryClaimRepository from '#modules/evidence/infrastructure/in_memory_claim_repository'
import { InMemoryPlaceRepository } from '#modules/geography/infrastructure/in_memory_place_repository'
import InMemoryStatisticsRepository from '#modules/statistics/infrastructure/in_memory_statistics_repository'

test.group('Public fixture quarantine', () => {
  test('seeds bundled examples only in tests', ({ assert }) => {
    assert.isTrue(shouldSeedFixtures('test'))
    assert.isFalse(shouldSeedFixtures('development'))
    assert.isFalse(shouldSeedFixtures('production'))
  })

  test('starts normal memory repositories without unpublished examples', async ({ assert }) => {
    const claims = new InMemoryClaimRepository(false)
    const places = new InMemoryPlaceRepository([])
    const statistics = new InMemoryStatisticsRepository(false)

    const listedClaims = await claims.findMany({ limit: 10 })
    const listedPlaces = await places.findMany()
    const listedSeries = await statistics.listSeries(10, 0)
    assert.equal(listedClaims.items.length, 0)
    assert.equal(listedPlaces.length, 0)
    assert.equal(listedSeries.items.length, 0)
    assert.isNull(await statistics.findForecastById('forecast-bcentral-tpm-2024'))
  })
})
