import {
  assertPlaceAttestationIsValid,
  type PlaceAttestation,
} from '#modules/geography/domain/place_attestation'
import type { PlaceCursorPosition } from '#modules/geography/application/place_cursor'
import type {
  PlaceFilterOptions,
  PlacePage,
  PlaceRepository,
} from '#modules/geography/application/place_service'

export const pilotAttestations: readonly PlaceAttestation[] = [
  {
    id: 'attestation-stgo-1810',
    placeId: 'santiago',
    placeName: 'Santiago de Chile (Plaza Mayor / Cabildo de 1810)',
    territoryType: 'city',
    coordinates: {
      latitude: -33.4372,
      longitude: -70.6506,
    },
    timeRange: {
      fromYear: 1810,
      toYear: 1818,
    },
    certainty: 'exact',
    sourceId: 'actas-cabildo-stgo-1810',
    sourceName: 'Acta del Cabildo Abierto de Santiago de 1810',
    sourceUrl: 'https://www.bcn.cl/historiapolitica/constituciones',
    evidenceStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'CC-BY-4.0',
      itemRights: 'Public Domain (Ley 17.336 Art. 8)',
      redistributionPolicy: 'open_public_with_attribution',
      requiredAttribution: 'Archivo Nacional Histórico de Chile',
    },
    notes:
      'Sede de la Primera Junta Nacional de Gobierno y centro administrativo del Reino de Chile.',
    relatedClaimIds: ['claim-cabildo-1810'],
  },
  {
    id: 'attestation-valpo-1880',
    placeId: 'valparaiso',
    placeName: 'Valparaíso (Puerto y Aduana Principal de la República)',
    territoryType: 'city',
    coordinates: {
      latitude: -33.0472,
      longitude: -71.6127,
    },
    timeRange: {
      fromYear: 1830,
      toYear: 1930,
    },
    certainty: 'exact',
    sourceId: 'memorias-hacienda-valpo',
    sourceName: 'Memorias del Ministerio de Hacienda (Aduana de Valparaíso)',
    sourceUrl: 'https://www.hacienda.cl/historia',
    evidenceStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'CC-BY-4.0',
      itemRights: 'Public Domain (Ley 17.336 Art. 8)',
      redistributionPolicy: 'open_public_with_attribution',
      requiredAttribution: 'Servicio Nacional de Aduanas / Archivo Nacional',
    },
    notes: 'Epicentro comercial, financiero y aduanero de Chile en el siglo XIX.',
  },
  {
    id: 'attestation-tarapaca-1883',
    placeId: 'tarapaca',
    placeName: 'Provincia de Tarapacá / Cantón Salitrero de Iquique',
    territoryType: 'region',
    coordinates: {
      latitude: -20.2167,
      longitude: -70.15,
    },
    timeRange: {
      fromYear: 1883,
      toYear: 1930,
    },
    certainty: 'exact',
    sourceId: 'tratado-ancon-1883',
    sourceName: 'Tratado de Paz y Amistad de Ancón (1883)',
    sourceUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=24045',
    evidenceStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'CC-BY-4.0',
      itemRights: 'Public Domain (Ley 17.336 Art. 8)',
      redistributionPolicy: 'open_public_with_attribution',
      requiredAttribution: 'Ministerio de Relaciones Exteriores de Chile',
    },
    notes: 'Cesión perpetua e incondicional de Tarapacá y auge de la minería salitrera.',
  },
  {
    id: 'attestation-concepcion-1940',
    placeId: 'concepcion',
    placeName: 'Concepción y Cuenca Carbonífera de Lota-Coronel',
    territoryType: 'region',
    coordinates: {
      latitude: -36.827,
      longitude: -73.0503,
    },
    timeRange: {
      fromYear: 1939,
      toYear: 1970,
    },
    certainty: 'exact',
    sourceId: 'corfo-ley-6334-1939',
    sourceName: 'Ley N° 6.334 de Creación de la CORFO (1939)',
    sourceUrl: 'https://www.corfo.cl/historia',
    evidenceStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'CC-BY-4.0',
      itemRights: 'Public Domain (Ley 17.336 Art. 8)',
      redistributionPolicy: 'open_public_with_attribution',
      requiredAttribution: 'Corporación de Fomento de la Producción (CORFO)',
    },
    notes: 'Nodo siderúrgico e industrial tras el terremoto de Chillán de 1939.',
  },
  {
    id: 'attestation-magallanes-1843',
    placeId: 'magallanes',
    placeName: 'Fuerte Bulnes / Estrecho de Magallanes',
    territoryType: 'site',
    coordinates: {
      latitude: -53.1638,
      longitude: -70.9171,
    },
    timeRange: {
      fromYear: 1843,
      toYear: 1900,
    },
    certainty: 'exact',
    sourceId: 'toma-posesion-magallanes-1843',
    sourceName: 'Acta de Toma de Posesión del Estrecho de Magallanes (Goleta Ancud)',
    sourceUrl: 'https://www.armada.cl/historia/goleta-ancud',
    evidenceStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'CC-BY-4.0',
      itemRights: 'Public Domain (Ley 17.336 Art. 8)',
      redistributionPolicy: 'open_public_with_attribution',
      requiredAttribution: 'Armada de Chile / Archivo Nacional',
    },
    notes: 'Establecimiento de soberanía efectiva en el extremo austral de Chile.',
  },
  {
    id: 'attestation-antofagasta-1879',
    placeId: 'antofagasta',
    placeName: 'Litoral de Antofagasta (Desembarco del 14 de Febrero)',
    territoryType: 'boundary',
    coordinates: {
      latitude: -23.65,
      longitude: -70.4,
    },
    timeRange: {
      fromYear: 1879,
      toYear: 1904,
    },
    certainty: 'approximate',
    sourceId: 'decreto-ocupacion-antofagasta-1879',
    sourceName: 'Decretos Oficiales de la Ocupación de Antofagasta (1879)',
    sourceUrl: 'https://www.bcn.cl/historiapolitica',
    evidenceStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'CC-BY-4.0',
      itemRights: 'Public Domain (Ley 17.336 Art. 8)',
      redistributionPolicy: 'open_public_with_attribution',
      requiredAttribution: 'Biblioteca del Congreso Nacional de Chile',
    },
    notes: 'Demarcación provisional previa al Pacto de Tregua de 1884 y Tratado de 1904.',
  },
]

