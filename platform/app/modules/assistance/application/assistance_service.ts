import type {
  AssistanceQuery,
  AssistanceResponse,
  DisagreementRecord,
} from '#modules/assistance/domain/assistance'
import type { EvidenceChunk } from '#modules/assistance/domain/chunk'
import type { LlmProvider } from '#modules/assistance/domain/llm_provider'
import { PromptSanitizer } from '#modules/assistance/application/prompt_sanitizer'
import { CitationVerifier } from '#modules/assistance/application/citation_verifier'

const spanishStopwords: ReadonlySet<string> = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'al',
  'a',
  'en',
  'para',
  'por',
  'con',
  'sin',
  'sobre',
  'y',
  'e',
  'o',
  'u',
  'que',
  'como',
  'cual',
  'cuál',
  'cuales',
  'cuáles',
  'este',
  'esta',
  'estos',
  'estas',
  'ese',
  'esa',
  'esos',
  'esas',
  'su',
  'sus',
  'mi',
  'mis',
  'tu',
  'tus',
  'es',
  'son',
  'fue',
  'fueron',
  'era',
  'eran',
  'hay',
  'hubo',
  'quien',
  'quién',
])

export interface ChunkRetriever {
  retrieveChunks(query: AssistanceQuery): Promise<readonly EvidenceChunk[]>
}

export class InMemoryChunkRetriever implements ChunkRetriever {
  private readonly chunks: EvidenceChunk[] = []

  constructor(initialChunks: readonly EvidenceChunk[] = []) {
    this.chunks = [...initialChunks]
  }

  public addChunk(chunk: EvidenceChunk): void {
    this.chunks.push(chunk)
  }

  public async retrieveChunks(query: AssistanceQuery): Promise<readonly EvidenceChunk[]> {
    const rawTerms = query.queryText
      .toLowerCase()
      .replace(/[^\w\sáéíóúüñ]/gi, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)

    const informativeTerms = rawTerms.filter((t) => !spanishStopwords.has(t))

    if (informativeTerms.length === 0) {
      return []
    }

    const scored = this.chunks
      .map((chunk) => {
        const lowerText = chunk.text.toLowerCase()
        const lowerSource = chunk.sourceName.toLowerCase()

        // Filtros opcionales por fuentes
        if (query.sourceFilters && query.sourceFilters.length > 0) {
          if (!query.sourceFilters.includes(chunk.sourceId)) {
            return { chunk, score: 0 }
          }
        }

        let score = 0
        for (const term of informativeTerms) {
          if (lowerText.includes(term)) {
            score += 2
          }
          if (lowerSource.includes(term)) {
            score += 1
          }
        }

        return { chunk, score }
      })
      .filter(({ score }) => score >= 2)
      .sort((a, b) => b.score - a.score)

    // Si el mejor resultado tiene buen puntaje, no arrastrar resultados con puntajes muy inferiores
    if (scored.length === 0) {
      return []
    }

    const topScore = scored[0].score
    // Tomar sólo los chunks que tengan al menos el 60% del puntaje del mejor resultado
    return scored
      .filter(({ score }) => score >= Math.max(2, topScore * 0.6))
      .slice(0, 3)
      .map(({ chunk }) => chunk)
  }
}

export interface AssistanceServiceDependencies {
  readonly llmProvider: LlmProvider
  readonly chunkRetriever: ChunkRetriever
  readonly promptSanitizer?: PromptSanitizer
  readonly citationVerifier?: CitationVerifier
}

export class AssistanceService {
  private readonly llmProvider: LlmProvider
  private readonly chunkRetriever: ChunkRetriever
  private readonly promptSanitizer: PromptSanitizer
  private readonly citationVerifier: CitationVerifier

  constructor(dependencies: AssistanceServiceDependencies) {
    this.llmProvider = dependencies.llmProvider
    this.chunkRetriever = dependencies.chunkRetriever
    this.promptSanitizer = dependencies.promptSanitizer ?? new PromptSanitizer()
    this.citationVerifier = dependencies.citationVerifier ?? new CitationVerifier()
  }

