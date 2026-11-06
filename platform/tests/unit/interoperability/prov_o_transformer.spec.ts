import type { PublicClaimResponse } from '#modules/evidence/application/get_public_claim'
import type { PublicPublicationResponse } from '#modules/publication/application/get_publication_service'
import {
  transformClaimToProvO,
  transformPublicationToProvO,
} from '#modules/interoperability/domain/prov_o_transformer'
import { test } from '@japa/runner'

test.group('PROV-O Transformer (Unit)', () => {
  const mockClaimResponse: PublicClaimResponse = {
    data: {
      type: 'claim',
      id: 'claim-tpm-1',
      attributes: {
        statement: 'La TPM en enero de 2024 fue de 8.25%.',
        revision: {
          id: 'rev-tpm-1',
          number: 1,
          supersedesRevisionId: null,
        },
        editorialStatus: 'published',
        publishedAt: '2024-09-22T00:00:00.000Z',
      },
    },
    included: [],
    sources: [
      {
        sourceId: 'bcentral-cl',
        artifactId: 'art-bcentral-tpm-01',
        sourceType: 'official_statistical',
        sourceName: 'Banco Central de Chile - BDE',
        responsibleAgent: 'Banco Central de Chile',
        sourceUrl: 'https://si3.bcentral.cl',
        publishedAt: '2024-01-31T00:00:00.000Z',
        retrievedAt: '2024-09-22T00:00:00.000Z',
        locator: {
          type: 'table',
          value: 'F073.TIR.FON.NO.D',
        },
        contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        hashAlgorithm: 'sha256',
        rights: {
          softwareLicense: 'MIT',
          datasetLicense: 'ODC-By-1.0',
          itemRights: 'CC-BY-4.0',
          redistributionPolicy: 'attribution-required',
          requiredAttribution: 'Banco Central de Chile',
        },
        transformationMethod: 'direct_extraction',
        linkType: 'supports',
        limitations: [],
      },
    ],
    evidenceStatus: 'documented',
    limitations: ['Dato nominal oficial'],
    asOf: '2024-09-22T00:00:00.000Z',
    version: '1.0.0',
    freshness: { generatedAt: '2024-09-22T00:00:00.000Z', sourceVersion: 'v1' },
    links: { self: '/v1/claims/claim-tpm-1' },
  }

  test('transformClaimToProvO produce grafo conforme a W3C PROV-O en JSON-LD', ({ assert }) => {
    const provGraph = transformClaimToProvO(mockClaimResponse)

    assert.equal(provGraph['@context'].prov, 'http://www.w3.org/ns/prov#')
    assert.equal(provGraph['@context'].schema, 'http://schema.org/')
    assert.equal(provGraph['@context'].cha, 'https://chilehistoriaabierta.cl/ns#')

    assert.isAbove(provGraph['@graph'].length, 2)

    // Entidad principal
    const claimEntity = provGraph['@graph'].find(
      (e) => e['@id'] === 'urn:cha:claim:claim-tpm-1:rev:rev-tpm-1'
    )
    assert.isDefined(claimEntity)
    assert.deepEqual(claimEntity!['@type'], ['prov:Entity', 'schema:Claim'])
    assert.equal(claimEntity!['schema:headline'], mockClaimResponse.data.attributes.statement)
    assert.equal(claimEntity!['cha:evidenceStatus'], 'documented')

    // Actividad de publicación
    const activity = provGraph['@graph'].find(
      (e) => e['@id'] === 'urn:cha:activity:publish-claim:claim-tpm-1:rev-tpm-1'
    )
    assert.isDefined(activity)
    assert.equal(activity!['@type'], 'prov:Activity')

    // Artefacto fuente derivado
    const artifactEntity = provGraph['@graph'].find(
      (e) => e['@id'] === 'urn:cha:source-artifact:art-bcentral-tpm-01'
    )
    assert.isDefined(artifactEntity)
    assert.equal(artifactEntity!['cha:contentHash'], mockClaimResponse.sources[0]!.contentHash)
    assert.equal(artifactEntity!['cha:datasetLicense'], 'ODC-By-1.0')
  })

  test('transformPublicationToProvO produce grafo de publicación con atribución y hashes de gráfico', ({
    assert,
  }) => {
    const mockPublicationResponse: PublicPublicationResponse = {
      data: {
        type: 'publication',
        id: 'pub-test-1',
        publicationType: 'dato',
        attributes: {
          title: 'Evolución de la TPM durante 2024',
          content: 'Presentamos la serie de la tasa de política monetaria observada.',
          revisionNumber: 1,
          publishedAt: '2024-09-22T00:00:00.000Z',
          author: { id: 'usr-1', displayName: 'Historiador Económico' },
          conflictsOfInterest: [],
          forkedFromPublicationId: null,
        },
        evidence: [],
        chartSpec: {
          schemaVersion: '1.0.0',
          renderer: { name: 'vega-lite', version: '5.21.0' },
          title: 'TPM 2024',
          description: 'Evolución mensual',
          method: 'series_trend',
          series: [{ seriesId: 'bcentral-tpm', label: 'TPM', unit: '%' }],
          events: [],
          timeRange: { from: '2024-01', to: '2024-08' },
          transformations: [],
          queryHash: '1111222233334444555566667777888899990000aaaabbbbccccddddeeee0001',
          dataSnapshot: {
            contentHash: '1111222233334444555566667777888899990000aaaabbbbccccddddeeee0002',
            series: {
              'bcentral-tpm': [{ period: '2024-01', value: 8.25 }],
            },
          },
          sources: ['bcentral-bde'],
          limitations: [],
          warnings: [],
        },
        limitations: ['Datos preliminares'],
        warnings: [],
      },
      asOf: '2024-09-22T00:00:00.000Z',
      version: '1.0.0',
      freshness: { generatedAt: '2024-09-22T00:00:00.000Z' },
      links: { self: '/v1/publications/pub-test-1' },
    }

    const provGraph = transformPublicationToProvO(mockPublicationResponse)

    const pubEntity = provGraph['@graph'].find(
      (e) => e['@id'] === 'urn:cha:publication:pub-test-1:rev:1'
    )
    assert.isDefined(pubEntity)
    assert.equal(
      pubEntity!['cha:chartQueryHash'],
      mockPublicationResponse.data.chartSpec?.queryHash
    )
    assert.equal(
      pubEntity!['cha:chartSnapshotHash'],
      mockPublicationResponse.data.chartSpec?.dataSnapshot.contentHash
    )

    const authorAgent = provGraph['@graph'].find((e) => e['@id'] === 'urn:cha:agent:usr-1')
    assert.isDefined(authorAgent)
    assert.equal(authorAgent!['schema:name'], 'Historiador Económico')
  })
})
