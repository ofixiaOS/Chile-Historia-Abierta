import {
  StatisticsService,
  type StatisticsRepository,
} from '#modules/statistics/application/statistics_service'
import { ForecastEvaluator } from '#modules/statistics/application/forecast_evaluator'
import InMemoryStatisticsRepository from '#modules/statistics/infrastructure/in_memory_statistics_repository'
import PostgresStatisticsRepository from '#modules/statistics/infrastructure/postgres_statistics_repository'
import env from '#start/env'
import { shouldSeedFixtures } from '#shared/fixtures/fixture_policy'

export const statisticsRepository: StatisticsRepository =
  env.get('STATISTICS_REPOSITORY') === 'postgres'
    ? new PostgresStatisticsRepository('public')
    : new InMemoryStatisticsRepository(shouldSeedFixtures(env.get('NODE_ENV')))

export const statisticsService = new StatisticsService(statisticsRepository)
export const forecastEvaluator = new ForecastEvaluator()
