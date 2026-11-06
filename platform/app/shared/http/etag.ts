import { createHash } from 'node:crypto'

export function createStrongEtag(version: string): string {
  const digest = createHash('sha256').update(version).digest('base64url')
  return `"${digest}"`
}

export function requestMatchesEtag(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) {
    return false
  }

  return ifNoneMatch
    .split(',')
    .map((candidate) => candidate.trim())
    .some((candidate) => candidate === '*' || candidate === etag || candidate === `W/${etag}`)
}
