# ADR 0002 — El LLM no es fuente canónica

## Decisión

El LLM solo resume, compara, clasifica o propone relaciones a partir de datos recuperados y citables. La fuente canónica es la evidencia versionada local.

## Motivo

Los LLM pueden inventar hechos, citas y causalidades. RAG y GraphRAG reducen el problema de recuperación, pero no validan por sí mismos la verdad de la evidencia.

## Consecuencia

Las respuestas deben poder mostrar fuentes, fecha, versión, método y limitaciones. Sin evidencia suficiente, el sistema responde `NO VERIFICADO`.

El contrato de revisiones y `evidenceEnvelope` se concreta en [ADR 0004](0004-evidence-envelope-and-immutable-revisions.md).