  public async query(query: AssistanceQuery): Promise<AssistanceResponse> {
    const startTime = performance.now()

    // 1. Sanitización de Prompt (Defensa contra Prompt Injection - Principio 9)
    const sanitization = this.promptSanitizer.sanitize(query.queryText)
    if (!sanitization.isSafe) {
      const elapsed = Math.round(performance.now() - startTime)
      return {
        answer: `La consulta fue rechazada por contener patrones no permitidos: ${sanitization.reason}`,
        evidenceStatus: 'not_verified',
        citations: [],
        disagreements: [],
        abstained: true,
        abstentionReason: 'POTENTIAL_INJECTION_DETECTED',
        metrics: {
          latencyMs: elapsed,
          tokensEstimated: 0,
          modelId: 'prompt-sanitizer-v1',
        },
      }
    }

    const sanitizedQuery: AssistanceQuery = {
      ...query,
      queryText: sanitization.sanitizedText,
    }

    // 2. Recuperación de Chunks de Evidencia
    const candidateChunks = await this.chunkRetriever.retrieveChunks(sanitizedQuery)

    // Si no hay evidencia suficiente en el corpus canónico -> Abstención (ADR 0002)
    if (candidateChunks.length === 0) {
      const elapsed = Math.round(performance.now() - startTime)
      return {
        answer:
          'NO VERIFICADO: No existe evidencia documental ni estadística en el corpus local para responder a la consulta.',
        evidenceStatus: 'not_verified',
        citations: [],
        disagreements: [],
        abstained: true,
        abstentionReason: 'EVIDENCE_INSUFFICIENT',
        metrics: {
          latencyMs: elapsed,
          tokensEstimated: 15,
          modelId: 'abstention-gate-v1',
        },
      }
    }

    // 3. Detección de Desacuerdos Epistemológicos
    const disagreements: DisagreementRecord[] = []
    const disputedChunks = candidateChunks.filter((c) => c.epistemicStatus === 'disputed')
    if (disputedChunks.length > 0) {
      disagreements.push({
        topic: sanitizedQuery.queryText,
        postureA:
          'Evidencia documental con discrepancia metodológica o historiográfica registrada.',
        postureB: 'Divergencia entre fuentes primarias o metodologías estadísticas contrastantes.',
        sourcesA: disputedChunks.slice(0, 1).map((c) => c.sourceName),
        sourcesB: disputedChunks.slice(1).map((c) => c.sourceName),
      })
    }

    // 4. Síntesis mediante LlmProvider
    const systemInstructions =
      'Eres el asistente analítico de Chile Historia Abierta. Sintetiza únicamente los hechos respaldados por los chunks adjuntos. Cita cada chunk usado con su ID exacto y locator. Si hay controversia, explicita ambas posturas. Nunca inventes fuentes ni cifras.'

    const llmOutput = await this.llmProvider.generateAssistedResponse({
      query: sanitizedQuery,
      evidenceChunks: candidateChunks,
      systemInstructions,
    })

    // 5. Verificación Estricta y Determinista de Citas (Gate de Abstención por Alucinación)
    const verification = this.citationVerifier.verify(llmOutput.claimedCitations, candidateChunks)

    const elapsed = Math.round(performance.now() - startTime)

    if (!verification.isValid) {
      return {
        answer: `NO VERIFICADO: La respuesta generada no superó la verificación estricta de citas (${verification.reason}). El sistema se abstiene para garantizar rigor epistémico.`,
        evidenceStatus: 'not_verified',
        citations: [],
        disagreements: [],
        abstained: true,
        abstentionReason: 'CITATION_UNVERIFIED',
        metrics: {
          latencyMs: elapsed,
          tokensEstimated: llmOutput.tokensEstimated,
          modelId: llmOutput.modelId,
        },
      }
    }

    // 6. Determinación de Estado Epistemológico
    const finalEvidenceStatus = disagreements.length > 0 ? 'disputed' : 'documented'

    return {
      answer: llmOutput.rawAnswer,
      evidenceStatus: finalEvidenceStatus,
      citations: verification.verifiedCitations,
      disagreements,
      abstained: false,
      abstentionReason: null,
      metrics: {
        latencyMs: elapsed,
        tokensEstimated: llmOutput.tokensEstimated,
        modelId: llmOutput.modelId,
      },
    }
  }
}
