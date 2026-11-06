import { test } from '@japa/runner'
import { CitationVerifier } from '#modules/assistance/application/citation_verifier'
import type { EvidenceChunk } from '#modules/assistance/domain/chunk'
import type { LlmClaimedCitation } from '#modules/assistance/domain/llm_provider'

test.group('CitationVerifier — Comprobación Determinista de Citas', () => {
  const verifier = new CitationVerifier()

  const sampleChunk: EvidenceChunk = {
    id: 'chunk-bcentral-1',
    sourceId: 'bcentral-cl',
    sourceName: 'Banco Central de Chile',
    sourceType: 'official_statistical',
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    text: 'La tasa de interés de política monetaria disminuyó a 6.50% en abril de 2024 de acuerdo con el Consejo.',
    locator: {
      type: 'table',
      value: 'F073.TIR.FON.NO.D',
    },
    epistemicStatus: 'documented',
    license: {
      softwareLicense: 'MIT',
      datasetLicense: 'ODC-By-1.0',
      itemRights: 'CC-BY-4.0',
      redistributionPolicy: 'public-attribution-required',
      requiredAttribution: 'Banco Central de Chile',
    },
    retrievedAt: '2026-09-22T00:00:00.000Z',
  }

  test('acepta citas válidas que coinciden con el chunk y su texto exacto', ({ assert }) => {
    const claims: LlmClaimedCitation[] = [
      {
        chunkId: 'chunk-bcentral-1',
        locatorValue: 'F073.TIR.FON.NO.D',
        quoteExcerpt: 'tasa de interés de política monetaria disminuyó a 6.50%',
      },
    ]

    const result = verifier.verify(claims, [sampleChunk])
    assert.isTrue(result.isValid)
    assert.lengthOf(result.verifiedCitations, 1)
    assert.equal(result.verifiedCitations[0].sourceName, 'Banco Central de Chile')
    assert.equal(result.verifiedCitations[0].locator.value, 'F073.TIR.FON.NO.D')
  })

  test('falla cuando no se proporcionan citas en la afirmación fáctica', ({ assert }) => {
    const result = verifier.verify([], [sampleChunk])
    assert.isFalse(result.isValid)
    assert.include(result.reason!, 'No citations provided')
  })

  test('falla y rechaza citas que referencian un chunk inexistente', ({ assert }) => {
    const claims: LlmClaimedCitation[] = [
      {
        chunkId: 'chunk-fantasma-999',
        locatorValue: 'F073.TIR.FON.NO.D',
        quoteExcerpt: 'tasa de interés',
      },
    ]

    const result = verifier.verify(claims, [sampleChunk])
    assert.isFalse(result.isValid)
    assert.include(result.reason!, 'does not exist in the retrieved evidence set')
  })

  test('falla cuando el locator no coincide con el registrado en el chunk', ({ assert }) => {
    const claims: LlmClaimedCitation[] = [
      {
        chunkId: 'chunk-bcentral-1',
        locatorValue: 'tabla-inexistente-123',
        quoteExcerpt: 'tasa de interés de política monetaria',
      },
    ]

    const result = verifier.verify(claims, [sampleChunk])
    assert.isFalse(result.isValid)
    assert.include(result.reason!, 'Locator mismatch')
  })

  test('falla cuando el extracto citado no se encuentra en el texto del chunk (alucinación)', ({
    assert,
  }) => {
    const claims: LlmClaimedCitation[] = [
      {
        chunkId: 'chunk-bcentral-1',
        locatorValue: 'F073.TIR.FON.NO.D',
        quoteExcerpt: 'La inflación se duplicó alcanzando cifras astronómicas',
      },
    ]

    const result = verifier.verify(claims, [sampleChunk])
    assert.isFalse(result.isValid)
    assert.include(result.reason!, 'not present in the retrieved content')
  })
  const exactQuote = 'tasa de interés de política monetaria disminuyó a 6.50%'
  for (const [label, altered] of [
    ['mayúsculas', exactQuote.toUpperCase()],
    ['tildes', exactQuote.replace('interés', 'interes')],
    ['puntuación', exactQuote.replace('6.50%', '6,50%')],
    ['espacios', exactQuote.replace(' de ', '  de ')],
    ['saltos de línea', exactQuote.replace(' de ', '\nde ')],
    ['composición Unicode', exactQuote.normalize('NFD')],
    ['espacios añadidos en extremos', `  ${exactQuote}  `],
    ['solo puntuación', '!!!!!'],
  ]) {
    test(`rechaza cambios de ${label} sin normalizar`, ({ assert }) => {
      const result = verifier.verify(
        [
          {
            chunkId: sampleChunk.id,
            locatorValue: sampleChunk.locator.value,
            quoteExcerpt: altered,
          },
        ],
        [sampleChunk]
      )
      assert.isFalse(result.isValid)
      assert.isEmpty(result.verifiedCitations)
    })
  }

  test('rechaza un localizador con espacios agregados', ({ assert }) => {
    const result = verifier.verify(
      [
        {
          chunkId: sampleChunk.id,
          locatorValue: ` ${sampleChunk.locator.value}`,
          quoteExcerpt: exactQuote,
        },
      ],
      [sampleChunk]
    )
    assert.isFalse(result.isValid)
  })

  test('conserva exactamente espacios, tabuladores y saltos presentes en el original', ({
    assert,
  }) => {
    const text = '  Texto\tcon  espacios\ny puntuación.  '
    const result = verifier.verify(
      [{ chunkId: sampleChunk.id, locatorValue: sampleChunk.locator.value, quoteExcerpt: text }],
      [{ ...sampleChunk, text }]
    )
    assert.isTrue(result.isValid)
    assert.equal(result.verifiedCitations[0].quoteExcerpt, text)
  })

  test('una cita inválida descarta también las citas anteriores del lote', ({ assert }) => {
    const result = verifier.verify(
      [
        {
          chunkId: sampleChunk.id,
          locatorValue: sampleChunk.locator.value,
          quoteExcerpt: exactQuote,
        },
        {
          chunkId: sampleChunk.id,
          locatorValue: sampleChunk.locator.value,
          quoteExcerpt: 'texto inexistente',
        },
      ],
      [sampleChunk]
    )
    assert.isFalse(result.isValid)
    assert.isEmpty(result.verifiedCitations)
  })
})
