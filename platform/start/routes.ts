/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', [controllers.WebExplorer, 'index']).as('home')

router.get('/openapi.json', [controllers.OpenApi, 'show']).as('openapi')

router.get('/v1/claims', [controllers.Claims, 'index']).as('claims.index')
router.get('/v1/claims/:id', [controllers.Claims, 'show']).as('claims.show')

router.get('/v1/explore', [controllers.Explore, 'index']).as('explore.index')

router
  .post('/v1/chart-specs/validate', [controllers.ChartSpecs, 'validate'])
  .as('chart_specs.validate')
router.post('/v1/publications', [controllers.Publications, 'store']).as('publications.store')
router.get('/v1/publications/:id', [controllers.Publications, 'show']).as('publications.show')

router.get('/v1/publications/:id/comments', [controllers.Comments, 'index']).as('comments.index')
router.post('/v1/publications/:id/comments', [controllers.Comments, 'store']).as('comments.store')

router.get('/v1/publications/:id/votes', [controllers.Votes, 'show']).as('votes.show')
router.post('/v1/publications/:id/votes', [controllers.Votes, 'store']).as('votes.store')

router.post('/v1/reports', [controllers.Reports, 'store']).as('reports.store')

router.post('/v1/assistance/query', [controllers.Assistance, 'query']).as('assistance.query')

router.get('/v1/series', [controllers.Series, 'index']).as('series.index')
router.get('/v1/series/:id', [controllers.Series, 'show']).as('series.show')
router.get('/v1/series/:id/vintages', [controllers.Series, 'vintages']).as('series.vintages')
router
  .get('/v1/series/:id/observations', [controllers.Series, 'observations'])
  .as('series.observations')
router.get('/v1/forecasts/:id', [controllers.Series, 'forecast']).as('forecasts.show')

router.get('/v1/claims/:id/prov', [controllers.Interoperability, 'claimsProv']).as('claims.prov')
router
  .get('/v1/publications/:id/prov', [controllers.Interoperability, 'publicationsProv'])
  .as('publications.prov')
router.get('/v1/series/:id/sdmx', [controllers.Interoperability, 'seriesSdmx']).as('series.sdmx')
router.post('/v1/mcp', [controllers.Interoperability, 'mcp']).as('mcp')

router.get('/v1/places/geojson', [controllers.Places, 'geojson']).as('places.geojson')
