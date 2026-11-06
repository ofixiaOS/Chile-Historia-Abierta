# ADR 0005 — Evolución tecnológica mediante gates medidos

## Estado

Aceptado — 2026-09-22. Clarifica ADR 0001 sin reemplazarlo.

## Contexto

Qdrant, OpenSearch, Jena/Fuseki, Wikibase y GraphRAG resuelven problemas reales, pero agregan datos derivados, sincronización y operación. Adoptarlos antes de medir el corpus no demuestra valor y aumenta el coste de reversa.

## Decisión

PostgreSQL/PostGIS/pgvector sigue siendo la base inicial. Todo candidato especializado requiere ADR con corpus, carga, SLO, métrica de calidad, línea base, coste total, resultado y reversa.

Como regla de decisión, el candidato debe resolver un requisito externo imposible en la etapa actual o mejorar al menos 30% el criterio limitante a calidad no inferior, bajo una prueba reproducible y dentro del presupuesto acordado. El 30% es un umbral interno de decisión, no una afirmación de capacidad del producto.

Gates específicos:

- OpenSearch: relevancia/facetas/latencia que FTS + pgvector no resuelven tras optimización.
- Qdrant: carga vectorial que degrada el canónico o no cumple recall/latencia.
- Jena/Fuseki: al menos dos consumidores/alianzas requieren SPARQL operativo, no solo exportación.
- Wikibase: edición colaborativa multilingüe con calificadores/referencias justifica un segundo stack.
- GraphRAG: benchmark etiquetado de preguntas multi-documento/multi-hop supera RAG híbrido y preserva revisión.
- microservicio: límite estable con necesidad de escala/despliegue independiente y problema repetible de acoplamiento.

## Consecuencias

- `SearchProvider`, `ProvenanceExporter`, `JobQueue`, `StorageProvider` y otros puertos impiden acoplar el dominio al proveedor.
- Los índices externos son reconstruibles; nunca se convierten en fuente de verdad.
- No se fijan umbrales de usuarios o filas sin una prueba de carga real.
