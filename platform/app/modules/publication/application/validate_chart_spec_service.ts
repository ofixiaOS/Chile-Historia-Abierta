import {
  assertSnapshotIntegrity,
  validateAntiManipulation,
} from '#modules/publication/domain/anti_manipulation_validator'
import {
  calculateDataSnapshotHash,
  calculateQueryHash,
  chartMethods,
  type ChartMethod,
  type ChartSeriesDefinition,
  type ChartSpec,
  type ChartWarning,
  type DataSnapshot,
} from '#modules/publication/domain/chart_spec'
import ApiError from '#shared/errors/api_error'

export interface ValidateChartSpecInput {
  readonly title: string
  readonly description?: string
  readonly method: ChartMethod
  readonly series: readonly ChartSeriesDefinition[]
  readonly events?: readonly {
    eventId?: string
    claimRevisionId?: string
    label: string
    date: string
  }[]
  readonly timeRange: {
    from: string
    to: string
  }
  readonly transformations?: readonly {
    name: 'index_base_100' | 'percentage_change' | 'none'
    parameters?: Record<string, unknown>
  }[]
  readonly dataSnapshot: DataSnapshot
  readonly sources?: readonly string[]
  readonly limitations?: readonly string[]
}

export interface ValidateChartSpecResult {
  readonly valid: true
  readonly queryHash: string
  readonly dataHash: string
  readonly warnings: readonly ChartWarning[]
  readonly normalizedSpec: ChartSpec
}

export default class ValidateChartSpecService {
  execute(input: ValidateChartSpecInput): ValidateChartSpecResult {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ApiError('E_VALIDATION', 'ChartSpec debe ser un objeto', 422)
    }
    const boundedArray = (value: unknown, field: string, max: number): void => {
      if (!Array.isArray(value) || value.length > max) {
        throw new ApiError(
          'E_VALIDATION',
          `${field} debe ser un arreglo de hasta ${max} elementos`,
          422,
          {
            field,
          }
        )
      }
    }
    boundedArray(input.series, 'series', 20)
    boundedArray(input.events ?? [], 'events', 100)
    boundedArray(input.transformations ?? [], 'transformations', 100)
    boundedArray(input.sources ?? [], 'sources', 100)
    boundedArray(input.limitations ?? [], 'limitations', 100)
    if (typeof input.title !== 'string' || input.title.length > 300) {
      throw new ApiError('E_VALIDATION', 'title debe ser texto de hasta 300 caracteres', 422)
    }
    if (
      input.description !== undefined &&
      (typeof input.description !== 'string' || input.description.length > 2000)
    ) {
      throw new ApiError('E_VALIDATION', 'description no puede exceder 2000 caracteres', 422)
    }
    if (
      !input.dataSnapshot ||
      typeof input.dataSnapshot !== 'object' ||
      !input.dataSnapshot.series ||
      typeof input.dataSnapshot.series !== 'object' ||
      Array.isArray(input.dataSnapshot.series)
    ) {
      throw new ApiError('E_VALIDATION', 'dataSnapshot.series debe ser un objeto', 422)
    }
    const snapshotKeys = Object.keys(input.dataSnapshot.series)
    let observationCount = 0
    if (snapshotKeys.length > 20) {
      throw new ApiError('E_VALIDATION', 'dataSnapshot no puede contener más de 20 series', 422)
    }
    for (const key of snapshotKeys) {
      const rows = input.dataSnapshot.series[key]
      if (key.length > 160 || !Array.isArray(rows)) {
        throw new ApiError('E_VALIDATION', 'dataSnapshot contiene una serie inválida', 422)
      }
      observationCount += rows.length
      if (observationCount > 10_000) {
        throw new ApiError('E_VALIDATION', 'dataSnapshot no puede exceder 10000 observaciones', 422)
      }
      if (
        rows.some(
          (row) =>
            !row ||
            typeof row.period !== 'string' ||
            row.period.length > 100 ||
            typeof row.value !== 'number' ||
            !Number.isFinite(row.value)
        )
      ) {
        throw new ApiError('E_VALIDATION', 'dataSnapshot contiene observaciones inválidas', 422)
      }
    }

    if (!input.title || input.title.trim().length < 3) {
      throw new ApiError(
        'E_VALIDATION',
        'El título del gráfico debe tener al menos 3 caracteres',
        422,
        {
          field: 'title',
        }
      )
    }

    if (!chartMethods.includes(input.method)) {
      throw new ApiError(
        'E_VALIDATION',
        `Método de visualización no válido: ${input.method}`,
        422,
        {
          field: 'method',
          allowed: chartMethods,
        }
      )
    }

    if (!input.series || input.series.length === 0) {
      throw new ApiError(
        'E_VALIDATION',
        'El gráfico debe definir al menos una serie de datos',
        422,
        {
          field: 'series',
        }
      )
    }

    for (const s of input.series) {
      if (!s.seriesId || s.seriesId.trim().length === 0 || !s.unit || s.unit.trim().length === 0) {
        throw new ApiError(
          'E_VALIDATION',
          'Cada serie debe especificar identificador (seriesId) y unidad de medida (unit) explícitos',
          422,
          { field: 'series' }
        )
      }
    }

    if (!input.timeRange || !input.timeRange.from || !input.timeRange.to) {
      throw new ApiError(
        'E_VALIDATION',
        'El rango temporal debe especificar períodos de inicio (from) y fin (to)',
        422,
        { field: 'timeRange' }
      )
    }

    if (!input.dataSnapshot || !input.dataSnapshot.series) {
      throw new ApiError('E_VALIDATION', 'El gráfico debe incluir un dataSnapshot tabular', 422, {
        field: 'dataSnapshot',
      })
    }

    // Verify snapshot hash integrity
    const calculatedDataHash = calculateDataSnapshotHash(input.dataSnapshot.series)
    assertSnapshotIntegrity(input.dataSnapshot, calculatedDataHash)

    // Calculate deterministic queryHash
    const queryHash = calculateQueryHash({
      method: input.method,
      series: input.series,
      events: input.events ?? [],
      timeRange: input.timeRange,
      transformations: input.transformations ?? [],
    })

    // Evaluate anti-manipulation rules
    const evaluation = validateAntiManipulation({
      title: input.title,
      description: input.description ?? '',
      method: input.method,
      series: input.series,
      events: input.events ?? [],
      timeRange: input.timeRange,
      transformations: input.transformations ?? [],
      dataSnapshot: input.dataSnapshot,
      sources: input.sources ?? [],
      limitations: input.limitations ?? [],
      queryHash,
    })

    const normalizedSpec: ChartSpec = {
      schemaVersion: '1.0.0',
      renderer: {
        name: 'vega-lite',
        version: '5.21.0',
      },
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      method: input.method,
      series: input.series,
      events: input.events ?? [],
      timeRange: input.timeRange,
      transformations: input.transformations ?? [],
      queryHash,
      dataSnapshot: input.dataSnapshot,
      sources: input.sources ?? [],
      limitations: input.limitations ?? [],
      warnings: evaluation.warnings,
    }

    return {
      valid: true,
      queryHash,
      dataHash: calculatedDataHash,
      warnings: evaluation.warnings,
      normalizedSpec,
    }
  }
}
