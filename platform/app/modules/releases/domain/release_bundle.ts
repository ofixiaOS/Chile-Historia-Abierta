import {
  evidenceStatuses,
  sourceTypes,
  type EvidenceStatus,
  type SourceType,
} from '#modules/evidence/domain/claim'
import { createHash } from 'node:crypto'
import { TextDecoder } from 'node:util'

export const MAX_SOURCE_BYTES = 1024 * 1024
export const MAX_BUNDLE_BYTES = 2 * 1024 * 1024

export interface ReleaseDraft {
  readonly dataVersion: string
  readonly createdAt: string
  readonly source: {
    readonly sourceId: string
    readonly scopeIdentifier: string
    readonly sourceType: SourceType
    readonly sourceName: string
    readonly responsibleAgent: string
    readonly sourceUrl: string
    readonly publishedAt: string | null
  }
  readonly artifact: {
    readonly retrievedAt: string
    readonly softwareLicense: string
    readonly datasetLicense: string
    readonly itemRights: string
    readonly redistributionPolicy: 'public_with_attribution' | 'public_domain'
    readonly requiredAttribution: string
  }
  readonly claim: {
    readonly statement: string
    readonly evidenceStatus: EvidenceStatus
    readonly quoteExcerpt: string
    readonly locator: { readonly type: 'fragment'; readonly value: string }
    readonly transformationMethod: string
    readonly limitations: readonly string[]
  }
}

export interface ReleaseManifest extends Omit<ReleaseDraft, 'artifact'> {
  readonly formatVersion: 1
  readonly artifact: ReleaseDraft['artifact'] & { readonly contentHash: string }
}

export interface ReleaseBundle {
  readonly manifest: ReleaseManifest
  readonly rawBase64: string
  readonly bundleHash: string
}

export class ReleaseValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReleaseValidationError'
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ReleaseValidationError(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function nonEmpty(value: unknown, label: string, max = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    throw new ReleaseValidationError(`${label} must be non-empty and at most ${max} characters`)
  }
  return value.trim()
}

function isoDate(value: unknown, label: string): string {
  const text = nonEmpty(value, label, 40)
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(text) ||
    Number.isNaN(Date.parse(text))
  ) {
    throw new ReleaseValidationError(`${label} must be an ISO UTC timestamp`)
  }
  return text
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function parseReleaseDraft(value: unknown): ReleaseDraft {
  const input = record(value, 'draft')
  const source = record(input.source, 'source')
  const artifact = record(input.artifact, 'artifact')
  const claim = record(input.claim, 'claim')
  const locator = record(claim.locator, 'claim.locator')
  const dataVersion = nonEmpty(input.dataVersion, 'dataVersion', 80)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/.test(dataVersion)) {
    throw new ReleaseValidationError('dataVersion has invalid characters')
  }
  const sourceType = nonEmpty(source.sourceType, 'source.sourceType') as SourceType
  if (
    !sourceTypes.includes(sourceType) ||
    sourceType === 'ai_output' ||
    sourceType === 'community_post'
  ) {
    throw new ReleaseValidationError('source.sourceType is not eligible for this release flow')
  }
  const sourceId = nonEmpty(source.sourceId, 'source.sourceId', 80)
  if (!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(sourceId)) {
    throw new ReleaseValidationError('source.sourceId has invalid characters')
  }
  const sourceUrl = nonEmpty(source.sourceUrl, 'source.sourceUrl', 2048)
  let parsedUrl: URL
  try {
    parsedUrl = new URL(sourceUrl)
  } catch {
    throw new ReleaseValidationError('source.sourceUrl is invalid')
  }
  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.username ||
    parsedUrl.password ||
    !parsedUrl.hostname.includes('.')
  ) {
    throw new ReleaseValidationError(
      'source.sourceUrl must be a public HTTPS URL without credentials'
    )
  }
  const redistributionPolicy = nonEmpty(
    artifact.redistributionPolicy,
    'artifact.redistributionPolicy'
  )
  if (
    redistributionPolicy !== 'public_with_attribution' &&
    redistributionPolicy !== 'public_domain'
  ) {
    throw new ReleaseValidationError(
      'artifact.redistributionPolicy does not permit this public release'
    )
  }
  const evidenceStatus = nonEmpty(claim.evidenceStatus, 'claim.evidenceStatus') as EvidenceStatus
  if (!evidenceStatuses.includes(evidenceStatus) || evidenceStatus === 'forecast') {
    throw new ReleaseValidationError('claim.evidenceStatus is invalid for a text release')
  }
  if (locator.type !== 'fragment') {
    throw new ReleaseValidationError('claim.locator.type must be fragment')
  }
  if (!Array.isArray(claim.limitations) || claim.limitations.length > 20) {
    throw new ReleaseValidationError('claim.limitations must be an array of at most 20 strings')
  }
  return {
    dataVersion,
    createdAt: isoDate(input.createdAt, 'createdAt'),
    source: {
      sourceId,
      scopeIdentifier: nonEmpty(source.scopeIdentifier, 'source.scopeIdentifier', 256),
      sourceType,
      sourceName: nonEmpty(source.sourceName, 'source.sourceName'),
      responsibleAgent: nonEmpty(source.responsibleAgent, 'source.responsibleAgent'),
      sourceUrl,
      publishedAt:
        source.publishedAt === null ? null : isoDate(source.publishedAt, 'source.publishedAt'),
    },
    artifact: {
      retrievedAt: isoDate(artifact.retrievedAt, 'artifact.retrievedAt'),
      softwareLicense: nonEmpty(artifact.softwareLicense, 'artifact.softwareLicense'),
      datasetLicense: nonEmpty(artifact.datasetLicense, 'artifact.datasetLicense'),
      itemRights: nonEmpty(artifact.itemRights, 'artifact.itemRights'),
      redistributionPolicy,
      requiredAttribution: nonEmpty(artifact.requiredAttribution, 'artifact.requiredAttribution'),
    },
    claim: {
      statement: nonEmpty(claim.statement, 'claim.statement', 5000),
      evidenceStatus,
      quoteExcerpt: nonEmpty(claim.quoteExcerpt, 'claim.quoteExcerpt', 500),
      locator: { type: 'fragment', value: nonEmpty(locator.value, 'claim.locator.value') },
      transformationMethod: nonEmpty(
        claim.transformationMethod,
        'claim.transformationMethod',
        1000
      ),
      limitations: claim.limitations.map((item, index) =>
        nonEmpty(item, `claim.limitations[${index}]`, 1000)
      ),
    },
  }
}

