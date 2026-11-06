import type { Citation } from '#modules/assistance/domain/assistance'
import type { EvidenceChunk } from '#modules/assistance/domain/chunk'
import type { LlmClaimedCitation } from '#modules/assistance/domain/llm_provider'

export interface CitationVerificationResult {
  readonly isValid: boolean
  readonly reason?: string
  readonly verifiedCitations: readonly Citation[]
}

export class CitationVerifier {
  /** Checks literal presence in retrieved text, not authenticity or semantic support. */
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
      if (claim.locatorValue !== chunk.locator.value) {
        return {
          isValid: false,
          reason: `Locator mismatch for chunk ${chunk.id}: claimed "${claim.locatorValue}", actual "${chunk.locator.value}"`,
          verifiedCitations: [],
        }
      }

      // Verificación de quoteExcerpt
      const quote = claim.quoteExcerpt
      if (quote.trim().length < 5) {
        return {
          isValid: false,
          reason: `Quote excerpt for chunk ${chunk.id} is too short or empty`,
          verifiedCitations: [],
        }
      }

      if (!chunk.text.includes(quote)) {
        return {
          isValid: false,
          reason: `Quote excerpt "${quote}" is not present in the retrieved content of chunk ${chunk.id}`,
          verifiedCitations: [],
        }
      }

      verifiedList.push({
        chunkId: chunk.id,
        sourceId: chunk.sourceId,
        sourceName: chunk.sourceName,
        locator: chunk.locator,
        quoteExcerpt: quote,
      })
    }

    return {
      isValid: true,
      verifiedCitations: verifiedList,
    }
  }
}
