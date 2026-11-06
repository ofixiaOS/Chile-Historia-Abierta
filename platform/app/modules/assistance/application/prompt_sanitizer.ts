export interface PromptSanitizationResult {
  readonly isSafe: boolean
  readonly reason?: string
  readonly sanitizedText: string
}

// Patrones de inyección de instrucciones, jailbreak y exfiltración de contexto
const injectionPatterns: readonly { readonly pattern: RegExp; readonly description: string }[] = [
  {
    pattern:
      /(?:ignore|ignora|ignorar|olvida|olvidar|descartar|disregard|forget|omit)\s+(?:all\s+|todas?\s+(?:las?\s+)?)?(?:(?:previous|prior|above|existing|anteriores?|previas?)\s+(?:instructions|rules|directives|prompts|instrucciones|reglas|directivas)|(?:instructions|rules|directives|prompts|instrucciones|reglas|directivas)\s+(?:previous|prior|above|existing|anteriores?|previas?))/i,
    description: 'Direct instruction override attempt',
  },
  {
    pattern:
      /(?:you\s+are\s+now|act\s+as|ahora\s+eres|actua\s+como|actúa\s+como)\s+(?:an?\s+unfiltered|DAN|developer\s+mode|godmode|evil|jailbreak|desfiltrado|sin\s+filtros)/i,
    description: 'Persona hijacking / jailbreak attempt',
  },
  {
    pattern: /(?:DAN\s+mode|modo\s+DAN|jailbreak|\[\s*(?:system|override|admin)[^\]]*\])/i,
    description: 'Persona hijacking / jailbreak attempt',
  },
  {
    pattern:
      /(?:show|reveal|display|output|print|repeat|muestra|revela|imprime)\s+(?:your\s+|tus?\s+)?(?:system\s+prompt|initial\s+instructions|hidden\s+rules|developer\s+message|instrucciones\s+del\s+sistema|prompt\s+de\s+sistema)/i,
    description: 'System prompt leakage attempt',
  },
  {
    pattern: /!\[.*?\]\(https?:\/\/[^\s)]+\)/i,
    description: 'Markdown image injection / exfiltration attempt',
  },
  {
    pattern: /<\/?(?:system|instruction|prompt|context|secret|admin)>/i,
    description: 'XML system delimiter injection attempt',
  },
  {
    pattern: /```(?:system|instruction|prompt)/i,
    description: 'Fenced block delimiter escape attempt',
  },
]

export class PromptSanitizer {
  /**
   * Inspecciona y sanea una consulta para evitar prompt injection y filtrado no autorizado.
   */
  public sanitize(queryText: string): PromptSanitizationResult {
    const trimmed = queryText.trim()

    // 1. Detección de caracteres de control o zero-width abusivos
    // eslint-disable-next-line no-control-regex
    const hasSuspiciousControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200D\uFEFF]/.test(
      trimmed
    )
    if (hasSuspiciousControlChars) {
      return {
        isSafe: false,
        reason: 'Suspicious control or invisible characters detected',
        sanitizedText: '',
      }
    }

    // 2. Detección de patrones conocidos de inyección
    for (const { pattern, description } of injectionPatterns) {
      if (pattern.test(trimmed)) {
        return {
          isSafe: false,
          reason: description,
          sanitizedText: '',
        }
      }
    }

    // 3. Normalización de espacios múltiples y saltos de línea repetidos
    const sanitized = trimmed.replace(/\s+/g, ' ')

    return {
      isSafe: true,
      sanitizedText: sanitized,
    }
  }
}
