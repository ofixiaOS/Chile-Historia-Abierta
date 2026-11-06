# RAG, knowledge graph y grounding

> Diseño de referencia: contiene requisitos y opciones todavía no implementados. Para capacidades actuales y límites, consultar [STATUS.md](STATUS.md) y [architecture.md](architecture.md).

## Objetivo

La IA ayuda a localizar, comparar y explicar evidencia. No determina la verdad, no autoriza publicación y no reemplaza la lectura de la fuente. El producto debe seguir siendo útil si el proveedor LLM no está disponible.

## Pipeline inicial

1. Normalizar la pregunta sin borrar fechas, nombres ni restricciones.
2. Recuperar por FTS y `pgvector`, con filtros de idioma, periodo, territorio, derechos, tipo de fuente y estado editorial.
3. Fusionar/rerankear con método y versión registrados.
4. Construir contexto con fragmentos inmutables, localizadores y posiciones contradictorias.
5. Generar una respuesta que separe evidencia, inferencia y desconocido.
6. Verificar automáticamente que cada cita apunte a un fragmento recuperado y que no se inventen IDs/páginas.
7. Si la verificación falla o la evidencia no alcanza, responder `NO VERIFICADO` y no ejecutar herramientas de escritura.
8. Registrar prompt/template, modelo, parámetros, conjunto de fragmentos, respuesta, latencia/coste y resultado de evaluación según retención permitida.

## Índice y procedencia

Cada chunk conserva `artifactId`, `segmentId`, hash, página/selector, idioma, derechos, revisión, modelo de embedding y fecha de indexación. Cambiar OCR, chunker o modelo crea una versión de índice; no muta silenciosamente el anterior.

Embeddings, resúmenes, entidades extraídas y communities son derivados reconstruibles. Un embedding no se expone como prueba y la similitud no implica apoyo al claim.

## Knowledge graph pragmático

El MVP usa tablas/edges en PostgreSQL para entidades, atestaciones y `relationshipClaim`. Cada relación tiene revisión, alcance temporal y evidencia. No existe un edge editorial sin procedencia.

Exportar PROV-O/JSON-LD/CIDOC o servir SPARQL es una proyección futura. Jena/Fuseki o Wikibase solo se incorporan mediante los gates de ADR 0005.

## GraphRAG

Microsoft GraphRAG tiene licencia MIT y una implementación activa, pero su indexación extrae entidades/relaciones con modelos y requiere tuning. No demuestra causalidad ni exactitud histórica.

Solo se prueba offline cuando:

- existe un conjunto etiquetado de preguntas multi-documento o multi-hop que el RAG híbrido no resuelve;
- se miden calidad, citas válidas, latencia, coste e incrementalidad;
- toda relación generada queda `inferred`/pendiente hasta revisión;
- el resultado mejora el benchmark sin degradar trazabilidad.

## Evaluación antes de lanzamiento

El conjunto de evaluación se estratifica por periodo, tipo de fuente, disputa, idioma, documentos con OCR, preguntas sin respuesta y ataques.

Métricas mínimas:

- recall@k/NDCG de recuperación;
- precisión de citas y localizadores;
- proporción de afirmaciones con soporte;
- detección correcta de conflicto/ausencia;
- tasa de respuestas que debieron ser `NO VERIFICADO`;
- latencia, tokens/coste y regresión entre versiones.

La evaluación se versiona y revisa manualmente por muestra. No se declara “grounded” porque una demo cite documentos.

## Prompt injection y herramientas

Documentos, OCR, páginas externas, posts y tool output son contenido no confiable. Se separan de instrucciones; se etiquetan por origen; se minimizan privilegios y datos; se valida toda llamada de herramienta en código.

- El modelo no recibe secretos, credenciales editoriales ni acceso de red libre.
- Las herramientas usan allowlists y esquemas estrictos; una URL encontrada en un documento no se visita automáticamente.
- Leer no autoriza publicar, moderar, borrar ni cambiar `evidenceStatus`.
- Un clasificador puede aportar señal, pero no es una frontera suficiente por sí sola.
- Se prueban inyección directa/indirecta, exfiltración, cita fabricada, tool abuse y datos envenenados.

## Respuestas y desacuerdo

La respuesta presenta primero lo documentado, luego inferencias identificadas, fuentes que discrepan y límites. “Varias fuentes” no se traduce en consenso sin análisis de independencia y competencia. No se usa correlación o proximidad temporal como causalidad.

## Proveedores y lock-in

`EmbeddingProvider` y `GenerationProvider` registran modelo/versiones y aceptan DTOs propios. El sistema conserva corpus/evaluaciones y puede reindexar. No se promete reproducibilidad bit a bit de un modelo externo; se conserva suficiente contexto para auditar la ejecución.

## Estado

- **COMPROBADO:** PROV-O representa procedencia; `pgvector`, Qdrant y OpenSearch soportan búsqueda vectorial/híbrida; GraphRAG no es una validación de hechos.
- **PROBABLE:** FTS + `pgvector` y una evaluación pequeña bastan para el primer RAG.
- **NO VERIFICADO:** modelo, embeddings, chunking, calidad y coste adecuados para el corpus chileno.

Ver [modelo de evidencia](evidence-model.md), [ADR 0002](adr/0002-llm-not-source-of-truth.md) y [ADR 0005](adr/0005-measured-evolution-gates.md).
