import {
  AssistanceService,
  InMemoryChunkRetriever,
  type ChunkRetriever,
} from '#modules/assistance/application/assistance_service'
import { DeterministicLlmProvider } from '#modules/assistance/application/deterministic_llm_provider'
import type { EvidenceChunk } from '#modules/assistance/domain/chunk'
import PostgresChunkRetriever from '#modules/assistance/infrastructure/postgres_chunk_retriever'
import env from '#start/env'
import { shouldSeedFixtures } from '#shared/fixtures/fixture_policy'

export const pilotEvidenceChunks: readonly EvidenceChunk[] = [
  {
    id: 'chunk-bcentral-tpm-2024',
    sourceId: 'bcentral-cl',
    sourceName: 'Banco Central de Chile - Base de Datos Estadísticos',
    sourceType: 'official_statistical',
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    text: 'La Tasa de Política Monetaria (TPM) del Banco Central de Chile se situó en 8.25% en enero de 2024, descendiendo a 7.25% en febrero y 6.50% en abril de 2024.',
    locator: {
      type: 'table',
      value: 'F073.TIR.FON.NO.D',
    },
    epistemicStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'ODC-By-1.0',
      itemRights: 'CC-BY-4.0',
      redistributionPolicy: 'public-attribution-required',
      requiredAttribution: 'Banco Central de Chile',
    },
    retrievedAt: '2026-09-22T00:00:00.000Z',
  },
  {
    id: 'chunk-congreso-ley-21045',
    sourceId: 'bcn-ley-chile',
    sourceName: 'Biblioteca del Congreso Nacional - Ley Chile',
    sourceType: 'official_administrative',
    contentHash: 'f4b3b190f84a86b97d1e8ef09ab7d2c18d76a268b8e8f8a12bc90a82b9845112',
    text: 'Ley 21045 promulgada el 05 de octubre de 2017 crea el Ministerio de las Culturas, las Artes y el Patrimonio como secretaría de Estado encargada de colaborar con el Presidente de la República en políticas culturales.',
    locator: {
      type: 'fragment',
      value: 'idNorma:1110037',
    },
    epistemicStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'ODC-By-1.0',
      itemRights: 'Public Domain / Ley de Transparencia',
      redistributionPolicy: 'public-open-access',
      requiredAttribution: 'Biblioteca del Congreso Nacional de Chile',
    },
    retrievedAt: '2026-09-22T00:00:00.000Z',
  },
  {
    id: 'chunk-inflacion-1973-disputed',
    sourceId: 'historiografia-economica-cl',
    sourceName: 'Estudios de Historia Económica Chilena',
    sourceType: 'academic_research',
    contentHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
    text: 'La tasa de inflación para 1973 en Chile presenta discrepancia metodológica: el IPC oficial del INE reportó 508.1%, mientras que reconstrucciones académicas independientes (como Yáñez & Rivero y Banco Mundial) calcularon entre 600% y 1000% debido a precios reprimidos en el mercado negro.',
    locator: {
      type: 'page',
      value: 'p. 142-145',
    },
    epistemicStatus: 'disputed',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'Academic Use Only',
      itemRights: 'CC-BY-NC-4.0',
      redistributionPolicy: 'attribution-noncommercial',
      requiredAttribution: 'Universidad de Chile / Depto. Economía',
    },
    retrievedAt: '2026-09-22T00:00:00.000Z',
  },
]

export const defaultChunkRetriever: ChunkRetriever =
  env.get('ASSISTANCE_RETRIEVER') === 'postgres'
    ? new PostgresChunkRetriever('public')
    : new InMemoryChunkRetriever(shouldSeedFixtures(env.get('NODE_ENV')) ? pilotEvidenceChunks : [])

export const defaultLlmProvider = new DeterministicLlmProvider()

export const assistanceService = new AssistanceService({
  llmProvider: defaultLlmProvider,
  chunkRetriever: defaultChunkRetriever,
})
