/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home']
  openapi: typeof routes['openapi']
  claims: {
    index: typeof routes['claims.index']
    show: typeof routes['claims.show']
    prov: typeof routes['claims.prov']
  }
  explore: {
    index: typeof routes['explore.index']
  }
  chartSpecs: {
    validate: typeof routes['chart_specs.validate']
  }
  publications: {
    store: typeof routes['publications.store']
    show: typeof routes['publications.show']
    prov: typeof routes['publications.prov']
  }
  comments: {
    index: typeof routes['comments.index']
    store: typeof routes['comments.store']
  }
  votes: {
    show: typeof routes['votes.show']
    store: typeof routes['votes.store']
  }
  reports: {
    store: typeof routes['reports.store']
  }
  assistance: {
    query: typeof routes['assistance.query']
  }
  series: {
    index: typeof routes['series.index']
    show: typeof routes['series.show']
    vintages: typeof routes['series.vintages']
    observations: typeof routes['series.observations']
    sdmx: typeof routes['series.sdmx']
  }
  forecasts: {
    show: typeof routes['forecasts.show']
  }
  mcp: typeof routes['mcp']
  places: {
    geojson: typeof routes['places.geojson']
  }
}
