/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/web_explorer_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/web_explorer_controller').default['index']>>>
    }
  }
  'openapi': {
    methods: ["GET","HEAD"]
    pattern: '/openapi.json'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/open_api_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/open_api_controller').default['show']>>>
    }
  }
  'claims.index': {
    methods: ["GET","HEAD"]
    pattern: '/v1/claims'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['index']>>>
    }
  }
  'claims.show': {
    methods: ["GET","HEAD"]
    pattern: '/v1/claims/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/claims_controller').default['show']>>>
    }
  }
  'explore.index': {
    methods: ["GET","HEAD"]
    pattern: '/v1/explore'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/explore_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/explore_controller').default['index']>>>
    }
  }
  'chart_specs.validate': {
    methods: ["POST"]
    pattern: '/v1/chart-specs/validate'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chart_specs_controller').default['validate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chart_specs_controller').default['validate']>>>
    }
  }
  'publications.store': {
    methods: ["POST"]
    pattern: '/v1/publications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/publications_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/publications_controller').default['store']>>>
    }
  }
  'publications.show': {
    methods: ["GET","HEAD"]
    pattern: '/v1/publications/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/publications_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/publications_controller').default['show']>>>
    }
  }
  'comments.index': {
    methods: ["GET","HEAD"]
    pattern: '/v1/publications/:id/comments'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/comments_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/comments_controller').default['index']>>>
    }
  }
  'comments.store': {
    methods: ["POST"]
    pattern: '/v1/publications/:id/comments'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/comments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/comments_controller').default['store']>>>
    }
  }
  'votes.show': {
    methods: ["GET","HEAD"]
    pattern: '/v1/publications/:id/votes'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/votes_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/votes_controller').default['show']>>>
    }
  }
  'votes.store': {
    methods: ["POST"]
    pattern: '/v1/publications/:id/votes'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/votes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/votes_controller').default['store']>>>
    }
  }
  'reports.store': {
    methods: ["POST"]
    pattern: '/v1/reports'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['store']>>>
    }
  }
  'assistance.query': {
    methods: ["POST"]
    pattern: '/v1/assistance/query'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/assistance_controller').default['query']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/assistance_controller').default['query']>>>
    }
  }
  'series.index': {
    methods: ["GET","HEAD"]
    pattern: '/v1/series'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/series_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/series_controller').default['index']>>>
    }
  }
  'series.show': {
    methods: ["GET","HEAD"]
    pattern: '/v1/series/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/series_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/series_controller').default['show']>>>
    }
  }
  'series.vintages': {
    methods: ["GET","HEAD"]
    pattern: '/v1/series/:id/vintages'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/series_controller').default['vintages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/series_controller').default['vintages']>>>
    }
  }
  'series.observations': {
    methods: ["GET","HEAD"]
    pattern: '/v1/series/:id/observations'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/series_controller').default['observations']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/series_controller').default['observations']>>>
    }
  }
  'forecasts.show': {
    methods: ["GET","HEAD"]
    pattern: '/v1/forecasts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/series_controller').default['forecast']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/series_controller').default['forecast']>>>
    }
  }
  'claims.prov': {
    methods: ["GET","HEAD"]
    pattern: '/v1/claims/:id/prov'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interoperability_controller').default['claimsProv']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interoperability_controller').default['claimsProv']>>>
    }
  }
  'publications.prov': {
    methods: ["GET","HEAD"]
    pattern: '/v1/publications/:id/prov'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interoperability_controller').default['publicationsProv']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interoperability_controller').default['publicationsProv']>>>
    }
  }
  'series.sdmx': {
    methods: ["GET","HEAD"]
    pattern: '/v1/series/:id/sdmx'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interoperability_controller').default['seriesSdmx']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interoperability_controller').default['seriesSdmx']>>>
    }
  }
  'mcp': {
    methods: ["POST"]
    pattern: '/v1/mcp'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interoperability_controller').default['mcp']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interoperability_controller').default['mcp']>>>
    }
  }
  'places.geojson': {
    methods: ["GET","HEAD"]
    pattern: '/v1/places/geojson'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/places_controller').default['geojson']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/places_controller').default['geojson']>>>
    }
  }
}
