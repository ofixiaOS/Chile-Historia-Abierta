# Arquitectura propuesta

## Decisión vigente

Chile Historia Abierta comienza como monolito modular AdonisJS 7 con PostgreSQL/PostGIS como fuente canónica, `pgvector` como índice semántico inicial, almacenamiento de objetos para originales/derivados y workers para trabajo pesado. La recomendación está respaldada por la reauditoría de 2026-09-22 y los ADR 0001–0007.

AdonisJS 7 exige Node.js 24. Su paquete oficial de colas está documentado como experimental: si se evalúa, debe fijarse la versión y mantenerse detrás de `JobQueue`; no se asume como decisión irreversible.

```text
Fuentes externas
  → SourceConnector (allowlist, límites, licencia, payload original)
  → object storage versionado + registro de ingesta
  → validación/normalización en workers
  → PostgreSQL/PostGIS (canónico + outbox)
  → proyecciones reconstruibles (read models, FTS, pgvector, snapshots)
  → API pública AdonisJS /v1 → web, descargas, integraciones y futuro MCP

Escritura editorial/moderación
  → autenticación y permisos reforzados
  → revisión inmutable + outbox
  → publicación eventual en frontera pública
```

## Módulos de dominio

- `catalog`: fuentes, documentos, licencias, derechos por objeto y artefactos.
- `history`: entidades, lugares, acontecimientos, claims, relaciones y controversias.
- `statistics`: series, observaciones, unidades, metodologías, revisiones y transformaciones.
- `exploration`: búsqueda y estado compartido entre timeline, mapa, gráficos y colecciones.
- `publication`: posts tipados, `ChartSpec`, forks, revisiones y correcciones.
- `community`: usuarios, comentarios, reputación contextual, reportes y apelaciones.
- `editorial`: revisión, publicación, embargo y conflictos de interés.
- `ai`: recuperación, citas, evaluaciones, prompts versionados y límites de herramientas.
- `operations`: ingesta, outbox, jobs, DLQ, auditoría, métricas y backups.

Los controladores validan, autorizan, delegan y transforman DTOs. Las reglas epistemológicas y de versionado viven en servicios de dominio, no en controladores, jobs ni prompts.

## Componentes

- **AdonisJS 7:** API pública, autenticación, editorial, comunidad, moderación, OpenAPI y orquestación.
- **PostgreSQL:** historial canónico, revisiones, series, publicaciones, outbox y auditoría.
- **PostGIS:** geometrías y atestaciones espaciales con alcance temporal.
- **FTS + pgvector:** búsqueda híbrida inicial con filtros de procedencia, idioma, periodo y derechos.
- **Object storage S3-compatible:** originales, OCR, imágenes, manifests, snapshots y derivados; claves inmutables y hashes.
- **Workers Python/TypeScript:** OCR, normalización, embeddings, materialización, backtesting y exportación.
- **Frontend:** búsqueda y vistas pares de timeline, mapa, series, entidades, fuentes y discusión.

## Vistas de producto

La timeline no es el contenedor único. Búsqueda/pregunta es la entrada y produce un `ExplorationState` con periodo, territorio, tema, entidades y estado de evidencia. Timeline, mapa, gráficos y resultados textuales consumen ese estado y los mismos IDs. Ver ADR 0003.

## Frontera pública y editorial

La lectura pública utiliza un rol de base sin permisos de escritura ni acceso a borradores, secretos, PII o material restringido. Consume DTOs/read models y no ejecuta ingestión ni llamadas externas durante una solicitud.

La escritura editorial ocurre en rutas/host protegidos. Una transacción confirma el cambio canónico y el evento de outbox. Workers idempotentes refrescan proyecciones. La API publica `asOf`, `version` y frescura para hacer visible la consistencia eventual. Ver ADR 0006.

## Flujo de ingesta

1. Resolver un `SourcePolicy` aprobado: host, rutas, autenticación, límites, licencia y derechos esperados.
2. Descargar con egress restringido, timeout, máximo de bytes, redirecciones acotadas y tipo permitido.
3. Guardar intento, cabeceras permitidas, payload original, hash y fecha antes de transformar.
4. Detectar MIME por contenido, sanear/aislar artefactos y rechazar ejecutables.
5. Validar esquema, cobertura, unidad, metodología, licencia y restricciones por objeto.
6. Normalizar en una nueva versión; nunca sobrescribir original o revisión anterior.
7. Ejecutar controles de calidad y reconciliación sin convertir coincidencias en identidad automática.
8. Someter claims/relaciones a revisión; publicar read models solo después de aprobación.

## Contratos que evitan reescritura

- `SourceConnector`: descubre, descarga, valida, versiona y reporta cambios.
- `SearchProvider`: lexical, semántica, filtros, ranking, explicaciones y versión de índice.
- `MapRenderer`: capas, geometría temporal, tiles y fallback accesible.
- `ChartRenderer`: valida/compila `ChartSpec` y produce derivados.
- `ForecastProvider`: dataset, baseline, entrenamiento, backtesting, intervalos y artefactos.
- `ObjectStorage`: put inmutable, get, retención, checksum y URLs autorizadas.
- `JobQueue`: enqueue idempotente, reintento, timeout, heartbeats, cancelación y DLQ.
- `EmbeddingProvider`: modelo/versiones, lotes, dimensiones y coste/uso.
- `ProvenanceExporter`: PROV-O, JSON-LD, IIIF o perfiles futuros.
- `ModerationProvider`: señales auxiliares; nunca decisión final opaca.

Los puertos reciben y devuelven DTOs propios. Los IDs externos, payloads de proveedor y configuraciones de motor no atraviesan el núcleo.

## Datos canónicos y derivados

Canónicos: fuentes, artefactos originales, rights, revisiones de claims, observaciones/versiones, decisiones editoriales, publicaciones y correcciones.

Derivados reconstruibles: embeddings, índices FTS/vectoriales, clusters, resúmenes, thumbnails, tiles, read models y respuestas RAG. Eliminar un derivado no elimina evidencia; regenerarlo registra método y versión nuevos.

## Tecnologías diferidas

- **OpenSearch:** cuando el benchmark demuestre que PostgreSQL no cumple relevancia/facetas/latencia tras optimización.
- **Qdrant:** cuando el vector search degrade el canónico o no cumpla recall/latencia y el candidato gane el gate.
- **Jena/Fuseki:** cuando consumidores reales exijan SPARQL operativo.
- **Wikibase:** cuando la edición colaborativa multilingüe justifique un segundo stack.
- **GraphRAG/grafo dedicado:** cuando un benchmark etiquetado demuestre valor en preguntas multi-hop.
- **MCP:** adaptador de herramientas de lectura sobre `/v1`; no sustituye OpenAPI ni el dominio.

La regla de gate y su umbral interno de decisión están en ADR 0005.

## Referencias

- [Reauditoría estratégica 2026-09-22](research/strategic-reaudit-2026-09-22.md)
- [ADR 0003 — vistas complementarias](adr/0003-complementary-exploration-views.md)
- [ADR 0004 — evidencia y revisiones](adr/0004-evidence-envelope-and-immutable-revisions.md)
- [ADR 0005 — gates medidos](adr/0005-measured-evolution-gates.md)
- [ADR 0006 — frontera pública](adr/0006-public-read-boundary.md)
