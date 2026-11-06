# Roadmap por evidencia

La meta es validar un flujo completo con un corpus pequeño y trazable. Las cifras de fuentes/eventos/series se fijan después del inventario y capacidad editorial; no se usan metas arbitrarias como sustituto de calidad.

## Hito 0 — Contratos y corpus piloto

### Entregables

- esquema de evidencia/revisiones, derechos por artefacto y estado editorial;
- ficha de alta de fuente y dos conectores simulados con payloads versionados;
- selección del corpus piloto con preguntas de usuario y controversias reales;
- wireflow búsqueda → vistas → fuente → gráfico → publicación;
- OpenAPI inicial y `ChartSpec`/`ExplorationState` versionados;
- SLO/evaluación/budget preliminares y threat model.

### Gate de salida

Cada objeto piloto tiene fuente localizable, derechos revisados, hash, versión y limitaciones. Un revisor puede reproducir al menos un gráfico desde snapshot. Las fuentes sin licencia quedan bloqueadas, no “pendientes invisibles”.

## Hito 1 — Explorador público verificable

### Entregables

- AdonisJS 7 modular, PostgreSQL/PostGIS, object storage y jobs detrás de interfaces;
- búsqueda lexical y filtros;
- timeline, mapa, lista y panel de acontecimiento sincronizados;
- fuentes/segmentos, controversias y series relacionadas;
- API pública `/v1`, OpenAPI, paginación, ETag y read role;
- accesibilidad y móvil para el flujo de lectura.

### Gate de salida

Pruebas funcionales y negativas cubren derechos restringidos, fuente caída, query costosa, fecha/geometría incierta, borrador filtrado y corrección. Prueba de carga documenta línea base sin prometer producción.

## Hito 2 — Análisis y publicación reproducible

### Entregables

- constructor `ChartSpec` basado en Vega-Lite;
- publicaciones `dato`, `interpretación`, `hipótesis` y `predicción` con validación distinta;
- snapshots, forks, revisiones, correcciones y tablas accesibles;
- outbox, proyecciones, DLQ y observabilidad mínima.

### Gate de salida

Un tercero reproduce la publicación desde snapshot y obtiene mismo resultado dentro de límites documentados. Manipulación de ejes/unidad/vintage y pérdida de datos generan error o advertencia visible.

## Hito 3 — Comunidad y moderación

### Entregables

- usuarios, comentarios con evidencia, reportes, apelación y conflictos;
- reputación contextual y ranking comunitario separado de evidencia;
- adjuntos seguros, rate limits y herramientas de moderación;
- política pública y métricas de carga humana.

### Gate de salida

Piloto moderado con ejercicios de spam, doxxing, cita falsa, brigading, conflicto y edición/retractación. No se activa federación.

## Hito 4 — Asistencia con evidencia

### Entregables

- FTS + `pgvector`, corpus/chunks versionados y citas localizables;
- conjunto de evaluación estratificado;
- respuestas con desacuerdo, `NO VERIFICADO` y validación de citas;
- defensa de prompt injection/tool abuse y presupuesto por proveedor.

### Gate de salida

La evaluación mide recuperación, citas, soporte, abstención, latencia y coste. El sistema falla cerrado y sigue ofreciendo búsqueda/fuentes sin LLM.

## Hito 5 — Estadística y pronósticos delimitados

### Entregables

- series/vintages y conceptos SDMX adaptados;
- baseline, splits temporales, backtesting, intervalos y escenarios;
- registro de modelo/dataset/código y monitoreo de degradación.

### Gate de salida

Un modelo no se publica como predictivo si no supera el baseline bajo criterio definido. La UI separa pronóstico, escenario y dato observado.

## Hito 6 — Interoperabilidad y escala medida

### Entregables posibles, no comprometidos

- IIIF/PROV-O/JSON-LD/SDMX y snapshots;
- MCP de solo lectura;
- réplica, particionamiento, vector tiles, OpenSearch/Qdrant;
- Jena/Fuseki, Wikibase o GraphRAG experimental;
- plan institucional y fiscal hosting.

### Gate de entrada

Cada componente cumple ADR 0005: problema medido o requisito externo, benchmark, coste, reversa y no degradación de procedencia.

## Trabajo transversal

- seguridad: SSRF, uploads, prompt injection, abuso, privacidad y secretos;
- operación: backup/restauración, migraciones, observabilidad y presupuestos;
- editorial: licencias, revisión, correcciones, conflictos y gobernanza;
- producto: accesibilidad, móvil, rendimiento y entrevistas de usuario;
- sostenibilidad: costes reales, concentración y firewall editorial.

## Decisiones aplazadas explícitamente

No GraphRAG, grafo dedicado, Wikibase, Jena, OpenSearch, Qdrant, ActivityPub, Kubernetes ni microservicios en el MVP. “Preparado” significa interfaz y datos exportables, no dependencia instalada.

## Criterio de avance

No avanzar por cantidad de pantallas, series o documentos. Avanzar cuando el hito tiene evidencia versionada, derechos revisados, pruebas negativas, límites publicados y proceso operacional que cierra limpiamente.

Ver [reauditoría](research/strategic-reaudit-2026-09-22.md) y [ADRs](adr/).