function validateRaw(raw: Buffer, quoteExcerpt: string): void {
  if (raw.length === 0 || raw.length > MAX_SOURCE_BYTES) {
    throw new ReleaseValidationError(`raw source must be 1-${MAX_SOURCE_BYTES} bytes`)
  }
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(raw)
  } catch {
    throw new ReleaseValidationError('raw source is not valid UTF-8')
  }
  if (text.includes('\0') || !text.includes(quoteExcerpt)) {
    throw new ReleaseValidationError('quoteExcerpt must occur literally in the raw source')
  }
}

function bundleDigest(manifest: ReleaseManifest, rawBase64: string): string {
  return sha256(stableJson({ manifest, rawBase64 }))
}

export function createReleaseBundle(draftValue: unknown, raw: Buffer): ReleaseBundle {
  const draft = parseReleaseDraft(draftValue)
  validateRaw(raw, draft.claim.quoteExcerpt)
  const manifest: ReleaseManifest = {
    formatVersion: 1,
    ...draft,
    artifact: { ...draft.artifact, contentHash: sha256(raw) },
  }
  const rawBase64 = raw.toString('base64')
  return { manifest, rawBase64, bundleHash: bundleDigest(manifest, rawBase64) }
}

export function validateReleaseBundle(value: unknown): { bundle: ReleaseBundle; raw: Buffer } {
  const envelope = record(value, 'bundle')
  const manifestInput = record(envelope.manifest, 'manifest')
  if (manifestInput.formatVersion !== 1) {
    throw new ReleaseValidationError('unsupported release formatVersion')
  }
  const artifactInput = record(manifestInput.artifact, 'manifest.artifact')
  const draft = parseReleaseDraft(manifestInput)
  const contentHash = nonEmpty(artifactInput.contentHash, 'artifact.contentHash', 64)
  if (!/^[a-f0-9]{64}$/.test(contentHash)) {
    throw new ReleaseValidationError('artifact.contentHash is not SHA-256')
  }
  const rawBase64 = nonEmpty(
    envelope.rawBase64,
    'rawBase64',
    Math.ceil((MAX_SOURCE_BYTES * 4) / 3) + 8
  )
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(rawBase64)) {
    throw new ReleaseValidationError('rawBase64 is invalid')
  }
  const raw = Buffer.from(rawBase64, 'base64')
  validateRaw(raw, draft.claim.quoteExcerpt)
  if (raw.toString('base64') !== rawBase64 || sha256(raw) !== contentHash) {
    throw new ReleaseValidationError('raw source hash mismatch')
  }
  const manifest: ReleaseManifest = {
    formatVersion: 1,
    ...draft,
    artifact: { ...draft.artifact, contentHash },
  }
  const bundleHash = nonEmpty(envelope.bundleHash, 'bundleHash', 64)
  if (bundleHash !== bundleDigest(manifest, rawBase64)) {
    throw new ReleaseValidationError('release bundle hash mismatch')
  }
  return { bundle: { manifest, rawBase64, bundleHash }, raw }
}
