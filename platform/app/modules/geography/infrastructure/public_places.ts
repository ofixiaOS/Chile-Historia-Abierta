import { PlaceService } from '#modules/geography/application/place_service'
import type { PlaceRepository } from '#modules/geography/application/place_service'
import { InMemoryPlaceRepository } from '#modules/geography/infrastructure/in_memory_place_repository'
import { PostgresPlaceRepository } from '#modules/geography/infrastructure/postgres_place_repository'
import env from '#start/env'
import { shouldSeedFixtures } from '#shared/fixtures/fixture_policy'
import { pilotAttestations } from '#modules/geography/infrastructure/in_memory_place_repository'

export const placeRepository: PlaceRepository =
  env.get('PLACE_REPOSITORY') === 'postgres'
    ? new PostgresPlaceRepository('admin', 'public')
    : new InMemoryPlaceRepository(shouldSeedFixtures(env.get('NODE_ENV')) ? pilotAttestations : [])

export const placeService = new PlaceService(placeRepository)
