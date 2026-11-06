import { StatisticsService } from '#modules/statistics/application/statistics_service'
import InMemoryStatisticsRepository, {
  pilotForecasts,
  pilotSeries,
  pilotVintages,
} from '#modules/statistics/infrastructure/in_memory_statistics_repository'
import ApiError from '#shared/errors/api_error'
import { test } from '@japa/runner'

test.group('StatisticsService — pertenencia de vintages', () => {
  test('acepta un vintage propio y rechaza uno de otra serie', async ({ assert }) => {
    const repository = new InMemoryStatisticsRepository()
    const service = new StatisticsService(repository)
    const foreignSeriesId = 'synthetic-foreign-series-unit'
    const foreignVintageId = 'synthetic-foreign-vintage-unit'

    await repository.saveSeries({ ...pilotSeries[0]!, id: foreignSeriesId, currentVintageId: '' })
    await repository.saveVintage({
      ...pilotVintages[0]!,
      id: foreignVintageId,
      seriesId: foreignSeriesId,
    })

    const valid = await service.getObservations('bcentral-tpm', {
      vintageId: pilotVintages[0]!.id,
    })
    assert.equal(valid.vintage.seriesId, valid.series.id)

    try {
      await service.getObservations('bcentral-tpm', { vintageId: foreignVintageId })
      assert.fail('Un vintage ajeno no debe aparecer bajo otra serie')
    } catch (error: unknown) {
      assert.instanceOf(error, ApiError)
      assert.equal((error as ApiError).code, 'E_NOT_FOUND')
      assert.equal((error as ApiError).status, 404)
    }
  })

  test('no entrega un pronóstico ligado a un vintage de otra serie', async ({ assert }) => {
    const repository = new InMemoryStatisticsRepository()
    const service = new StatisticsService(repository)
    const foreignSeriesId = 'synthetic-foreign-forecast-series'
    const foreignVintageId = 'synthetic-foreign-forecast-vintage'
    const invalidForecastId = 'synthetic-cross-series-forecast'

    await repository.saveSeries({ ...pilotSeries[0]!, id: foreignSeriesId, currentVintageId: '' })
    await repository.saveVintage({
      ...pilotVintages[0]!,
      id: foreignVintageId,
      seriesId: foreignSeriesId,
    })
    await repository.saveForecast({
      ...pilotForecasts[0]!,
      id: invalidForecastId,
      targetVintageId: foreignVintageId,
    })

    const valid = await service.getForecast(pilotForecasts[0]!.id)
    assert.equal(valid.seriesId, 'bcentral-tpm')

    try {
      await service.getForecast(invalidForecastId)
      assert.fail('Un pronóstico con procedencia incongruente no debe publicarse')
    } catch (error: unknown) {
      assert.instanceOf(error, ApiError)
      assert.equal((error as ApiError).code, 'E_DATA_INTEGRITY')
      assert.equal((error as ApiError).status, 503)
    }
  })
})
