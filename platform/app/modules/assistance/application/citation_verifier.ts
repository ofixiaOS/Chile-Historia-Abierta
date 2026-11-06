import type { Citation } from '#modules/assistance/domain/assistance'
import type { EvidenceChunk } from '#modules/assistance/domain/chunk'
import type { LlmClaimedCitation } from '#modules/assistance/domain/llm_provider'

export interface CitationVerificationResult {
  readonly isValid: boolean
  readonly reason?: string
  readonly verifiedCitations: readonly Citation[]
}

function normalizeTextForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remueve tildes para robustez
    .replace(/[^\w\s]/g, ' ') // Puntuación a espacios
    .replace(/\s+/g, ' ')
    .trim()
}

export class CitationVerifier {
  /**
   * Verifica deterministamente cada cita contra el conjunto de chunks canónicos disponibles.
   * Si alguna cita es falsa, incompleta o alucinada, la verificación falla cerrada.
   */
  public verify(
    claimedCitations: readonly LlmClaimedCitation[],
    availableChunks: readonly EvidenceChunk[]
  ): CitationVerificationResult {
    if (claimedCitations.length === 0) {
      return {
        isValid: false,
        reason: 'No citations provided for factual synthesis',
        verifiedCitations: [],
      }
    }

    const chunkMap = new Map<string, EvidenceChunk>()
    for (const chunk of availableChunks) {
      chunkMap.set(chunk.id, chunk)
    }

    const verifiedList: Citation[] = []

    for (const claim of claimedCitations) {
      const chunk = chunkMap.get(claim.chunkId)
      if (!chunk) {
        return {
          isValid: false,
          reason: `Cited chunk ${claim.chunkId} does not exist in the retrieved evidence set`,
          verifiedCitations: [],
        }
      }

      // Verificación de locator
      if (claim.locatorValue.trim() !== chunk.locator.value.trim()) {
        return {
          isValid: false,
          reason: `Locator mismatch for chunk ${chunk.id}: claimed "${claim.locatorValue}", actual "${chunk.locator.value}"`,
          verifiedCitations: [],
        }
      }

      // Verificación de quoteExcerpt
      const quoteTrimmed = claim.quoteExcerpt.trim()
      if (quoteTrimmed.length < 5) {
        return {
          isValid: false,
          reason: `Quote excerpt for chunk ${chunk.id} is too short or empty`,
          verifiedCitations: [],
        }
      }

      const normalizedQuote = normalizeTextForComparison(quoteTrimmed)
      const normalizedChunkText = normalizeTextForComparison(chunk.text)

      if (!normalizedChunkText.includes(normalizedQuote)) {
        return {
          isValid: false,
          reason: `Quote excerpt "${quoteTrimmed}" is not present in the authentic content of chunk ${chunk.id}`,
          verifiedCitations: [],
        }
      }

      verifiedList.push({
        chunkId: chunk.id,
        sourceId: chunk.sourceId,
        sourceName: chunk.sourceName,
        locator: chunk.locator,
        quoteExcerpt: quoteTrimmed,
      })
    }

    return {
      isValid: true,
      verifiedCitations: verifiedList,
    }
  }
}
