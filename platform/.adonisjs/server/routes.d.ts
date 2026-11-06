import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'openapi': { paramsTuple?: []; params?: {} }
    'claims.index': { paramsTuple?: []; params?: {} }
    'claims.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'explore.index': { paramsTuple?: []; params?: {} }
    'chart_specs.validate': { paramsTuple?: []; params?: {} }
    'publications.store': { paramsTuple?: []; params?: {} }
    'publications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'comments.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'votes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'votes.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reports.store': { paramsTuple?: []; params?: {} }
    'assistance.query': { paramsTuple?: []; params?: {} }
    'series.index': { paramsTuple?: []; params?: {} }
    'series.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.vintages': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.observations': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forecasts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.prov': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'publications.prov': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.sdmx': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'mcp': { paramsTuple?: []; params?: {} }
    'places.geojson': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'openapi': { paramsTuple?: []; params?: {} }
    'claims.index': { paramsTuple?: []; params?: {} }
    'claims.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'explore.index': { paramsTuple?: []; params?: {} }
    'publications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'comments.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'votes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.index': { paramsTuple?: []; params?: {} }
    'series.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.vintages': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.observations': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forecasts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.prov': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'publications.prov': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.sdmx': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'places.geojson': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'openapi': { paramsTuple?: []; params?: {} }
    'claims.index': { paramsTuple?: []; params?: {} }
    'claims.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'explore.index': { paramsTuple?: []; params?: {} }
    'publications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'comments.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'votes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.index': { paramsTuple?: []; params?: {} }
    'series.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.vintages': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.observations': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forecasts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'claims.prov': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'publications.prov': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'series.sdmx': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'places.geojson': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'chart_specs.validate': { paramsTuple?: []; params?: {} }
    'publications.store': { paramsTuple?: []; params?: {} }
    'comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'votes.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reports.store': { paramsTuple?: []; params?: {} }
    'assistance.query': { paramsTuple?: []; params?: {} }
    'mcp': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}