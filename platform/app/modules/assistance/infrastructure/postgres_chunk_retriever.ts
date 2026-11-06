import type { ChunkRetriever } from '#modules/assistance/application/assistance_service'
import type { AssistanceQuery } from '#modules/assistance/domain/assistance'
import {
  type ChunkLocatorType,
  type EvidenceChunk,
  assertEvidenceChunkIsValid,
} from '#modules/assistance/domain/chunk'
import type { EvidenceStatus, SourceType } from '#modules/evidence/domain/claim'
import db from '@adonisjs/lucid/services/db'

interface ChunkRow {
  id: string
  source_id: string
  source_name: string
  source_type: SourceType
  content_hash: string
  text: string
  locator_type: ChunkLocatorType
  locator_value: string
  epistemic_status: EvidenceStatus
  software_license: string
  dataset_license: string
  item_rights: string
  redistribution_policy: string
  required_attribution: string
  retrieved_at: Date | string
  rank?: number
}

const spanishStopwords: ReadonlySet<string> = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'al',
  'a',
  'en',
  'para',
  'por',
  'con',
  'sin',
  'sobre',
  'segun',
  'según',
  'y',
  'e',
  'o',
  'u',
  'que',
  'como',
  'cómo',
  'cual',
  'cuál',
  'cuales',
  'cuáles',
  'este',
  'esta',
  'estos',
  'estas',
  'ese',
  'esa',
  'esos',
  'esas',
  'su',
  'sus',
  'mi',
  'mis',
  'tu',
  'tus',
  'es',
  'son',
  'fue',
  'fueron',
  'era',
  'eran',
  'hay',
  'hubo',
  'quien',
  'quién',
])

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function buildTsQuery(rawText: string): string | null {
  const terms = rawText
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !spanishStopwords.has(t))

  if (terms.length === 0) {
    return null
  }

  // Unir con OR (|) para permitir búsqueda de alta cobertura y ordenamiento por relevancia ts_rank
  return terms.join(' | ')
}

function mapRowToEvidenceChunk(row: ChunkRow): EvidenceChunk {
  const chunk: EvidenceChunk = {
    id: row.id,
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceType: row.source_type,
    contentHash: row.content_hash.trim(),
    text: row.text,
    locator: {
      type: row.locator_type,
      value: row.locator_value,
    },
    epistemicStatus: row.epistemic_status,
    license: {
      softwareLicense: row.software_license,
      datasetLicense: row.dataset_license,
      itemRights: row.item_rights,
      redistributionPolicy: row.redistribution_policy,
      requiredAttribution: row.required_attribution,
    },
    retrievedAt: toIsoString(row.retrieved_at),
  }

  assertEvidenceChunkIsValid(chunk)
  return chunk
}

export default class PostgresChunkRetriever implements ChunkRetriever {
  constructor(private readonly readConnection: 'public' | 'admin' = 'public') {}

  /**
   * Guarda un chunk de evidencia en la tabla canónica mediante la conexión admin.
   * La operación es idempotente si el chunk ya existe con el mismo ID.
   */
  async saveChunk(chunk: EvidenceChunk): Promise<void> {
    assertEvidenceChunkIsValid(chunk)

    await db.connection('admin').rawQuery(
      `
        INSERT INTO evidence_chunks (
          id, source_id, source_name, source_type, content_hash,
          text, locator_type, locator_value, epistemic_status,
          software_license, dataset_license, item_rights,
          redistribution_policy, required_attribution, retrieved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        chunk.id,
        chunk.sourceId,
        chunk.sourceName,
        chunk.sourceType,
        chunk.contentHash,
        chunk.text,
        chunk.locator.type,
        chunk.locator.value,
        chunk.epistemicStatus,
        chunk.license.softwareLicense,
        chunk.license.datasetLicense,
        chunk.license.itemRights,
        chunk.license.redistributionPolicy,
        chunk.license.requiredAttribution,
        chunk.retrievedAt,
      ]
    )
  }

  /**
   * Guarda un lote de chunks de evidencia en la conexión admin.
   */
  async saveChunks(chunks: readonly EvidenceChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await this.saveChunk(chunk)
    }
  }

  /**
   * Recupera chunks relevantes mediante FTS en español a través del rol público 'cha_public'.
   * Aplica matching morfológico, ranking ts_rank y filtros opcionales por fuente.
   */
  async retrieveChunks(query: AssistanceQuery): Promise<readonly EvidenceChunk[]> {
    const tsQuery = buildTsQuery(query.queryText)
    if (!tsQuery) {
      return []
    }

    const hasSourceFilters = Boolean(query.sourceFilters && query.sourceFilters.length > 0)

    let sql = `
      SELECT
        id,
        source_id,
        source_name,
        source_type,
        content_hash,
        text,
        locator_type,
        locator_value,
        epistemic_status,
        software_license,
        dataset_license,
        item_rights,
        redistribution_policy,
        required_attribution,
        retrieved_at,
        ts_rank(search_vector, to_tsquery('spanish', ?)) AS rank
      FROM public_evidence_chunk_records
      WHERE search_vector @@ to_tsquery('spanish', ?)
    `

    const bindings: (string | number)[] = [tsQuery, tsQuery]

    if (hasSourceFilters && query.sourceFilters) {
      const placeholders = query.sourceFilters.map(() => '?').join(', ')
      sql += ` AND source_id IN (${placeholders})`
      bindings.push(...query.sourceFilters)
    }

    sql += `
      ORDER BY rank DESC
      LIMIT 10
    `

    const result = await db.connection(this.readConnection).rawQuery(sql, bindings)
    const rows = result.rows as ChunkRow[]

    if (rows.length === 0) {
      return []
    }

    const topRank = rows[0].rank ?? 0
    if (topRank <= 0) {
      return []
    }

    // Filtrar candidatos que mantengan al menos el 50% de relevancia del mejor resultado
    const relevantRows = rows.filter((r) => (r.rank ?? 0) >= topRank * 0.5).slice(0, 3)

    return relevantRows.map(mapRowToEvidenceChunk)
  }
}
