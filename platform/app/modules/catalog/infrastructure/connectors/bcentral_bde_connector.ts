import {
  computeSha256,
  validateHostSafety,
  type ExtractedClaimItem,
  type HttpTransport,
  type NormalizedSourceExtraction,
  type RawArtifact,
  type SourceConnector,
  type SourcePolicy,
} from '#modules/catalog/domain/source_connector'
import ApiError from '#shared/errors/api_error'
import { readFile } from 'node:fs/promises'
import env from '#start/env'
import { shouldSeedFixtures } from '#shared/fixtures/fixture_policy'

interface BcentralObservation {
  indexDateString?: string
  value?: string
  statusCode?: string
}

interface BcentralPayload {
  Codigo?: string
  Descripcion?: string
  Series?: {
    descripEsp?: string
    seriesId?: string
    frecuencia?: string
    unidad?: string
    obs?: BcentralObservation[]
  }
}

export default class BcentralBdeConnector implements SourceConnector {
  readonly policy: SourcePolicy = {
    sourceId: 'bcentral-bde',
    sourceName: 'Banco Central de Chile — Base de Datos Estadísticos (BDE)',
    responsibleAgent: 'Banco Central de Chile',
    sourceType: 'official_statistical',
    canonicalUrl: 'https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/documentacion.html',
    allowedHosts: ['si3.bcentral.cl'],
    maxBytes: 2 * 1024 * 1024,
    timeoutMs: 10000,
    softwareLicense: 'Términos y condiciones del sitio web del Banco Central de Chile',
    datasetLicense: 'Términos de uso de información estadística del Banco Central de Chile',
    itemRights: 'Derechos patrimoniales reservados del Banco Central de Chile',
    redistributionPolicy:
      'Consulta, reproducción, difusión, publicación y adaptación permitidas con atribución obligatoria',
    requiredAttribution: 'Banco Central de Chile — Base de Datos Estadísticos (si3.bcentral.cl)',
  }

  async fetch(targetUrl: string, transport?: HttpTransport): Promise<RawArtifact> {
    validateHostSafety(targetUrl, this.policy.allowedHosts)

    let content: string
    let mimeType = 'application/json'

    if (transport) {
      const res = await transport.get(targetUrl, {
        timeoutMs: this.policy.timeoutMs,
        maxBytes: this.policy.maxBytes,
      })
      content = res.content
      mimeType = res.mimeType
    } else {
      if (!shouldSeedFixtures(env.get('NODE_ENV'))) {
        throw new ApiError(
          'E_SOURCE_TRANSPORT_REQUIRED',
          'A real source transport is required outside tests',
          503
        )
      }
      // Tests only: this golden file is synthetic and never a live provider response.
      const fixtureUrl = new URL('../fixtures/bcentral_tpm_sample.json', import.meta.url)
      content = await readFile(fixtureUrl, 'utf8')
    }

    if (Buffer.byteLength(content, 'utf8') > this.policy.maxBytes) {
      throw new ApiError(
        'E_VALIDATION',
        `Payload size exceeds maximum allowed of ${this.policy.maxBytes} bytes`,
        413
      )
    }

    const contentHash = computeSha256(content)
    const retrievedAt = new Date().toISOString()

    return {
      sourceUrl: targetUrl,
      mimeType,
      content,
      contentHash,
      retrievedAt,
    }
  }

  normalize(raw: RawArtifact): NormalizedSourceExtraction {
    let parsed: BcentralPayload
    try {
      parsed = JSON.parse(raw.content) as BcentralPayload
    } catch {
      throw new ApiError('E_VALIDATION', 'Corrupt JSON payload from BCentral BDE', 422)
    }

    if (!parsed.Series || !Array.isArray(parsed.Series.obs)) {
      throw new ApiError(
        'E_VALIDATION',
        'Schema drift: missing Series or observations in BCentral payload',
        422
      )
    }

    const seriesDesc = parsed.Series.descripEsp ?? 'Serie estadística'
    const seriesId = parsed.Series.seriesId ?? 'UNKNOWN_SERIES'
    const claims: ExtractedClaimItem[] = []

    for (const obs of parsed.Series.obs) {
      if (!obs.indexDateString || obs.value === undefined) {
        continue
      }

      claims.push({
        statement: `En fecha ${obs.indexDateString}, la ${seriesDesc} (${seriesId}) fue fijada en ${obs.value}% (${obs.statusCode ?? 'Definitivo'}).`,
        evidenceStatus: 'documented',
        linkType: 'supports',
        locator: {
          type: 'row',
          value: `seriesId=${seriesId}&indexDateString=${obs.indexDateString}`,
        },
        transformationMethod:
          'Normalización directa desde API BCentral BDE sin deflación ni imputación',
        limitations: [
          'Cifra oficial provista por el Banco Central de Chile sujeta a política de revisión estadística.',
        ],
      })
    }

    return {
      sourceId: this.policy.sourceId,
      datasetOrCollection: `${seriesDesc} (${seriesId})`,
      extractedAt: new Date().toISOString(),
      claims,
    }
  }
}
