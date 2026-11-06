import {
  createReleaseBundle,
  MAX_SOURCE_BYTES,
  parseReleaseDraft,
  validateReleaseBundle,
} from '#modules/releases/domain/release_bundle'
import { test } from '@japa/runner'

const sourceText = 'Documento sintético de prueba. La frase verificable aparece literalmente aquí.'

function draft() {
  return {
    dataVersion: 'synthetic-release-001',
    createdAt: '2026-09-22T12:00:00.000Z',
    source: {
      sourceId: 'synthetic-source',
      scopeIdentifier: 'synthetic-document-001',
      sourceType: 'official_administrative',
      sourceName: 'Fuente sintética de integración',
      responsibleAgent: 'Equipo de pruebas',
      sourceUrl: 'https://example.invalid/source/001',
      publishedAt: null,
    },
    artifact: {
      retrievedAt: '2026-09-22T12:00:00.000Z',
      softwareLicense: 'No software redistributed',
      datasetLicense: 'Synthetic test data',
      itemRights: 'Created for this test',
      redistributionPolicy: 'public_domain',
      requiredAttribution: 'Equipo de pruebas',
    },
    claim: {
      statement: 'La frase verificable aparece en el documento sintético.',
      evidenceStatus: 'documented',
      quoteExcerpt: 'La frase verificable aparece literalmente aquí.',
      locator: { type: 'fragment', value: 'parrafo-1' },
      transformationMethod: 'Transcripción literal',
      limitations: ['Solo prueba técnica'],
    },
  }
}

test.group('Local release bundle', () => {
  test('packs and verifies original bytes, metadata and both digests', ({ assert }) => {
    const raw = Buffer.from(sourceText, 'utf8')
    const bundle = createReleaseBundle(draft(), raw)
    const verified = validateReleaseBundle(JSON.parse(JSON.stringify(bundle)) as unknown)
    assert.equal(verified.raw.toString('utf8'), sourceText)
    assert.equal(verified.bundle.bundleHash, bundle.bundleHash)
    assert.match(bundle.manifest.artifact.contentHash, /^[a-f0-9]{64}$/)
  })

  test('rejects altered raw bytes and altered package hash', ({ assert }) => {
    const bundle = createReleaseBundle(draft(), Buffer.from(sourceText))
    assert.throws(
      () =>
        validateReleaseBundle({ ...bundle, rawBase64: Buffer.from('altered').toString('base64') }),
      /quoteExcerpt|hash mismatch/
    )
    assert.throws(
      () => validateReleaseBundle({ ...bundle, bundleHash: 'a'.repeat(64) }),
      /bundle hash mismatch/
    )
  })

  test('rejects missing quote, incomplete rights, unsafe URL and oversized source', ({
    assert,
  }) => {
    assert.throws(
      () =>
        createReleaseBundle(
          { ...draft(), claim: { ...draft().claim, quoteExcerpt: 'invented passage' } },
          Buffer.from(sourceText)
        ),
      /quoteExcerpt must occur literally/
    )
    assert.throws(
      () => parseReleaseDraft({ ...draft(), artifact: { ...draft().artifact, itemRights: '' } }),
      /artifact.itemRights/
    )
    assert.throws(
      () =>
        parseReleaseDraft({
          ...draft(),
          source: { ...draft().source, sourceUrl: 'http://127.0.0.1/internal' },
        }),
      /public HTTPS/
    )
    assert.throws(
      () => createReleaseBundle(draft(), Buffer.alloc(MAX_SOURCE_BYTES + 1, 65)),
      /raw source/
    )
  })
})
