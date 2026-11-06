import ApiError from '#shared/errors/api_error'

export interface PlaceCursorPosition {
  readonly fromYear: number
  readonly id: string
}

const MAX_CURSOR_LENGTH = 4096

export function encodePlaceCursor(position: PlaceCursorPosition): string {
  return Buffer.from(JSON.stringify({ y: position.fromYear, i: position.id }), 'utf8').toString(
    'base64url'
  )
}

export function decodePlaceCursor(cursor: string): PlaceCursorPosition {
  if (
    cursor.length === 0 ||
    cursor.length > MAX_CURSOR_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(cursor)
  ) {
    throw invalidCursor()
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (typeof parsed !== 'object' || parsed === null) throw invalidCursor()

    const value = parsed as Record<string, unknown>
    if (
      typeof value.y !== 'number' ||
      !Number.isSafeInteger(value.y) ||
      typeof value.i !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value.i)
    ) {
      throw invalidCursor()
    }

    return { fromYear: value.y as number, id: value.i }
  } catch {
    throw invalidCursor()
  }
}

function invalidCursor(): ApiError {
  return new ApiError('E_VALIDATION', 'Invalid pagination cursor', 422, { field: 'cursor' })
}
