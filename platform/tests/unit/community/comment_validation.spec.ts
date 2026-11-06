import { validateCommentRequirements } from '#modules/community/domain/comment'
import { test } from '@japa/runner'

test.group('Comment Requirements Validation (Unit)', () => {
  test('rejects comment with empty publicationId or missing author', ({ assert }) => {
    assert.throws(
      () =>
        validateCommentRequirements({
          publicationId: '',
          author: { id: 'usr_1', displayName: 'Investigador' },
          commentType: 'comentario_general',
          content: 'Comentario de prueba válido en longitud.',
        }),
      /El comentario debe asociarse a una publicación válida/
    )

    assert.throws(
      () =>
        validateCommentRequirements({
          publicationId: 'pub_123',
          author: { id: '', displayName: '' },
          commentType: 'comentario_general',
          content: 'Comentario de prueba válido en longitud.',
        }),
      /El autor del comentario es obligatorio/
    )
  })

  test('rejects comment with fewer than 10 characters', ({ assert }) => {
    assert.throws(
      () =>
        validateCommentRequirements({
          publicationId: 'pub_123',
          author: { id: 'usr_1', displayName: 'Investigador' },
          commentType: 'comentario_general',
          content: 'Corto',
        }),
      /al menos 10 caracteres/
    )
  })

  test('rejects unknown commentType', ({ assert }) => {
    assert.throws(
      () =>
        validateCommentRequirements({
          publicationId: 'pub_123',
          author: { id: 'usr_1', displayName: 'Investigador' },
          commentType: 'tipo_invalido' as any,
          content: 'Comentario con tipo completamente desconocido.',
        }),
      /Tipo de comentario inválido/
    )
  })

  test('rejects aporte_evidencia comment without supporting evidence references', ({ assert }) => {
    assert.throws(
      () =>
        validateCommentRequirements({
          publicationId: 'pub_123',
          author: { id: 'usr_1', displayName: 'Investigador' },
          commentType: 'aporte_evidencia',
          content: 'Aporto una nueva fuente pero omito el campo de evidencia.',
          evidence: [],
        }),
      /al menos una referencia de evidencia/
    )
  })

  test('rejects discrepancia_metodologica comment with insufficient reasoning (< 25 chars)', ({
    assert,
  }) => {
    assert.throws(
      () =>
        validateCommentRequirements({
          publicationId: 'pub_123',
          author: { id: 'usr_1', displayName: 'Investigador' },
          commentType: 'discrepancia_metodologica',
          content: 'Está mal calculado.',
        }),
      /al menos 25 caracteres/
    )
  })

  test('accepts valid aporte_evidencia with localizable reference', ({ assert }) => {
    assert.doesNotThrow(() =>
      validateCommentRequirements({
        publicationId: 'pub_123',
        author: { id: 'usr_1', displayName: 'Investigador' },
        commentType: 'aporte_evidencia',
        content: 'Adjunto referencia a la minuta RPM de enero de 2023 con la decisión de tasa.',
        evidence: [
          {
            description: 'Minuta de la Reunión de Política Monetaria enero 2023',
            sourceId: 'src_bcentral_rpm',
          },
        ],
      })
    )
  })

  test('accepts valid discrepancia_metodologica with detailed argument', ({ assert }) => {
    assert.doesNotThrow(() =>
      validateCommentRequirements({
        publicationId: 'pub_123',
        author: { id: 'usr_2', displayName: 'Econometrista' },
        commentType: 'discrepancia_metodologica',
        content:
          'El índice base 100 seleccionado distorsiona la comparación al usar un año atípico de crisis.',
      })
    )
  })
})
