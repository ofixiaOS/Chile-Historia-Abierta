import IngestionService from '#modules/catalog/application/ingestion_service'
import { computeSha256, type HttpTransport } from '#modules/catalog/domain/source_connector'
import BcentralBdeConnector from '#modules/catalog/infrastructure/connectors/bcentral_bde_connector'
import CongresoBcnConnector from '#modules/catalog/infrastructure/connectors/congreso_bcn_connector'
import EditorialClaimService from '#modules/evidence/application/editorial_claim_service'
import InMemoryClaimWriteRepository from '#modules/evidence/infrastructure/in_memory_claim_write_repository'
import { test } from '@japa/runner'
import { validateHostSafety } from '#modules/catalog/domain/source_connector'

test.group('SourceConnectors & IngestionService (Unit)', () => {
  test('BcentralBdeConnector fetches and normalizes official TPM golden sample', async ({
    assert,
  }) => {
    const connector = new BcentralBdeConnector()
    const raw = await connector.fetch(
      'https://si3.bcentral.cl/estadisticas/Series/F073.TIR.FON.NO.D'
    )

    assert.equal(raw.mimeType, 'application/json')
    assert.match(raw.contentHash, /^[0-9a-f]{64}$/)
    assert.equal(raw.contentHash, computeSha256(raw.content))

    const extraction = connector.normalize(raw)
    assert.equal(extraction.sourceId, 'bcentral-bde')
    assert.lengthOf(extraction.claims, 3)

    const firstClaim = extraction.claims[0]
    assert.include(firstClaim.statement, 'Tasa de Política Monetaria (TPM)')
    assert.include(firstClaim.statement, '8.25%')
    assert.equal(firstClaim.evidenceStatus, 'documented')
    assert.equal(firstClaim.locator.type, 'row')
    assert.include(firstClaim.locator.value, 'seriesId=F073.TIR.FON.NO.D')
    assert.equal(firstClaim.linkType, 'supports')
  })

  test('BcentralBdeConnector enforces SSRF defense against unapproved hosts', async ({
    assert,
  }) => {
    const connector = new BcentralBdeConnector()

    await assert.rejects(
      () => connector.fetch('https://evil.attacker.invalid/fake-bde'),
      /SSRF Defense: Host "evil.attacker.invalid" is not in the connector allowlist/
    )
  })

  test('source URL policy requires exact allowlisted HTTPS host on default port without userinfo', async ({
    assert,
  }) => {
    const connector = new BcentralBdeConnector()

    assert.equal(
      validateHostSafety('https://si3.bcentral.cl/series/test', connector.policy.allowedHosts)
        .hostname,
      'si3.bcentral.cl'
    )

    for (const url of [
      'http://si3.bcentral.cl/series/test',
      'https://si3.bcentral.cl:8443/series/test',
      'https://user:secret@si3.bcentral.cl/series/test',
      'https://untrusted.si3.bcentral.cl/series/test',
    ]) {
      await assert.rejects(
        async () => validateHostSafety(url, connector.policy.allowedHosts),
        /Only HTTPS|Custom ports|Credentials embedded|not in the connector allowlist/
      )
    }
  })

  test('invalid source URL parse errors do not echo supplied URLs or credentials', async ({
    assert,
  }) => {
    const secretUrl = 'https://user:secret@['
    let caught: unknown
    try {
      validateHostSafety(secretUrl, ['si3.bcentral.cl'])
    } catch (error) {
      caught = error
    }

    assert.instanceOf(caught, Error)
    const error = caught as Error
    assert.notInclude(error.message, 'secret')
    assert.notInclude(error.message, secretUrl)
    assert.equal(error.message, 'Invalid target URL')
  })

  test('BcentralBdeConnector fails closed on corrupt or drifted schema', async ({ assert }) => {
    const connector = new BcentralBdeConnector()

    assert.throws(
      () =>
        connector.normalize({
          sourceUrl: 'https://si3.bcentral.cl/test',
          mimeType: 'application/json',
          content: '{"invalid": true}',
          contentHash: 'hash',
          retrievedAt: new Date().toISOString(),
        }),
      /Schema drift: missing Series or observations in BCentral payload/
    )

    assert.throws(
      () =>
        connector.normalize({
          sourceUrl: 'https://si3.bcentral.cl/test',
          mimeType: 'application/json',
          content: 'NOT_JSON',
          contentHash: 'hash',
          retrievedAt: new Date().toISOString(),
        }),
      /Corrupt JSON payload from BCentral BDE/
    )
  })

  test('BcentralBdeConnector rejects payloads exceeding maxBytes', async ({ assert }) => {
    const connector = new BcentralBdeConnector()
    const mockTransport: HttpTransport = {
      async get() {
        return {
          content: 'x'.repeat(connector.policy.maxBytes + 100),
          mimeType: 'application/json',
        }
      },
    }

    await assert.rejects(
      () => connector.fetch('https://si3.bcentral.cl/huge', mockTransport),
      /Payload size exceeds maximum allowed/
    )
  })

  test('CongresoBcnConnector fetches and normalizes Ley 21045 golden sample', async ({
    assert,
  }) => {
    const connector = new CongresoBcnConnector()
    const raw = await connector.fetch('https://opendata.congreso.cl/leyes/21045')

    assert.equal(raw.mimeType, 'application/json')
    assert.match(raw.contentHash, /^[0-9a-f]{64}$/)
    assert.equal(raw.contentHash, computeSha256(raw.content))

    const extraction = connector.normalize(raw)
    assert.equal(extraction.sourceId, 'congreso-bcn')
    assert.lengthOf(extraction.claims, 2)

    const milestoneClaim = extraction.claims[0]
    assert.include(
      milestoneClaim.statement,
      'Crea el Ministerio de las Culturas, las Artes y el Patrimonio'
    )
    assert.include(milestoneClaim.statement, '2017-10-05')
    assert.equal(milestoneClaim.locator.type, 'fragment')
    assert.equal(milestoneClaim.locator.value, 'idNorma=1110037')

    const summaryClaim = extraction.claims[1]
    assert.include(summaryClaim.statement, 'secretaría de Estado encargada de colaborar')
  })

  test('IngestionService coordinates extraction with EditorialClaimService and outbox', async ({
    assert,
  }) => {
    const writeRepo = new InMemoryClaimWriteRepository()
    const editorialService = new EditorialClaimService(writeRepo)
    const ingestionService = new IngestionService(editorialService)
    const connector = new CongresoBcnConnector()

    const result = await ingestionService.ingest(
      connector,
      'https://opendata.congreso.cl/leyes/21045',
      { autoPublish: true }
    )

    assert.equal(result.sourceId, 'congreso-bcn')
    assert.lengthOf(result.createdClaims, 2)
    assert.equal(result.createdClaims[0].currentRevision.editorialStatus, 'published')
    assert.equal(result.createdClaims[1].currentRevision.editorialStatus, 'published')

    const events = writeRepo.getAllEvents()
    // 2 drafts created + 2 published
    assert.lengthOf(events, 4)
    assert.isTrue(events.some((e) => e.eventType === 'claim.published'))
  })

  test('IngestionService rejects ingest when payload hash mismatch occurs', async ({ assert }) => {
    const writeRepo = new InMemoryClaimWriteRepository()
    const editorialService = new EditorialClaimService(writeRepo)
    const ingestionService = new IngestionService(editorialService)

    const fakeConnector = new CongresoBcnConnector()
    const hijackedConnector = {
      policy: fakeConnector.policy,
      normalize: (raw: Parameters<typeof fakeConnector.normalize>[0]) =>
        fakeConnector.normalize(raw),
      async fetch(url: string) {
        const original = await fakeConnector.fetch(url)
        return {
          ...original,
          content: original.content + ' /* tampered */',
        }
      },
    }

    await assert.rejects(
      () => ingestionService.ingest(hijackedConnector, 'https://opendata.congreso.cl/leyes/21045'),
      /Cryptographic hash mismatch: raw artifact was corrupted or modified/
    )
  })
})
