# Diseño scale-ready

> Diseño de referencia: contiene requisitos y opciones todavía no implementados. Para capacidades actuales y límites, consultar [STATUS.md](STATUS.md) y [architecture.md](architecture.md).

## Principio

Preparar contratos, límites y observabilidad no significa operar infraestructura distribuida antes de validar el producto. El dominio canónico permanece estable; cachés, réplicas e índices son proyecciones reemplazables.

No se estiman usuarios, filas, QPS ni coste sin medición. Los umbrales se definen como SLOs y gates del proyecto después de un benchmark reproducible.

## Escenarios

### A — Validación de corpus y flujo

- AdonisJS 7 modular y stateless.
- PostgreSQL/PostGIS/pgvector, object storage y workers desplegables por separado, aunque compartan repositorio.
- CDN para estáticos y snapshots; ningún archivo durable en el proceso web.
- FTS + vector + filtros; read models sencillos en PostgreSQL.
- Cola detrás de `JobQueue`. Si se usa `@adonisjs/queue`, fijar versión porque la documentación oficial la marca experimental.

### B — Lectura pública dominante

- ETags derivados de consulta normalizada + versión del read model.
- `Cache-Control`, invalidación por outbox, caché compartida solo si la local/CDN no basta.
- Vistas materializadas/read tables con `generatedAt`, `sourceVersion` y estado de frescura.
- Rol/host público read-only. Réplica cuando la lectura interfiera de forma medida con escritura/ingesta.
- Presupuesto por endpoint: timeout, páginas, rango temporal, geometría, orden y complejidad.

### C — Ingesta y análisis pesados

- Workers separados por carga: ingesta, OCR, embeddings, materialización, exportaciones y forecasting.
- Jobs con `idempotencyKey`, intento, lease/heartbeat, timeout, reintento con jitter, estado final y DLQ.
- Límites y circuit breaker por proveedor; ninguna petición pública espera OCR, embedding o pronóstico.
- Backpressure: pausar conectores antes de saturar base, storage o proveedor.

### D — Ecosistema amplio

- Snapshots y artefactos versionados servidos desde object storage/CDN.
- API keys, cuotas por consumidor, exportaciones asíncronas y webhooks firmados.
- Particionamiento, réplicas adicionales o índices especializados solo con evidencia del plan de consulta.
- SPARQL, MCP y motores de búsqueda/vectoriales como proyecciones reconstruibles.

## Gates medidos

Cada cambio relevante requiere un ADR con corpus, carga, línea base, SLO, calidad, coste total, resultado, riesgos y reversa.

- **Read model/caché:** una consulta pública repetida incumple el SLO o consume una proporción relevante del presupuesto después de índices y límites.
- **Réplica:** lectura pública produce saturación, colas o degradación de escritura durante ventanas representativas tras usar caché/read models.
- **Particionamiento:** `EXPLAIN (ANALYZE, BUFFERS)` demuestra que pruning reduce de forma material I/O/latencia en consultas reales.
- **OpenSearch/Qdrant:** el candidato mejora al menos 30% el criterio limitante a calidad no inferior y dentro del presupuesto. Es un umbral interno, no una promesa de rendimiento.
- **Jena/Wikibase/grafo:** requisito de interoperabilidad/edición o patrón multi-hop real que la proyección actual no resuelve.
- **Microservicio:** límite estable, necesidad de escala o despliegue independiente y dos incidentes o una degradación repetible atribuible al acoplamiento.

## SLO y medición inicial

Antes de fijar números:

1. construir corpus y mezcla de carga representativos;
2. acordar SLO de disponibilidad, latencia, frescura y completitud por ruta;
3. guardar script, configuración, versión de datos y hardware del benchmark;
4. medir p50/p95/p99, errores, timeouts, consumo, coste y calidad de búsqueda;
5. publicar qué demuestra y qué no demuestra la prueba.

## Observabilidad mínima

- HTTP: volumen, p50/p95/p99, error rate, timeouts, 304/cache hit y bytes.
- PostgreSQL: conexiones, locks, buffers, slow queries, WAL, lag de réplica y crecimiento.
- Jobs: profundidad y edad por cola, intentos, duración, leases vencidos y DLQ.
- Ingesta: éxito por proveedor, schema drift, bytes, latencia, duplicados y licencias pendientes.
- Búsqueda/RAG: recall/NDCG del conjunto de evaluación, citas inválidas, `NO VERIFICADO`, latencia y coste.
- Moderación: reportes, tiempo de resolución, apelaciones, reincidencia y falsos positivos muestreados.

## Resiliencia y recuperación

- Backups cifrados y restauración probada con RPO/RTO definidos antes de tráfico relevante.
- Versionado/retención del object storage; comprobación periódica de hashes.
- Migraciones ensayadas y con estrategia de rollback/roll-forward; no prometer reversibilidad automática cuando hay transformación de datos.
- Read models e índices se reconstruyen; el historial canónico y originales tienen prioridad de recuperación.
- Proveedor caído degrada a snapshot/frescura visible, no borra datos ni bloquea lectura existente.

## Seguridad de escala

- Rate limits separados por login, búsqueda, detalle, exportación, publicación e IA.
- Cuotas de complejidad para rangos, geometrías, joins y exportaciones; no solo peticiones/minuto.
- SSRF: allowlist, DNS/IP privados bloqueados, redirecciones limitadas, límites de bytes/tiempo y egress del worker.
- Adjuntos en dominio aislado, MIME por contenido, sanitización y descarga forzada cuando corresponda.
- Prompt injection: documentos y posts son datos no confiables; el LLM no recibe credenciales ni autoridad editorial.

## Regla anti-sobreingeniería

No se crean microservicios, Kubernetes, federación, múltiples motores o réplicas regionales sin gate. La meta es preservar el dominio y una ruta de migración, no predecir una escala inexistente.

Ver [ADR 0005](adr/0005-measured-evolution-gates.md) y [ADR 0006](adr/0006-public-read-boundary.md).
