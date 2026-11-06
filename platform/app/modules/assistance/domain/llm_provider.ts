import type { AssistanceQuery } from '#modules/assistance/domain/assistance'
import type { EvidenceChunk } from '#modules/assistance/domain/chunk'

export interface LlmAssistancePrompt {
  readonly query: AssistanceQuery
  readonly evidenceChunks: readonly EvidenceChunk[]
  readonly systemInstructions: string
}

export interface LlmClaimedCitation {
  readonly chunkId: string
  readonly locatorValue: string
  readonly quoteExcerpt: string
}

export interface LlmRawOutput {
  readonly rawAnswer: string
  readonly claimedCitations: readonly LlmClaimedCitation[]
  readonly tokensEstimated: number
  readonly modelId: string
}

export interface LlmProvider {
  generateAssistedResponse(prompt: LlmAssistancePrompt): Promise<LlmRawOutput>
}
