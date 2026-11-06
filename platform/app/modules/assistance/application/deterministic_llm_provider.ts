import type {
  LlmProvider,
  LlmAssistancePrompt,
  LlmRawOutput,
  LlmClaimedCitation,
} from '#modules/assistance/domain/llm_provider'

export interface DeterministicLlmOptions {
  readonly simulateHallucinatedChunkId?: boolean
  readonly simulateHallucinatedQuote?: boolean
  readonly simulateLocatorMismatch?: boolean
  readonly simulateOmitCitations?: boolean
}

export class DeterministicLlmProvider implements LlmProvider {
  constructor(private readonly options: DeterministicLlmOptions = {}) {}

  public async generateAssistedResponse(prompt: LlmAssistancePrompt): Promise<LlmRawOutput> {
    const { evidenceChunks, query } = prompt

    if (evidenceChunks.length === 0 || this.options.simulateOmitCitations) {
      return {
        rawAnswer: `No se encontró evidencia suficiente para responder sobre: "${query.queryText}".`,
        claimedCitations: [],
        tokensEstimated: 45,
        modelId: 'cha-deterministic-v1',
      }
    }

    const claimedCitations: LlmClaimedCitation[] = []

    for (const chunk of evidenceChunks) {
      let chunkId = chunk.id
      let locatorValue = chunk.locator.value
      // Tomamos un fragmento de al menos 10 palabras o el texto completo
      const words = chunk.text.split(/\s+/)
      let quoteExcerpt = words.slice(0, Math.min(12, words.length)).join(' ')

      if (this.options.simulateHallucinatedChunkId) {
        chunkId = 'non-existent-chunk-9999'
      }

      if (this.options.simulateLocatorMismatch) {
        locatorValue = 'página alucinada 999'
      }

      if (this.options.simulateHallucinatedQuote) {
        quoteExcerpt = 'Este texto jamás existió en el documento histórico ni en la fuente canónica'
      }

      claimedCitations.push({
        chunkId,
        locatorValue,
        quoteExcerpt,
      })
    }

    const synthesis = evidenceChunks
      .map(
        (c) =>
          `Según ${c.sourceName} (${c.locator.type} ${c.locator.value}): "${c.text.slice(0, 100)}..."`
      )
      .join(' ')

    return {
      rawAnswer: `Síntesis asistida sobre "${query.queryText}": ${synthesis}`,
      claimedCitations,
      tokensEstimated: 120 + evidenceChunks.length * 50,
      modelId: 'cha-deterministic-v1',
    }
  }
}