export class InMemoryPlaceRepository implements PlaceRepository {
  private readonly items = new Map<string, PlaceAttestation>()

  constructor(initialItems?: readonly PlaceAttestation[]) {
    const list = initialItems ?? pilotAttestations
    for (const item of list) {
      assertPlaceAttestationIsValid(item)
      this.items.set(item.id, item)
    }
  }

  async save(attestation: PlaceAttestation): Promise<void> {
    assertPlaceAttestationIsValid(attestation)
    this.items.set(attestation.id, attestation)
  }

  async findById(id: string): Promise<PlaceAttestation | null> {
    return this.items.get(id) ?? null
  }

  async findMany(filters?: PlaceFilterOptions): Promise<readonly PlaceAttestation[]> {
    const all = Array.from(this.items.values())
    if (!filters) {
      return all
    }

    return all.filter((a) => {
      if (filters.placeId && a.placeId !== filters.placeId) {
        return false
      }
      if (filters.territoryType && a.territoryType !== filters.territoryType) {
        return false
      }
      if (filters.certainty && a.certainty !== filters.certainty) {
        return false
      }
      if (typeof filters.fromYear === 'number') {
        const to = a.timeRange.toYear ?? a.timeRange.fromYear
        if (to < filters.fromYear) {
          return false
        }
      }
      if (typeof filters.toYear === 'number') {
        if (a.timeRange.fromYear > filters.toYear) {
          return false
        }
      }
      return true
    })
  }

  async findPage(
    filters: PlaceFilterOptions,
    limit: number,
    after?: PlaceCursorPosition
  ): Promise<PlacePage> {
    const filtered = await this.findMany(filters)
    const ordered = [...filtered].sort(
      (left, right) =>
        left.timeRange.fromYear - right.timeRange.fromYear ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
    )
    const afterCursor = after
      ? ordered.filter((item) => {
          const yearDiff = item.timeRange.fromYear - after.fromYear
          if (yearDiff !== 0) return yearDiff > 0
          return item.id > after.id
        })
      : ordered
    const rows = afterCursor.slice(0, limit + 1)
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)
    const last = items.at(-1)

    return {
      items,
      next: hasMore && last ? { fromYear: last.timeRange.fromYear, id: last.id } : null,
    }
  }
}
