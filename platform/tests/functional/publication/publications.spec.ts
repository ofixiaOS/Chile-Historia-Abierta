import { calculateDataSnapshotHash } from '#modules/publication/domain/chart_spec'
import type { PublicPublicationResponse } from '#modules/publication/application/get_publication_service'
import { readJsonBody, type ApiErrorResponse } from '#tests/helpers/http_json'
import { test } from '@japa/runner'

test.group('Publications API (Functional)', () => {
  const seriesData = {
    tpm: [
      { period: '2021', value: 4.0 },
      { period: '2022', value: 11.25 },
    ],
  }
  const contentHash = calculateDataSnapshotHash(seriesData)

  const sampleChartSpec = {
    title: 'Evolución oficial de la TPM',
    method: 'series_trend' as const,
    series: [
      {
        seriesId: 'tpm',
        label: 'Tasa de Política Monetaria',
        unit: '% anual',
      },
    ],
    timeRange: { from: '2021', to: '2022' },
    dataSnapshot: {
      contentHash,
      series: seriesData,
    },
    sources: ['bcentral-bde'],
  }

  test('creates a typed publication with ChartSpec and retrieves it via GET', async ({
    client,
    assert,
  }) => {
    const createResponse = await client
      .post('/v1/publications')
      .header('authorization', `Bearer ${process.env.PILOT_EDITOR_TOKEN}`)
      .json({
        type: 'dato',
        author: { id: 'usr-falsificado', displayName: 'Nombre falsificado' },
        conflictsOfInterest: [
          { entity: 'Banco Central', relationship: 'Investigador independiente' },
        ],
        title: 'Registro de la TPM oficial para 2021-2022',
        content:
          'Serie observada de la Tasa de Política Monetaria publicada en la Base de Datos Estadísticos.',
        evidence: [
          {
            sourceId: 'bcentral-bde',
            description: 'Serie F073.TIR.FON.NO.D de la Base de Datos Estadísticos',
          },
        ],
        chartSpec: sampleChartSpec,
        limitations: ['Unidad: % anual', 'Periodo: 2021-2022'],
      })

    createResponse.assertStatus(201)
    const createBody = readJsonBody<{
      data: { type: string; publicationType: string; id: string }
    }>(createResponse)
    assert.equal(createBody.data.type, 'publication')
    assert.equal(createBody.data.publicationType, 'dato')
    assert.isString(createBody.data.id)

    const publicationId = createBody.data.id

    // Retrieve created publication
    const getResponse = await client.get(`/v1/publications/${publicationId}`)
    getResponse.assertStatus(200)

    const getBody = readJsonBody<PublicPublicationResponse>(getResponse)
    assert.equal(getBody.data.id, publicationId)
    assert.equal(getBody.data.publicationType, 'dato')
    assert.equal(getBody.data.attributes.title, 'Registro de la TPM oficial para 2021-2022')
    assert.equal(getBody.data.attributes.author.id, 'pilot-editor-test')
    assert.equal(getBody.data.attributes.author.displayName, 'Editor de prueba')
    assert.lengthOf(getBody.data.attributes.conflictsOfInterest, 1)

    // Verify ChartSpec and tabular data are accessible for third-party reproduction
    assert.isNotNull(getBody.data.chartSpec)
    assert.equal(getBody.data.chartSpec!.title, 'Evolución oficial de la TPM')
    assert.isDefined(getBody.data.tabularData)
    assert.deepEqual(getBody.data.tabularData, seriesData)

    // Verify ETag and conditional caching (304)
    const etag = getResponse.header('etag')
    assert.isDefined(etag)

    const conditionalResponse = await client
      .get(`/v1/publications/${publicationId}`)
      .header('if-none-match', etag!)
    conditionalResponse.assertStatus(304)
    assert.isEmpty(conditionalResponse.text())
  })

  test('rejects creating a publication when type requirements are violated', async ({
    client,
    assert,
  }) => {
    // "dato" without evidence
    const response = await client
      .post('/v1/publications')
      .header('authorization', `Bearer ${process.env.PILOT_EDITOR_TOKEN}`)
      .json({
        type: 'dato',
        author: { id: 'usr-1', displayName: 'Autor' },
        title: 'Dato sin evidencia empírica',
        content: 'Contenido que afirma un dato sin citar ninguna fuente.',
        evidence: [],
        limitations: ['Unidad: CLP', 'Periodo: 2020'],
      })

    response.assertStatus(422)
    const error = readJsonBody<ApiErrorResponse>(response).error
    assert.equal(error.code, 'E_VALIDATION')
    assert.include(error.message, 'exige al menos una fuente u observación')
  })

  test('returns 404 for non-existent publication ID', async ({ client, assert }) => {
    const response = await client.get('/v1/publications/inexistent-pub-id-9999')
    response.assertStatus(404)
    assert.equal(readJsonBody<ApiErrorResponse>(response).error.code, 'E_NOT_FOUND')
  })

  test('rejects publication writes without a valid server credential', async ({
    client,
    assert,
  }) => {
    const body = {
      type: 'dato',
      author: { id: 'spoofed', displayName: 'Spoofed' },
      title: 'Publicación de intento no autorizado',
      content: 'Contenido usado solo para prueba de rechazo.',
      evidence: [{ sourceId: 'synthetic', description: 'Synthetic' }],
    }

    const missing = await client.post('/v1/publications').json(body)
    missing.assertStatus(401)
    assert.equal(readJsonBody<ApiErrorResponse>(missing).error.code, 'E_UNAUTHENTICATED')

    const invalid = await client
      .post('/v1/publications')
      .header('authorization', 'Bearer invalid_invalid_invalid_invalid_invalid_invalid')
      .json(body)
    invalid.assertStatus(401)
    assert.equal(readJsonBody<ApiErrorResponse>(invalid).error.code, 'E_UNAUTHENTICATED')
  })
})
