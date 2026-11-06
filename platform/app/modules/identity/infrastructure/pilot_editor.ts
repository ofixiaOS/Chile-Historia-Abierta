import ApiError from '#shared/errors/api_error'
import env from '#start/env'
import { assertEditorialWritesAllowed } from '#shared/security/production_persistence_gate'
import { createHash, timingSafeEqual } from 'node:crypto'

export interface PilotEditor {
  readonly id: string
  readonly displayName: string
}

export interface PilotEditorConfiguration {
  readonly token?: string
  readonly id?: string
  readonly displayName?: string
  readonly appKey: string
}

const editorIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

export function authenticatePilotEditor(
  authorization: string | undefined,
  configuration: PilotEditorConfiguration
): PilotEditor {
  const { token, id, displayName, appKey } = configuration

  if (
    !token ||
    token.length < 32 ||
    token === appKey ||
    !id ||
    !editorIdPattern.test(id) ||
    !displayName ||
    displayName.trim().length < 2
  ) {
    throw new ApiError(
      'E_WRITE_DISABLED',
      'La escritura editorial no está configurada en este entorno',
      503
    )
  }

  const match = /^Bearer ([^\s]{32,256})$/i.exec(authorization ?? '')
  if (!match || !timingSafeEqual(digest(match[1]), digest(token))) {
    throw new ApiError('E_UNAUTHENTICATED', 'Credencial editorial ausente o inválida', 401)
  }

  return { id, displayName: displayName.trim() }
}

export function requirePilotEditor(authorization: string | undefined): PilotEditor {
  assertEditorialWritesAllowed(env.get('NODE_ENV'))

  return authenticatePilotEditor(authorization, {
    token: env.get('PILOT_EDITOR_TOKEN'),
    id: env.get('PILOT_EDITOR_ID'),
    displayName: env.get('PILOT_EDITOR_NAME'),
    appKey: env.get('APP_KEY').release(),
  })
}
