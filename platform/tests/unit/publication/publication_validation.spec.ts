import { validatePublicationRequirements } from '#modules/publication/domain/publication'
import { test } from '@japa/runner'

test.group('Publication Requirements Validation (Unit)', () => {
  const author = { id: 'usr-1', displayName: 'Investigador Histórico' }

  test('rejects publication with short title or content', ({ assert }) => {
    assert.throws(
      () =>
        validatePublicationRequirements({
          type: 'dato',
          author,
          title: 'Hi',
          content: 'Corto',
          evidence: [{ description: 'Fuente' }],
        }),
      /El título de la publicación debe tener al menos 5 caracteres/
    )
  })

  test('rejects "dato" publication without evidence or without explicit unit/period', ({
    assert,
  }) => {
    // Missing evidence
    assert.throws(
      () =>
        validatePublicationRequirements({
          type: 'dato',
          author,
          title: 'Registro de IPC histórico',
          content: 'El IPC mensual varió en el periodo observado según registros.',
          evidence: [],
          limitations: ['Unidad: Porcentaje', 'Periodo: 1980'],
        }),
      /Una publicación clasificada como "dato" exige al menos una fuente/
    )

    // Missing unit/period
    assert.throws(
      () =>
        validatePublicationRequirements({
          type: 'dato',
          author,
          title: 'Registro de IPC histórico',
          content: 'El IPC mensual varió en el periodo observado según registros.',
          evidence: [{ description: 'Boletín INE 1980' }],
          limitations: ['Sin mención'],
        }),
      /Una publicación clasificada como "dato" exige declarar unidad y período/
    )
  })

  test('accepts valid "dato" publication', ({ assert }) => {
    assert.doesNotThrow(() =>
      validatePublicationRequirements({
        type: 'dato',
        author,
        title: 'Tasa de Política Monetaria en diciembre 2021',
        content: 'El Banco Central fijó la tasa en 4.0% anual según acta oficial.',
        evidence: [{ description: 'BDE Banco Central', sourceId: 'bcentral-bde' }],
        limitations: ['Unidad: % anual', 'Periodo: 2021-12'],
      })
    )
  })

  test('rejects "interpretacion" publication with insufficient content reasoning or without evidence', ({
    assert,
  }) => {
    assert.throws(
      () =>
        validatePublicationRequirements({
          type: 'interpretacion',
          author,
          title: 'Interpretación de la crisis',
          content: 'Razonamiento breve.',
          evidence: [{ description: 'Claim previo' }],
        }),
      /razonamiento explícito detallado de al menos 20 caracteres/
    )
  })

  test('accepts valid "interpretacion" publication with cited evidence and extensive reasoning', ({
    assert,
  }) => {
    assert.doesNotThrow(() =>
      validatePublicationRequirements({
        type: 'interpretacion',
        author,
        title: 'Interpretación del ajuste monetario 2021',
        content:
          'El rápido incremento de la TPM durante el segundo semestre de 2021 respondió a las presiones inflacionarias derivadas de la expansión de liquidez.',
        evidence: [{ claimId: 'claim-tpm-001', description: 'Evolución de la TPM 2021' }],
        limitations: ['No evalúa efectos de segunda vuelta posteriores a 2022.'],
      })
    )
  })

  test('rejects "hipotesis" publication without explicit refutation criteria in limitations', ({
    assert,
  }) => {
    assert.throws(
      () =>
        validatePublicationRequirements({
          type: 'hipotesis',
          author,
          title: 'Hipótesis sobre el impacto arancelario',
          content: 'La reducción de aranceles aceleró el crecimiento industrial regional.',
          evidence: [],
          limitations: [],
        }),
      /registrar explícitamente en limitations el criterio falsable/
    )
  })

  test('accepts valid "hipotesis" publication with refutation criteria', ({ assert }) => {
    assert.doesNotThrow(() =>
      validatePublicationRequirements({
        type: 'hipotesis',
        author,
        title: 'Hipótesis sobre el impacto arancelario',
        content:
          'Proponemos que la apertura arancelaria redujo el margen industrial en los sectores textil y calzado.',
        evidence: [],
        limitations: [
          'Criterio de falsación: La hipótesis se refuta si la productividad total de factores creció en dichos subsectores durante el quinquenio.',
        ],
      })
    )
  })
})
