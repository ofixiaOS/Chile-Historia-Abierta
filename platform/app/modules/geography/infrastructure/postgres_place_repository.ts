import {
  assertPlaceAttestationIsValid,
  type PlaceAttestation,
  type SpatialCertainty,
  type TerritoryType,
} from '#modules/geography/domain/place_attestation'
import type { PlaceCursorPosition } from '#modules/geography/application/place_cursor'
import type {
  PlaceFilterOptions,
  PlacePage,
  PlaceRepository,
} from '#modules/geography/application/place_service'
import type { EvidenceStatus } from '#modules/evidence/domain/claim'
import db from '@adonisjs/lucid/services/db'

interface PlaceAttestationRow {
  id: string
  place_id: string
  place_name: string
  territory_type: TerritoryType
  latitude: number
  longitude: number
  from_year: number
  to_year: number | null
  certainty: SpatialCertainty
  source_id: string
  source_name: string
  source_url: string | null
  evidence_status: EvidenceStatus
  software_license: string
  dataset_license: string
  item_rights: string
  redistribution_policy: string
  required_attribution: string
  notes: string | null
  related_claim_ids: unknown
  created_at: Date | string
}

export function mapRowToPlaceAttestation(row: PlaceAttestationRow): PlaceAttestation {
  let relatedClaimIds: readonly string[] = []
  if (Array.isArray(row.related_claim_ids)) {
    relatedClaimIds = row.related_claim_ids as readonly string[]
  } else if (typeof row.related_claim_ids === 'string') {
    try {
      relatedClaimIds = JSON.parse(row.related_claim_ids)
    } catch {
      relatedClaimIds = []
    }
  }

  const attestation: PlaceAttestation = {
    id: row.id,
    placeId: row.place_id,
    placeName: row.place_name,
    territoryType: row.territory_type,
    coordinates: {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    },
    timeRange: {
      fromYear: Number(row.from_year),
      ...(row.to_year !== null && row.to_year !== undefined ? { toYear: Number(row.to_year) } : {}),
    },
    certainty: row.certainty,
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url ?? undefined,
    evidenceStatus: row.evidence_status,
    license: {
      softwareLicense: row.software_license,
      datasetLicense: row.dataset_license,
      itemRights: row.item_rights,
      redistributionPolicy: row.redistribution_policy,
      requiredAttribution: row.required_attribution,
    },
    notes: row.notes ?? undefined,
    relatedClaimIds: relatedClaimIds.length > 0 ? relatedClaimIds : undefined,
  }

  assertPlaceAttestationIsValid(attestation)
  return attestation
}

export class PostgresPlaceRepository implements PlaceRepository {
  constructor(
    private readonly writeConnection: 'admin' = 'admin',
    private readonly readConnection: 'public' | 'admin' = 'public'
  ) {}

  async save(attestation: PlaceAttestation): Promise<void> {
    assertPlaceAttestationIsValid(attestation)

    const toYearPlaceholder = typeof attestation.timeRange.toYear === 'number' ? '?' : 'NULL'
    const sourceUrlPlaceholder = attestation.sourceUrl ? '?' : 'NULL'
    const notesPlaceholder = attestation.notes ? '?' : 'NULL'

    const bindings: (string | number)[] = [
      attestation.id,
      attestation.placeId,
      attestation.placeName,
      attestation.territoryType,
      attestation.coordinates.latitude,
      attestation.coordinates.longitude,
      attestation.timeRange.fromYear,
      ...(typeof attestation.timeRange.toYear === 'number' ? [attestation.timeRange.toYear] : []),
      attestation.certainty,
      attestation.sourceId,
      attestation.sourceName,
      ...(attestation.sourceUrl ? [attestation.sourceUrl] : []),
      attestation.evidenceStatus,
      attestation.license.softwareLicense,
      attestation.license.datasetLicense,
      attestation.license.itemRights,
      attestation.license.redistributionPolicy,
      attestation.license.requiredAttribution,
      ...(attestation.notes ? [attestation.notes] : []),
      JSON.stringify(attestation.relatedClaimIds ?? []),
    ]

    await db.connection(this.writeConnection).rawQuery(
      `
      INSERT INTO place_attestations (
        id,
        place_id,
        place_name,
        territory_type,
        latitude,
        longitude,
        from_year,
        to_year,
        certainty,
        source_id,
        source_name,
        source_url,
        evidence_status,
        software_license,
        dataset_license,
        item_rights,
        redistribution_policy,
        required_attribution,
        notes,
        related_claim_ids
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ${toYearPlaceholder}, ?, ?, ?, ${sourceUrlPlaceholder}, ?, ?, ?, ?, ?, ?, ${notesPlaceholder}, ?::jsonb
      )
      `,
      bindings
    )
  }

