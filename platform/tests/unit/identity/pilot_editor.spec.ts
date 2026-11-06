import {
  authenticatePilotEditor,
  type PilotEditorConfiguration,
} from '#modules/identity/infrastructure/pilot_editor'
import { test } from '@japa/runner'

test.group('Pilot editorial identity', () => {
  const configuration: PilotEditorConfiguration = {
    token: 'test_pilot_editor_token_0123456789abcdef0123456789abcdef',
    id: 'editor-test',
    displayName: 'Editor de prueba',
    appKey: 'app-key-distinct-from-editor-token',
  }

  test('fails closed when editor configuration is absent, weak or reuses APP_KEY', ({ assert }) => {
    assert.throws(
      () => authenticatePilotEditor(undefined, { appKey: 'app-key' }),
      /escritura editorial no está configurada/
    )
    assert.throws(
      () =>
        authenticatePilotEditor(undefined, {
          ...configuration,
          token: 'short',
        }),
      /escritura editorial no está configurada/
    )
    assert.throws(
      () =>
        authenticatePilotEditor(undefined, {
          ...configuration,
          appKey: configuration.token!,
        }),
      /escritura editorial no está configurada/
    )
  })

  test('rejects absent and incorrect credentials', ({ assert }) => {
    assert.throws(
      () => authenticatePilotEditor(undefined, configuration),
      /Credencial editorial ausente o inválida/
    )
    assert.throws(
      () =>
        authenticatePilotEditor(
          'Bearer incorrect_incorrect_incorrect_incorrect_incorrect',
          configuration
        ),
      /Credencial editorial ausente o inválida/
    )
  })

  test('returns only the server configured editor identity', ({ assert }) => {
    const actor = authenticatePilotEditor(`Bearer ${configuration.token}`, configuration)
    assert.deepEqual(actor, { id: 'editor-test', displayName: 'Editor de prueba' })
  })
})
