import type { ChartSpec, ChartWarning, DataSnapshot } from '#modules/publication/domain/chart_spec'
import ApiError from '#shared/errors/api_error'

export interface AntiManipulationEvaluation {
  readonly warnings: readonly ChartWarning[]
}

export function validateAntiManipulation(
  spec: Omit<ChartSpec, 'warnings' | 'queryHash' | 'schemaVersion' | 'renderer'> & {
    readonly queryHash?: string
  }
): AntiManipulationEvaluation {
  const warnings: ChartWarning[] = []

  // 1. Causal Inference Guard
  if (spec.method === 'causal_inference') {
    const hasDocumentedMethodology = spec.limitations.some(
      (lim) =>
        lim.toLowerCase().includes('método') ||
        lim.toLowerCase().includes('metodo') ||
        lim.toLowerCase().includes('contrafactual') ||
        lim.toLowerCase().includes('supuesto') ||
        lim.toLowerCase().includes('identificación') ||
        lim.toLowerCase().includes('identificacion')
    )

    if (!hasDocumentedMethodology) {
      throw new ApiError(
        'E_VALIDATION',
        'Un análisis causal requiere registrar explícitamente supuestos de identificación o metodología contrafactual en limitations',
        422,
        { field: 'method' }
      )
    }
  }

  // 2. Truncated Axis Warning
  for (const s of spec.series) {
    if (s.scale?.zero === false || (s.scale?.domain && s.scale.domain[0] > 0)) {
      warnings.push({
        code: 'TRUNCATED_AXIS',
        message: `El eje de la serie "${s.label}" no inicia en cero; las variaciones visuales pueden resultar amplificadas.`,
        field: s.seriesId,
      })
    }
  }

  // 3. Dual Axis Disparity Warning
  if (spec.series.length > 1) {
    const units = new Set(spec.series.map((s) => s.unit.trim().toLowerCase()))
    if (units.size > 1) {
      warnings.push({
        code: 'DUAL_AXIS_DISPARITY',
        message:
          'El gráfico combina series con unidades distintas; comprueba que la superposición no induzca a interpretar correlación como causalidad.',
      })
    }
  }

  // 4. Data Discontinuity Check
  if (spec.dataSnapshot?.series) {
    for (const [seriesId, observations] of Object.entries(spec.dataSnapshot.series)) {
      if (observations.length >= 2) {
        // Sort periods
        const sorted = [...observations].sort((a, b) => a.period.localeCompare(b.period))
        for (let i = 1; i < sorted.length; i++) {
          const prevYear = Number.parseInt(sorted[i - 1].period.slice(0, 4), 10)
          const currYear = Number.parseInt(sorted[i].period.slice(0, 4), 10)
          if (!Number.isNaN(prevYear) && !Number.isNaN(currYear) && currYear - prevYear > 2) {
            warnings.push({
              code: 'DATA_DISCONTINUITY',
              message: `La serie "${seriesId}" presenta una discontinuidad temporal de ${currYear - prevYear} años entre ${sorted[i - 1].period} y ${sorted[i].period}.`,
              field: seriesId,
            })
            break
          }
        }
      }
    }
  }

  return { warnings }
}

export function assertSnapshotIntegrity(snapshot: DataSnapshot, expectedHash: string): void {
  if (snapshot.contentHash !== expectedHash) {
    throw new ApiError(
      'E_VALIDATION',
      'El contentHash del snapshot no coincide con el cálculo de los datos tabulares',
      422,
      {
        expected: expectedHash,
        declared: snapshot.contentHash,
      }
    )
  }
}
