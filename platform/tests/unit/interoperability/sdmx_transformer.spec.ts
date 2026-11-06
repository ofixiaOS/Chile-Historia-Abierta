import {
  pilotSeries,
  pilotVintages,
} from '#modules/statistics/infrastructure/in_memory_statistics_repository'
import { transformToSdmxJson } from '#modules/interoperability/domain/sdmx_transformer'
import { test } from '@japa/runner'

test.group('SDMX Transformer (Unit)', () => {
  const series = pilotSeries[0]!
  const vintage = pilotVintages[0]!

  test('transformToSdmxJson genera mensaje SDMX-JSON 2.1 con estructura válida', ({ assert }) => {
    const sdmx = transformToSdmxJson(series, vintage)

    // Metadatos
    assert.isDefined(sdmx.meta)
    assert.include(sdmx.meta.schema, 'sdmx-json')
    assert.equal(sdmx.meta.sender.id, 'CL_HISTORIA_ABIERTA')
    assert.equal(sdmx.meta.prepared, vintage.vintageDate)

    // Estructura y dimensiones
    assert.equal(sdmx.data.structure.name, series.concept)
    assert.equal(sdmx.data.structure.dimensions.series[0]!.values[0]!.id, series.id)
    assert.equal(
      sdmx.data.structure.dimensions.observation[0]!.values.length,
      vintage.observations.length
    )

    // Atributos de observación (OBS_STATUS)
    const obsStatusAttr = sdmx.data.structure.attributes.observation.find(
      (a) => a.id === 'OBS_STATUS'
    )
    assert.isDefined(obsStatusAttr)
    assert.isAbove(obsStatusAttr!.values.length, 3)

    // Conjunto de datos
    const dataset = sdmx.data.dataSets[0]!
    assert.equal(dataset.action, 'Information')
    const observations = dataset.series['0']!.observations
    assert.equal(Object.keys(observations).length, vintage.observations.length)

    // Primera observación (8.25 normal -> index 0)
    assert.equal(observations['0']![0], 8.25)
    assert.equal(observations['0']![1], 0) // normal = 0

    // Última observación de V1 (5.5 provisional -> index 1)
    const lastIdx = String(vintage.observations.length - 1)
    assert.equal(observations[lastIdx]![0], 5.5)
    assert.equal(observations[lastIdx]![1], 1) // provisional = 1
  })
})
