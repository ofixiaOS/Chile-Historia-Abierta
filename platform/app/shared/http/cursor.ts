import ApiError from '#shared/errors/api_error'

export interface CursorPayload {
  readonly publishedAt: string
  readonly id: string
}

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify({ p: payload.publishedAt, i: payload.id })
  return Buffer.from(json, 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string): CursorPayload {
  if (typeof cursor !== 'string' || cursor.trim().length === 0) {
    throw new ApiError('E_VALIDATION', 'Invalid pagination cursor', 422, { cursor })
  }

  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const parsed = JSON.parse(raw) as unknown

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('p' in parsed) ||
      !('i' in parsed) ||
      typeof (parsed as { p: unknown }).p !== 'string' ||
      typeof (parsed as { i: unknown }).i !== 'string'
    ) {
      throw new Error('Invalid cursor structure')
    }

    const { p: publishedAt, i: id } = parsed as { p: string; i: string }
    const date = new Date(publishedAt)

    if (Number.isNaN(date.getTime()) || id.trim().length === 0) {
      throw new Error('Invalid cursor values')
    }

    return {
      publishedAt: date.toISOString(),
      id: id.trim(),
    }
  } catch {
    throw new ApiError('E_VALIDATION', 'Invalid pagination cursor', 422, { cursor })
  }
}
