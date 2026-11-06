import type {
  PlaceAttestation,
  SpatialCertainty,
  TerritoryType,
} from '#modules/geography/domain/place_attestation'
import type { PlaceCursorPosition } from '#modules/geography/application/place_cursor'

export interface PlaceFilterOptions {
  readonly fromYear?: number
  readonly toYear?: number
  readonly territoryType?: TerritoryType
  readonly certainty?: SpatialCertainty
  readonly placeId?: string
}

export interface PlacePage {
  readonly items: readonly PlaceAttestation[]
  readonly next: PlaceCursorPosition | null
}

export interface GeoJsonPointGeometry {
  readonly type: 'Point'
  readonly coordinates: [number, number] // [longitude, latitude] conforme a RFC 7946
}

export interface GeoJsonFeature {
  readonly type: 'Feature'
  readonly id: string
  readonly geometry: GeoJsonPointGeometry
  readonly properties: {
    readonly placeId: string
    readonly placeName: string
    readonly territoryType: TerritoryType
    readonly timeRange: {
      readonly fromYear: number
      readonly toYear?: number
    }
    readonly certainty: SpatialCertainty
    readonly sourceId: string
    readonly sourceName: string
    readonly sourceUrl?: string
    readonly evidenceStatus: string
    readonly notes?: string
    readonly relatedClaimIds?: readonly string[]
    readonly license: {
      readonly softwareLicense: string
      readonly datasetLicense: string
      readonly itemRights: string
      readonly redistributionPolicy: string
      readonly requiredAttribution: string
    }
  }
}

export interface GeoJsonFeatureCollection {
  readonly type: 'FeatureCollection'
  readonly features: readonly GeoJsonFeature[]
}

export interface PlaceRepository {
  save(attestation: PlaceAttestation): Promise<void>
  findMany(filters?: PlaceFilterOptions): Promise<readonly PlaceAttestation[]>
  findPage(
    filters: PlaceFilterOptions,
    limit: number,
    after?: PlaceCursorPosition
  ): Promise<PlacePage>
  findById(id: string): Promise<PlaceAttestation | null>
}

export class PlaceService {
  constructor(private readonly repository: PlaceRepository) {}

  async getAttestations(filters?: PlaceFilterOptions): Promise<readonly PlaceAttestation[]> {
    return this.repository.findMany(filters)
  }

  async getAttestationPage(
    filters: PlaceFilterOptions,
    limit: number,
    after?: PlaceCursorPosition
  ): Promise<PlacePage> {
    return this.repository.findPage(filters, limit, after)
  }

  async getAttestationById(id: string): Promise<PlaceAttestation | null> {
    return this.repository.findById(id)
  }

  toGeoJsonFeatureCollection(attestations: readonly PlaceAttestation[]): GeoJsonFeatureCollection {
    return {
      type: 'FeatureCollection',
      features: attestations.map((a) => ({
        type: 'Feature',
        id: a.id,
        geometry: {
          type: 'Point',
          coordinates: [a.coordinates.longitude, a.coordinates.latitude], // [lon, lat] RFC 7946
        },
        properties: {
          placeId: a.placeId,
          placeName: a.placeName,
          territoryType: a.territoryType,
          timeRange: a.timeRange,
          certainty: a.certainty,
          sourceId: a.sourceId,
          sourceName: a.sourceName,
          sourceUrl: a.sourceUrl,
          evidenceStatus: a.evidenceStatus,
          notes: a.notes,
          relatedClaimIds: a.relatedClaimIds,
          license: a.license,
        },
      })),
    }
  }
}
