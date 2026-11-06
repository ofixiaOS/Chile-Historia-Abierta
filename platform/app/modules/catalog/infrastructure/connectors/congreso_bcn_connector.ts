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

interface CongresoNormaPayload {
  norma?: {
    idNorma?: string
    tipoNorma?: string
    numero?: string
    titulo?: string
    fechaPromulgacion?: string
    fechaPublicacion?: string
    organismos?: Array<{ nombre?: string }>
    resumen?: string
  }
}

export default class CongresoBcnConnector implements SourceConnector {
  readonly policy: SourcePolicy = {
    sourceId: 'congreso-bcn',
    sourceName: 'Datos Abiertos del Congreso Nacional / Biblioteca del Congreso Nacional (BCN)',
    responsibleAgent: 'Congreso Nacional de Chile',
    sourceType: 'official_administrative',
    canonicalUrl: 'https://opendata.congreso.cl/',
    allowedHosts: ['opendata.congreso.cl'],
    maxBytes: 5 * 1024 * 1024,
    timeoutMs: 10000,
    softwareLicense: 'Permisiva / Código abierto estatal',
    datasetLicense:
      'Términos de Datos Abiertos del Congreso Nacional (Uso libre sin restricciones)',
    itemRights: 'Dominio público de los textos legislativos del Estado de Chile',
    redistributionPolicy: 'Libre redistribución con cita de procedencia',
    requiredAttribution:
      'Congreso Nacional de Chile / Biblioteca del Congreso Nacional (opendata.congreso.cl)',
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
      const fixtureUrl = new URL('../fixtures/congreso_ley_sample.json', import.meta.url)
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
    let parsed: CongresoNormaPayload
    try {
      parsed = JSON.parse(raw.content) as CongresoNormaPayload
    } catch {
      throw new ApiError('E_VALIDATION', 'Corrupt JSON payload from Congreso BCN', 422)
    }

    const norma = parsed.norma
    if (!norma || !norma.idNorma || !norma.titulo) {
      throw new ApiError(
        'E_VALIDATION',
        'Schema drift: missing norma, idNorma or titulo in Congreso payload',
        422
      )
    }

    const tipo = norma.tipoNorma ?? 'Norma'
    const numero = norma.numero ? ` N° ${norma.numero}` : ''
    const organismo = norma.organismos?.[0]?.nombre ?? 'Estado de Chile'
    const claims: ExtractedClaimItem[] = []

    claims.push({
      statement: `Promulgación de ${tipo}${numero}: "${norma.titulo}", promulgada el ${norma.fechaPromulgacion ?? 'fecha no registrada'} por ${organismo} y publicada el ${norma.fechaPublicacion ?? 'no registrada'}.`,
      evidenceStatus: 'documented',
      linkType: 'supports',
      locator: {
        type: 'fragment',
        value: `idNorma=${norma.idNorma}`,
      },
      transformationMethod: 'Extracción de metadatos normativos desde OpenData Congreso',
      limitations: [
        'Texto normativo oficial de la República de Chile; consultar texto refundido para reformas posteriores.',
      ],
    })

    if (norma.resumen && norma.resumen.trim().length > 0) {
      claims.push({
        statement: `Resumen oficial de ${tipo}${numero}: "${norma.resumen.trim()}"`,
        evidenceStatus: 'documented',
        linkType: 'supports',
        locator: {
          type: 'fragment',
          value: `idNorma=${norma.idNorma}&campo=resumen`,
        },
        transformationMethod: 'Resumen institucional provisto por BCN',
        limitations: [
          'Resumen curatorial y analítico preparado por la Biblioteca del Congreso Nacional.',
        ],
      })
    }

    return {
      sourceId: this.policy.sourceId,
      datasetOrCollection: `Normativa Chilena: ${tipo}${numero}`,
      extractedAt: new Date().toISOString(),
      claims,
    }
  }
}