  async findMany(filters?: PlaceFilterOptions): Promise<readonly PlaceAttestation[]> {
    let sql = `
      SELECT
        id,
        place_id,
        place_name,
        territory_type,
        latitude,
        longitude,
        from_year,
        to_year,
        certainty,
        source_id,
        source_name,
        source_url,
        evidence_status,
        software_license,
        dataset_license,
        item_rights,
        redistribution_policy,
        required_attribution,
        notes,
        related_claim_ids,
        created_at
      FROM public_place_attestation_records
      WHERE 1=1
    `
    const bindings: (string | number)[] = []

    if (filters?.placeId) {
      sql += ` AND place_id = ?`
      bindings.push(filters.placeId)
    }

    if (filters?.territoryType) {
      sql += ` AND territory_type = ?`
      bindings.push(filters.territoryType)
    }

    if (filters?.certainty) {
      sql += ` AND certainty = ?`
      bindings.push(filters.certainty)
    }

    if (typeof filters?.fromYear === 'number') {
      sql += ` AND COALESCE(to_year, from_year) >= ?`
      bindings.push(filters.fromYear)
    }

    if (typeof filters?.toYear === 'number') {
      sql += ` AND from_year <= ?`
      bindings.push(filters.toYear)
    }

    sql += ` ORDER BY from_year ASC, place_name ASC`

    const result = await db.connection(this.readConnection).rawQuery(sql, bindings)
    const rows = result.rows as PlaceAttestationRow[]
    return rows.map(mapRowToPlaceAttestation)
  }

  async findPage(
    filters: PlaceFilterOptions,
    limit: number,
    after?: PlaceCursorPosition
  ): Promise<PlacePage> {
    let sql = `
      SELECT
        id, place_id, place_name, territory_type, latitude, longitude,
        from_year, to_year, certainty, source_id, source_name, source_url,
        evidence_status, software_license, dataset_license, item_rights,
        redistribution_policy, required_attribution, notes, related_claim_ids,
        created_at
      FROM public_place_attestation_records
      WHERE 1=1
    `
    const bindings: (string | number)[] = []

    if (filters.placeId) {
      sql += ` AND place_id = ?`
      bindings.push(filters.placeId)
    }
    if (filters.territoryType) {
      sql += ` AND territory_type = ?`
      bindings.push(filters.territoryType)
    }
    if (filters.certainty) {
      sql += ` AND certainty = ?`
      bindings.push(filters.certainty)
    }
    if (typeof filters.fromYear === 'number') {
      sql += ` AND COALESCE(to_year, from_year) >= ?`
      bindings.push(filters.fromYear)
    }
    if (typeof filters.toYear === 'number') {
      sql += ` AND from_year <= ?`
      bindings.push(filters.toYear)
    }
    if (after) {
      sql += ` AND (from_year > ? OR (from_year = ? AND id COLLATE "C" > ? COLLATE "C"))`
      bindings.push(after.fromYear, after.fromYear, after.id)
    }

    sql += ` ORDER BY from_year ASC, id COLLATE "C" ASC LIMIT ?`
    bindings.push(limit + 1)

    const result = await db.connection(this.readConnection).rawQuery(sql, bindings)
    const rows = result.rows as PlaceAttestationRow[]
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit).map(mapRowToPlaceAttestation)
    const last = items.at(-1)

    return {
      items,
      next:
        hasMore && last
          ? {
              fromYear: last.timeRange.fromYear,
              id: last.id,
            }
          : null,
    }
  }

  async findById(id: string): Promise<PlaceAttestation | null> {
    const result = await db.connection(this.readConnection).rawQuery(
      `
      SELECT
        id,
        place_id,
        place_name,
        territory_type,
        latitude,
        longitude,
        from_year,
        to_year,
        certainty,
        source_id,
        source_name,
        source_url,
        evidence_status,
        software_license,
        dataset_license,
        item_rights,
        redistribution_policy,
        required_attribution,
        notes,
        related_claim_ids,
        created_at
      FROM public_place_attestation_records
      WHERE id = ?
      `,
      [id]
    )

    const rows = result.rows as PlaceAttestationRow[]
    if (rows.length === 0) {
      return null
    }

    return mapRowToPlaceAttestation(rows[0])
  }
}
