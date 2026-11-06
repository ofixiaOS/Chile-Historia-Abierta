import { createHash } from 'node:crypto'

export const chartMethods = [
  'descriptive_comparison',
  'series_trend',
  'event_overlay',
  'cross_sectional',
  'causal_inference',
] as const

export type ChartMethod = (typeof chartMethods)[number]

export interface ChartSeriesDefinition {
  readonly seriesId: string
  readonly vintageId?: string
  readonly label: string
  readonly unit: string
  readonly scale?: {
    readonly zero?: boolean
    readonly domain?: readonly [number, number]
  }
}

export interface ChartEventOverlay {
  readonly eventId?: string
  readonly claimRevisionId?: string
  readonly label: string
  readonly date: string
}

export interface ChartTransformation {
  readonly name: 'index_base_100' | 'percentage_change' | 'none'
  readonly parameters?: Record<string, unknown>
}

export interface DataObservation {
  readonly period: string
  readonly value: number
}

export interface DataSnapshot {
  readonly contentHash: string
  readonly series: Record<string, readonly DataObservation[]>
}

export interface ChartWarning {
  readonly code:
    | 'TRUNCATED_AXIS'
    | 'DUAL_AXIS_DISPARITY'
    | 'DATA_DISCONTINUITY'
    | 'METHODOLOGY_BREAK'
    | 'UNVERIFIED_CAUSALITY'
  readonly message: string
  readonly field?: string
}

export interface ChartSpec {
  readonly id?: string
  readonly schemaVersion: '1.0.0'
  readonly renderer: {
    readonly name: 'vega-lite'
    readonly version: '5.21.0'
  }
  readonly title: string
  readonly description: string
  readonly method: ChartMethod
  readonly series: readonly ChartSeriesDefinition[]
  readonly events: readonly ChartEventOverlay[]
  readonly timeRange: {
    readonly from: string
    readonly to: string
  }
  readonly transformations: readonly ChartTransformation[]
  readonly queryHash: string
  readonly dataSnapshot: DataSnapshot
  readonly sources: readonly string[]
  readonly limitations: readonly string[]
  readonly warnings: readonly ChartWarning[]
}

/**
 * Calculates a deterministic SHA-256 hash for a normalized query definition.
 */
export function calculateQueryHash(query: {
  series: readonly { seriesId: string; vintageId?: string; unit: string }[]
  events: readonly { label: string; date: string }[]
  timeRange: { from: string; to: string }
  transformations: readonly ChartTransformation[]
  method: ChartMethod
}): string {
  const normalized = JSON.stringify({
    method: query.method,
    series: query.series.map((s) => ({ s: s.seriesId, v: s.vintageId ?? null, u: s.unit })),
    events: query.events.map((e) => ({ l: e.label, d: e.date })),
    timeRange: { f: query.timeRange.from, t: query.timeRange.to },
    transformations: query.transformations.map((t) => ({ n: t.name, p: t.parameters ?? null })),
  })

  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Calculates a deterministic SHA-256 hash for tabular series observations.
 */
export function calculateDataSnapshotHash(
  seriesData: Record<string, readonly DataObservation[]>
): string {
  const sortedKeys = Object.keys(seriesData).sort()
  const normalized: Record<string, { p: string; v: number }[]> = {}

  for (const key of sortedKeys) {
    normalized[key] = seriesData[key]
      .map((obs) => ({ p: obs.period, v: obs.value }))
      .sort((a, b) => a.p.localeCompare(b.p))
  }

  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}
