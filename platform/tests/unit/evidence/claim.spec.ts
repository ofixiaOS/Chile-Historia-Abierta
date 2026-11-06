import { assertClaimIsPublic, type ClaimRecord } from '#modules/evidence/domain/claim'
import ApiError from '#shared/errors/api_error'
import { test } from '@japa/runner'

function captureApiError(callback: () => void): ApiError {
  try {
    callback()
  } catch (error) {
    if (error instanceof ApiError) {
      return error
    }
    throw error
  }

  throw new Error('Expected callback to throw ApiError')
}

function makeClaim(overrides: Partial<ClaimRecord['currentRevision']> = {}): ClaimRecord {
  return {
    id: 'test-claim',
    projectedAt: '2026-09-22T12:00:00.000Z',
    currentRevision: {
      id: 'test-revision',
      revisionNumber: 1,
      statement: 'Enunciado de prueba sin valor histórico.',
      evidenceStatus: 'documented',
      editorialStatus: 'published',
      publishedAt: '2026-09-22T12:00:00.000Z',
      supersedesRevisionId: null,
      limitations: [],
      evidence: [
        {
          linkType: 'supports',
          source: {
            id: 'test-source',
            sourceType: 'community_post',
            sourceName: 'Fuente de prueba',
            responsibleAgent: 'Suite de pruebas',
            sourceUrl: 'https://example.invalid/test',
            publishedAt: null,
          },
          artifact: {
            id: 'test-artifact',
            retrievedAt: '2026-09-22T12:00:00.000Z',
            contentHash: 'b'.repeat(64),
            hashAlgorithm: 'sha256',
            softwareLicense: 'UNLICENSED',
            datasetLicense: 'UNLICENSED',
            itemRights: 'Prueba local',
            redistributionPolicy: 'No redistribuir',
            requiredAttribution: 'Suite de pruebas',
          },
          locator: { type: 'fragment', value: 'test-fragment' },
          transformationMethod: 'Sin transformación',
          limitations: [],
        },
      ],
      ...overrides,
    },
  }
}

test.group('Claim publication invariants', () => {
  test('accepts a published claim with localizable non-AI evidence', ({ assert }) => {
    assert.doesNotThrow(() => assertClaimIsPublic(makeClaim()))
  })

  test('hides draft claims from the public boundary', ({ assert }) => {
    const error = captureApiError(() =>
      assertClaimIsPublic(makeClaim({ editorialStatus: 'draft', publishedAt: null }))
    )

    assert.equal(error.code, 'E_NOT_FOUND')
  })

  test('rejects a published claim without evidence', ({ assert }) => {
    const error = captureApiError(() => assertClaimIsPublic(makeClaim({ evidence: [] })))

    assert.equal(error.code, 'E_EVIDENCE_INSUFFICIENT')
  })

  test('rejects an incomplete locator', ({ assert }) => {
    const claim = makeClaim()
    const evidence = claim.currentRevision.evidence.map((reference) => ({
      ...reference,
      locator: { ...reference.locator, value: '   ' },
    }))

    const error = captureApiError(() => assertClaimIsPublic(makeClaim({ evidence })))

    assert.equal(error.code, 'E_EVIDENCE_INSUFFICIENT')
  })

  test('does not treat AI output as sole support for a documented claim', ({ assert }) => {
    const claim = makeClaim()
    const evidence = claim.currentRevision.evidence.map((reference) => ({
      ...reference,
      source: { ...reference.source, sourceType: 'ai_output' as const },
    }))

    const error = captureApiError(() => assertClaimIsPublic(makeClaim({ evidence })))

    assert.equal(error.code, 'E_EVIDENCE_INSUFFICIENT')
  })
})
