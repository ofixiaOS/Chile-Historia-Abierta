import type { EvidenceLinkType, EvidenceStatus, SourceType } from '#modules/evidence/domain/claim'
import ApiError from '#shared/errors/api_error'
import { createHash } from 'node:crypto'

export interface SourcePolicy {
  readonly sourceId: string
  readonly sourceName: string
  readonly responsibleAgent: string
  readonly sourceType: SourceType
  readonly canonicalUrl: string
  readonly allowedHosts: readonly string[]
  readonly maxBytes: number
  readonly timeoutMs: number
  readonly softwareLicense: string
  readonly datasetLicense: string
  readonly itemRights: string
  readonly redistributionPolicy: string
  readonly requiredAttribution: string
}

export interface RawArtifact {
  readonly sourceUrl: string
  readonly mimeType: string
  readonly content: string
  readonly contentHash: string
  readonly retrievedAt: string
}

export interface ExtractedClaimItem {
  readonly statement: string
  readonly evidenceStatus: EvidenceStatus
  readonly linkType: EvidenceLinkType
  readonly locator: {
    readonly type: 'page' | 'table' | 'row' | 'selector' | 'fragment' | 'timecode'
    readonly value: string
  }
  readonly transformationMethod: string
  readonly limitations: readonly string[]
}

export interface NormalizedSourceExtraction {
  readonly sourceId: string
  readonly datasetOrCollection: string
  readonly extractedAt: string
  readonly claims: readonly ExtractedClaimItem[]
}

export interface HttpTransport {
  get(
    url: string,
    options: { readonly timeoutMs: number; readonly maxBytes: number }
  ): Promise<{
    readonly content: string
    readonly mimeType: string
  }>
}

export interface SourceConnector {
  readonly policy: SourcePolicy
  fetch(targetUrl: string, transport?: HttpTransport): Promise<RawArtifact>
  normalize(raw: RawArtifact): NormalizedSourceExtraction
}

export function computeSha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

export function validateHostSafety(targetUrl: string, allowedHosts: readonly string[]): URL {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
  } catch {
    throw new ApiError('E_VALIDATION', 'Invalid target URL', 422, { field: 'targetUrl' })
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new ApiError('E_VALIDATION', 'Only HTTPS protocol is permitted', 422, {
      protocol: parsedUrl.protocol,
    })
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new ApiError('E_VALIDATION', 'Credentials embedded in source URLs are not permitted', 422)
  }

  if (parsedUrl.port) {
    throw new ApiError('E_VALIDATION', 'Custom ports are not permitted for source URLs', 422)
  }

  const hostname = parsedUrl.hostname.toLowerCase()
  const isAllowed = allowedHosts.some((allowed) => hostname === allowed.toLowerCase())

  if (!isAllowed) {
    throw new ApiError(
      'E_VALIDATION',
      `SSRF Defense: Host "${hostname}" is not in the connector allowlist`,
      403,
      {
        hostname,
        allowedHosts,
      }
    )
  }

  return parsedUrl
}
