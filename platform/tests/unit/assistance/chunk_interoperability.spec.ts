import { test } from '@japa/runner'
import { assertEvidenceChunkIsValid, type EvidenceChunk } from '#modules/assistance/domain/chunk'

test.group('Interoperabilidad Worker Python <-> AdonisJS Platform (EvidenceChunk)', () => {
  test('valida chunks documentales generados por el pipeline del worker', () => {
    // Estructura representativa exportada por worker.application.document_pipeline
    const pythonGeneratedChunk: EvidenceChunk = {
      id: 'bcn-ley-17336-p1-c001',
      sourceId: 'bcn-ley-17336',
      sourceName: 'Ley 17.336 de Propiedad Intelectual',
      sourceType: 'official_administrative',
      contentHash: 'f4b2a8d3e1c94b7e9a8f230561bd89e2401763ef80918c0245a7bd5326a0cf5b',
      text: 'Artículo 1° La presente ley protege los derechos que adquieren los autores de obras de la inteligencia en los dominios literarios, artísticos y científicos.',
      locator: {
        type: 'fragment',
        value: 'p. 1#art-1',
      },
      epistemicStatus: 'documented',
      license: {
        softwareLicense: 'MIT',
        datasetLicense: 'CC-BY-4.0',
        itemRights: 'Public Domain (Ley 17.336 Art. 8)',
        redistributionPolicy: 'open_public_with_attribution',
        requiredAttribution: 'Biblioteca del Congreso Nacional de Chile',
      },
      retrievedAt: '2026-09-22T18:30:00.000Z',
    }

    // No debe arrojar error
    assertEvidenceChunkIsValid(pythonGeneratedChunk)
  })

  test('rechaza chunk con campos vacíos o incompletos conforme a invariantes de dominio', ({
    assert,
  }) => {
    const invalidChunk = {
      id: 'bcn-ley-17336-p1-c002',
      sourceId: 'bcn-ley-17336',
      sourceName: 'Ley 17.336',
      sourceType: 'official_administrative' as const,
      contentHash: 'invalido',
      text: 'Texto de prueba',
      locator: {
        type: 'page' as const,
        value: 'p. 1',
      },
      epistemicStatus: 'documented' as const,
      license: {
        softwareLicense: '',
        datasetLicense: '',
        itemRights: 'Public Domain',
        redistributionPolicy: 'open',
        requiredAttribution: 'BCN',
      },
      retrievedAt: '2026-09-22T18:30:00.000Z',
    }

    assert.throws(() => assertEvidenceChunkIsValid(invalidChunk))
  })
})
