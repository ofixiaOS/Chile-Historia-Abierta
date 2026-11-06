import GetExplorationReadModel from '#modules/evidence/application/get_exploration_read_model'
import GetPublicClaim from '#modules/evidence/application/get_public_claim'
import ListPublicClaims from '#modules/evidence/application/list_public_claims'
import InMemoryClaimRepository from '#modules/evidence/infrastructure/in_memory_claim_repository'
import PostgresClaimRepository from '#modules/evidence/infrastructure/postgres_claim_repository'
import env from '#start/env'
import { shouldSeedFixtures } from '#shared/fixtures/fixture_policy'

/**
 * Memory remains explicit for fixtures; PostgreSQL is selected by environment.
 */
const repository =
  env.get('CLAIM_REPOSITORY') === 'postgres'
    ? new PostgresClaimRepository()
    : new InMemoryClaimRepository(shouldSeedFixtures(env.get('NODE_ENV')))

export const getPublicClaim = new GetPublicClaim(repository)
export const listPublicClaims = new ListPublicClaims(repository)
export const getExplorationReadModel = new GetExplorationReadModel(repository)
