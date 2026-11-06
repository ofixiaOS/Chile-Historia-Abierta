import CreatePublicationService from '#modules/publication/application/create_publication_service'
import GetPublicationService from '#modules/publication/application/get_publication_service'
import ValidateChartSpecService from '#modules/publication/application/validate_chart_spec_service'
import InMemoryPublicationRepository from '#modules/publication/infrastructure/in_memory_publication_repository'
import PostgresPublicationRepository from '#modules/publication/infrastructure/postgres_publication_repository'
import env from '#start/env'

const publicationRepository =
  env.get('PUBLICATION_REPOSITORY') === 'postgres'
    ? new PostgresPublicationRepository()
    : new InMemoryPublicationRepository()

export const validateChartSpecService = new ValidateChartSpecService()
export const createPublicationService = new CreatePublicationService(publicationRepository)
export const getPublicationService = new GetPublicationService(publicationRepository)
