import type {
  Observation,
  ObservationStatus,
  SeriesVintage,
  StatisticalSeries,
} from '#modules/statistics/domain/series'

export interface SdmxJsonMessage {
  readonly meta: {
    readonly schema: string
    readonly id: string
    readonly prepared: string
    readonly sender: {
      readonly id: string
      readonly name: string
    }
  }
  readonly data: {
    readonly dataSets: readonly [
      {
        readonly action: string
        readonly series: {
          readonly '0': {
            readonly attributes: readonly [number]
            readonly observations: Readonly<Record<string, readonly [number, number]>>
          }
        }
      },
    ]
    readonly structure: {
      readonly name: string
      readonly dimensions: {
        readonly series: readonly [
          {
            readonly id: string
            readonly name: string
            readonly values: readonly [{ readonly id: string; readonly name: string }]
          },
        ]
        readonly observation: readonly [
          {
            readonly id: string
            readonly name: string
            readonly values: readonly { readonly id: string; readonly name: string }[]
          },
        ]
      }
      readonly attributes: {
        readonly series: readonly [
          {
            readonly id: string
            readonly name: string
            readonly values: readonly [{ readonly id: string; readonly name: string }]
          },
        ]
        readonly observation: readonly [
          {
            readonly id: string
            readonly name: string
            readonly values: readonly { readonly id: string; readonly name: string }[]
          },
        ]
      }
    }
  }
}

const statusIndexMap: Record<ObservationStatus, number> = {
  normal: 0,
  provisional: 1,
  revised: 2,
  estimated: 3,
  imputed: 4,
}

export function transformToSdmxJson(
  series: StatisticalSeries,
  vintage: SeriesVintage,
  observations?: readonly Observation[]
): SdmxJsonMessage {
  const targetObservations = observations ?? vintage.observations

  // Construir mapa de observaciones: index -> [valor, statusIndex]
  const obsMap: Record<string, [number, number]> = {}
  const timeValues: { id: string; name: string }[] = []

  for (const [i, obs] of targetObservations.entries()) {
    const sIndex = statusIndexMap[obs.status] ?? 0
    obsMap[String(i)] = [obs.value, sIndex]
    timeValues.push({ id: obs.period, name: obs.period })
  }

  return {
    meta: {
      schema:
        'https://raw.githubusercontent.com/sdmx-twg/sdmx-json/master/data-message/tools/schemas/2.0.0/sdmx-json-data-schema.json',
      id: `SDMX_${series.id.toUpperCase().replace(/-/g, '_')}_${vintage.id.toUpperCase().replace(/-/g, '_')}`,
      prepared: vintage.vintageDate,
      sender: {
        id: 'CL_HISTORIA_ABIERTA',
        name: 'Chile Historia Abierta',
      },
    },
    data: {
      dataSets: [
        {
          action: 'Information',
          series: {
            '0': {
              attributes: [0],
              observations: obsMap,
            },
          },
        },
      ],
      structure: {
        name: series.concept,
        dimensions: {
          series: [
            {
              id: 'SERIES_ID',
              name: 'Series Identifier',
              values: [{ id: series.id, name: series.concept }],
            },
          ],
          observation: [
            {
              id: 'TIME_PERIOD',
              name: 'Time Period',
              values: timeValues,
            },
          ],
        },
        attributes: {
          series: [
            {
              id: 'UNIT_MEASURE',
              name: 'Unit of Measure',
              values: [{ id: series.baseUnit, name: series.baseUnit }],
            },
          ],
          observation: [
            {
              id: 'OBS_STATUS',
              name: 'Observation Status',
              values: [
                { id: 'A', name: 'normal' },
                { id: 'P', name: 'provisional' },
                { id: 'R', name: 'revised' },
                { id: 'E', name: 'estimated' },
                { id: 'I', name: 'imputed' },
              ],
            },
          ],
        },
      },
    },
  }
}
