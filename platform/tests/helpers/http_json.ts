export interface JsonHttpResponse {
  text(): string
}

/** Decode the JSON actually sent over HTTP when the framework's inferred route type is incomplete. */
export function readJsonBody<T>(response: JsonHttpResponse): T {
  const parsed: unknown = JSON.parse(response.text())
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('Expected an HTTP JSON object response')
  }
  return parsed as T
}

export interface ApiErrorResponse {
  readonly error: {
    readonly code: string
    readonly message: string
    readonly status: number
  }
}
