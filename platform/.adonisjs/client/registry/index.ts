/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
  'openapi': {
    methods: ["GET","HEAD"],
    pattern: '/openapi.json',
    tokens: [{"old":"/openapi.json","type":0,"val":"openapi.json","end":""}],
    types: placeholder as Registry['openapi']['types'],
  },
  'claims.index': {
    methods: ["GET","HEAD"],
    pattern: '/v1/claims',
    tokens: [{"old":"/v1/claims","type":0,"val":"v1","end":""},{"old":"/v1/claims","type":0,"val":"claims","end":""}],
    types: placeholder as Registry['claims.index']['types'],
  },
  'claims.show': {
    methods: ["GET","HEAD"],
    pattern: '/v1/claims/:id',
    tokens: [{"old":"/v1/claims/:id","type":0,"val":"v1","end":""},{"old":"/v1/claims/:id","type":0,"val":"claims","end":""},{"old":"/v1/claims/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['claims.show']['types'],
  },
  'explore.index': {
    methods: ["GET","HEAD"],
    pattern: '/v1/explore',
    tokens: [{"old":"/v1/explore","type":0,"val":"v1","end":""},{"old":"/v1/explore","type":0,"val":"explore","end":""}],
    types: placeholder as Registry['explore.index']['types'],
  },
  'chart_specs.validate': {
    methods: ["POST"],
    pattern: '/v1/chart-specs/validate',
    tokens: [{"old":"/v1/chart-specs/validate","type":0,"val":"v1","end":""},{"old":"/v1/chart-specs/validate","type":0,"val":"chart-specs","end":""},{"old":"/v1/chart-specs/validate","type":0,"val":"validate","end":""}],
    types: placeholder as Registry['chart_specs.validate']['types'],
  },
  'publications.store': {
    methods: ["POST"],
    pattern: '/v1/publications',
    tokens: [{"old":"/v1/publications","type":0,"val":"v1","end":""},{"old":"/v1/publications","type":0,"val":"publications","end":""}],
    types: placeholder as Registry['publications.store']['types'],
  },
  'publications.show': {
    methods: ["GET","HEAD"],
    pattern: '/v1/publications/:id',
    tokens: [{"old":"/v1/publications/:id","type":0,"val":"v1","end":""},{"old":"/v1/publications/:id","type":0,"val":"publications","end":""},{"old":"/v1/publications/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['publications.show']['types'],
  },
  'comments.index': {
    methods: ["GET","HEAD"],
    pattern: '/v1/publications/:id/comments',
    tokens: [{"old":"/v1/publications/:id/comments","type":0,"val":"v1","end":""},{"old":"/v1/publications/:id/comments","type":0,"val":"publications","end":""},{"old":"/v1/publications/:id/comments","type":1,"val":"id","end":""},{"old":"/v1/publications/:id/comments","type":0,"val":"comments","end":""}],
    types: placeholder as Registry['comments.index']['types'],
  },
  'comments.store': {
    methods: ["POST"],
    pattern: '/v1/publications/:id/comments',
    tokens: [{"old":"/v1/publications/:id/comments","type":0,"val":"v1","end":""},{"old":"/v1/publications/:id/comments","type":0,"val":"publications","end":""},{"old":"/v1/publications/:id/comments","type":1,"val":"id","end":""},{"old":"/v1/publications/:id/comments","type":0,"val":"comments","end":""}],
    types: placeholder as Registry['comments.store']['types'],
  },
  'votes.show': {
    methods: ["GET","HEAD"],
    pattern: '/v1/publications/:id/votes',
    tokens: [{"old":"/v1/publications/:id/votes","type":0,"val":"v1","end":""},{"old":"/v1/publications/:id/votes","type":0,"val":"publications","end":""},{"old":"/v1/publications/:id/votes","type":1,"val":"id","end":""},{"old":"/v1/publications/:id/votes","type":0,"val":"votes","end":""}],
    types: placeholder as Registry['votes.show']['types'],
  },
  'votes.store': {
    methods: ["POST"],
    pattern: '/v1/publications/:id/votes',
    tokens: [{"old":"/v1/publications/:id/votes","type":0,"val":"v1","end":""},{"old":"/v1/publications/:id/votes","type":0,"val":"publications","end":""},{"old":"/v1/publications/:id/votes","type":1,"val":"id","end":""},{"old":"/v1/publications/:id/votes","type":0,"val":"votes","end":""}],
    types: placeholder as Registry['votes.store']['types'],
  },
  'reports.store': {
    methods: ["POST"],
    pattern: '/v1/reports',
    tokens: [{"old":"/v1/reports","type":0,"val":"v1","end":""},{"old":"/v1/reports","type":0,"val":"reports","end":""}],
    types: placeholder as Registry['reports.store']['types'],
  },
  'assistance.query': {
    methods: ["POST"],
    pattern: '/v1/assistance/query',
    tokens: [{"old":"/v1/assistance/query","type":0,"val":"v1","end":""},{"old":"/v1/assistance/query","type":0,"val":"assistance","end":""},{"old":"/v1/assistance/query","type":0,"val":"query","end":""}],
    types: placeholder as Registry['assistance.query']['types'],
  },
  'series.index': {
    methods: ["GET","HEAD"],
    pattern: '/v1/series',
    tokens: [{"old":"/v1/series","type":0,"val":"v1","end":""},{"old":"/v1/series","type":0,"val":"series","end":""}],
    types: placeholder as Registry['series.index']['types'],
  },
  'series.show': {
    methods: ["GET","HEAD"],
    pattern: '/v1/series/:id',
    tokens: [{"old":"/v1/series/:id","type":0,"val":"v1","end":""},{"old":"/v1/series/:id","type":0,"val":"series","end":""},{"old":"/v1/series/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['series.show']['types'],
  },
  'series.vintages': {
    methods: ["GET","HEAD"],
    pattern: '/v1/series/:id/vintages',
    tokens: [{"old":"/v1/series/:id/vintages","type":0,"val":"v1","end":""},{"old":"/v1/series/:id/vintages","type":0,"val":"series","end":""},{"old":"/v1/series/:id/vintages","type":1,"val":"id","end":""},{"old":"/v1/series/:id/vintages","type":0,"val":"vintages","end":""}],
    types: placeholder as Registry['series.vintages']['types'],
  },
  'series.observations': {
    methods: ["GET","HEAD"],
    pattern: '/v1/series/:id/observations',
    tokens: [{"old":"/v1/series/:id/observations","type":0,"val":"v1","end":""},{"old":"/v1/series/:id/observations","type":0,"val":"series","end":""},{"old":"/v1/series/:id/observations","type":1,"val":"id","end":""},{"old":"/v1/series/:id/observations","type":0,"val":"observations","end":""}],
    types: placeholder as Registry['series.observations']['types'],
  },
  'forecasts.show': {
    methods: ["GET","HEAD"],
    pattern: '/v1/forecasts/:id',
    tokens: [{"old":"/v1/forecasts/:id","type":0,"val":"v1","end":""},{"old":"/v1/forecasts/:id","type":0,"val":"forecasts","end":""},{"old":"/v1/forecasts/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['forecasts.show']['types'],
  },
  'claims.prov': {
    methods: ["GET","HEAD"],
    pattern: '/v1/claims/:id/prov',
    tokens: [{"old":"/v1/claims/:id/prov","type":0,"val":"v1","end":""},{"old":"/v1/claims/:id/prov","type":0,"val":"claims","end":""},{"old":"/v1/claims/:id/prov","type":1,"val":"id","end":""},{"old":"/v1/claims/:id/prov","type":0,"val":"prov","end":""}],
    types: placeholder as Registry['claims.prov']['types'],
  },
  'publications.prov': {
    methods: ["GET","HEAD"],
    pattern: '/v1/publications/:id/prov',
    tokens: [{"old":"/v1/publications/:id/prov","type":0,"val":"v1","end":""},{"old":"/v1/publications/:id/prov","type":0,"val":"publications","end":""},{"old":"/v1/publications/:id/prov","type":1,"val":"id","end":""},{"old":"/v1/publications/:id/prov","type":0,"val":"prov","end":""}],
    types: placeholder as Registry['publications.prov']['types'],
  },
  'series.sdmx': {
    methods: ["GET","HEAD"],
    pattern: '/v1/series/:id/sdmx',
    tokens: [{"old":"/v1/series/:id/sdmx","type":0,"val":"v1","end":""},{"old":"/v1/series/:id/sdmx","type":0,"val":"series","end":""},{"old":"/v1/series/:id/sdmx","type":1,"val":"id","end":""},{"old":"/v1/series/:id/sdmx","type":0,"val":"sdmx","end":""}],
    types: placeholder as Registry['series.sdmx']['types'],
  },
  'mcp': {
    methods: ["POST"],
    pattern: '/v1/mcp',
    tokens: [{"old":"/v1/mcp","type":0,"val":"v1","end":""},{"old":"/v1/mcp","type":0,"val":"mcp","end":""}],
    types: placeholder as Registry['mcp']['types'],
  },
  'places.geojson': {
    methods: ["GET","HEAD"],
    pattern: '/v1/places/geojson',
    tokens: [{"old":"/v1/places/geojson","type":0,"val":"v1","end":""},{"old":"/v1/places/geojson","type":0,"val":"places","end":""},{"old":"/v1/places/geojson","type":0,"val":"geojson","end":""}],
    types: placeholder as Registry['places.geojson']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
