# Registro de verificación

Este documento evita que el proyecto acumule afirmaciones técnicas o históricas sin evidencia.

## Plantilla

```text
ID:
Fecha:
Objeto:
Estado: COMPROBADO | PROBABLE | NO VERIFICADO
Comando o procedimiento:
Entorno:
Evidencia:
Qué demuestra:
Qué no demuestra:
Próximo paso:
```

## Reglas

- Una prueba aislada demuestra solo su alcance y entorno.
- Un mock no demuestra integración real.
- HTTP 200 no demuestra calidad, completitud ni licencia.
- Un modelo que ajusta datos históricos no demuestra capacidad predictiva.
- Una cita encontrada no demuestra que respalde la interpretación completa.
- Las suites con pruebas solapadas no se suman como cobertura independiente.

## Registros

### PHASE-37-PRODUCTION-RELEASE-WRITES-DISABLED-2026-09-23

```text
ID: PHASE-37-PRODUCTION-RELEASE-WRITES-DISABLED-2026-09-23
Fecha: 2026-09-23
Objeto: impedir que comandos CLI con pool administrativo escriban aprobaciones o publiquen evidencia en producción
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; node ace test unit --files=tests/unit/releases/production_release_gate.spec.ts; .\scripts\verify-release-integration.ps1; npm test; npm run build; git diff --check
Evidencia: los cuatro métodos de escritura rechazan NODE_ENV=production antes de validación o acceso a la base. La prueba de integración temporal conserva flujo positivo y negativo: 50 pruebas PostgreSQL pasan. Suite unitaria/funcional completa: 195 pasan. Typecheck, lint y build pasan.
Qué demuestra: el proceso migration ya no puede usar el servicio release para registrar review, stage, approve o activate si está en NODE_ENV=production.
Qué no demuestra: identidad individual, separación de funciones, aprobación de dos personas, writer productivo aislado, rollback ni despliegue.
NO VERIFICADO: autorización editorial productiva, credenciales/roles reales, proceso de publicación y entorno productivo.
Servicios: PostgreSQL temporal detenido; puerto 55432 libre; no se accedió a producción.
```

### PHASE-38-PUBLIC-CREDENTIALS-ISOLATED-FROM-MIGRATIONS-2026-09-23

```text
ID: PHASE-38-PUBLIC-CREDENTIALS-ISOLATED-FROM-MIGRATIONS-2026-09-23
Fecha: 2026-09-23
Objeto: no entregar secretos del rol público PostgreSQL al proceso production/migration
Estado: COMPROBADO PARCIAL
Comandos: node ace test unit --files=tests/unit/security/production_persistence_gate.spec.ts; .\scripts\verify-release-integration.ps1; npm test; npm run typecheck; npm run lint; npm run build; git diff --check
Evidencia: el proceso migration aplicó todas las migraciones en PostgreSQL temporal con credenciales administrativas y sin DB_PUBLIC_USER/DB_PUBLIC_PASSWORD; 50 pruebas PostgreSQL pasan. Gate prueba que production/web exige ambas credenciales, migration rechaza cualquier credencial pública y los pares parciales fallan. Suite unitaria/funcional completa: 196 pasan. Typecheck, lint y build pasan.
Qué demuestra: la configuración local de rol migration funciona sin credenciales públicas y no construye ese pool.
Qué no demuestra: que la plataforma/gestor de secretos real omita esos secretos, permisos de PostgreSQL reales, producción ni aislamiento del host.
NO VERIFICADO: despliegue, gestor de secretos y roles reales.
Servicios: PostgreSQL temporal detenido; puerto 55432 libre; variables restauradas; no se accedió a producción.
```

### PHASE-39-RATE-LIMIT-ALL-REGISTERED-ROUTES-2026-09-23

```text
ID: PHASE-39-RATE-LIMIT-ALL-REGISTERED-ROUTES-2026-09-23
Fecha: 2026-09-23
Objeto: limitar tráfico repetido a rutas públicas registradas, incluida portada SSR con consulta PostgreSQL
Estado: COMPROBADO PARCIAL
Comandos: node ace test functional --files=tests/functional/web/explorer_view.spec.ts; npm test; npm run typecheck; npm run lint; npm run build; git diff --check
Evidencia: test funcional agotó el presupuesto de la ruta / y recibió 429 con Retry-After; prueba de API con IDs cambiantes conserva rechazo al exceder cuota. Suite completa: 197 pruebas pasan. Typecheck, lint y build pasan.
Qué demuestra: el middleware aplica 60 solicitudes por minuto por patrón/IP a las rutas HTTP que el router registra, antes del body parser.
Qué no demuestra: cuota entre instancias, correcta IP tras proxy, defensa DDoS ni comportamiento bajo carga.
NO VERIFICADO: gateway distribuido, proxy productivo, concurrencia legítima y carga de producción.
Servicios: no se levantaron servicios ni se accedió a producción.
```

### PHASE-40-SOURCE-URL-TRANSPORT-BOUNDARY-2026-09-23

```text
ID: PHASE-40-SOURCE-URL-TRANSPORT-BOUNDARY-2026-09-23
Fecha: 2026-09-23
Objeto: restringir destinos de red de conectores de fuentes a HTTPS estándar y host canónico exacto
Estado: COMPROBADO PARCIAL
Comandos: node ace test unit --files=tests/unit/catalog/source_connectors.spec.ts; npm test; npm run typecheck; npm run lint; npm run build; git diff --check
Evidencia: el helper rechaza HTTP, puerto no estándar, userinfo, subdominios no exactos y host no autorizado; URL inválida no se refleja en mensaje. Host canónico HTTPS aceptado. Prueba dirigida: 9 pasan; suite completa: 199 pasan. Typecheck, lint y build pasan.
Qué demuestra: validación sintáctica y de allowlist antes de invocar el transporte.
Qué no demuestra: DNS resuelta a IP pública, protección frente a rebinding, redirects, TLS del transporte, egress del host o integración productiva; el checkout no contiene un transporte HTTP productivo concreto.
NO VERIFICADO: adaptador HTTP, red, DNS, certificados, redirects y despliegue.
Servicios: no se hicieron llamadas a proveedores ni se accedió a producción.
```

### PHASE-41-BOUNDED-DOCUMENT-EXTRACTION-2026-09-23

```text
ID: PHASE-41-BOUNDED-DOCUMENT-EXTRACTION-2026-09-23
Fecha: 2026-09-23
Objeto: limitar memoria de entrada y volumen de extracción del worker documental
Estado: COMPROBADO PARCIAL
Comandos: python -m pytest worker/tests -q; python -m compileall -q worker; git diff --check
Evidencia: topes por defecto de 20 MiB, 500 páginas, 2.000.000 caracteres; pruebas negativas de bytes, texto, páginas PDF/texto, caracteres PDF y archivo en disco; 42 pruebas Python pasan.
Qué demuestra: entrada mayor al límite se rechaza con E_DOCUMENT_LIMIT; archivos se leen con máximo límite+1; páginas y texto extraído se acotan durante parseo.
Qué no demuestra: resistencia absoluta a PDF malicioso, consumo de un proceso/host sin sandbox, exactitud de capacidad para corpus productivo ni aislamiento del contenedor.
NO VERIFICADO: carga adversarial, perfil memoria/CPU, worker productivo, calibración corpus, dependencias Python actuales (pip-audit no disponible en intérprete actual).
Servicios: no se levantaron servicios ni se accedió a producción.
```

### PHASE-42-REVOKE-PUBLIC-SCHEMA-CREATE-2026-09-23

```text
ID: PHASE-42-REVOKE-PUBLIC-SCHEMA-CREATE-2026-09-23
Fecha: 2026-09-23
Objeto: quitar permiso CREATE heredado/directo del rol público en el esquema PostgreSQL usado por la aplicación
Estado: COMPROBADO PARCIAL
Comandos: .\scripts\verify-release-integration.ps1; npm test; npm run typecheck; npm run lint; npm run build; git diff --check
Evidencia: el ensayo temporal concedió CREATE ON SCHEMA public TO PUBLIC antes de migrar; 202609230003 lo revocó. cha_public conserva USAGE, no tiene CREATE efectivo y CREATE TABLE recibe permission denied. 51 pruebas PostgreSQL y 199 unitarias/funcionales pasan; typecheck, lint y build pasan.
Qué demuestra: migración local elimina el grant heredado de PUBLIC y privilegio efectivo para cha_public.
Qué no demuestra: grants por otros roles de grupo, ownership del esquema productivo, cambios manuales posteriores, otras cuentas con privilegio ni producción.
NO VERIFICADO: roles/membresías reales, DB desplegada y pipeline de migración.
Servicios: PostgreSQL temporal detenido; puerto 55432 libre; variables restauradas; no se accedió a producción.
```

### STRATEGIC-REAUDIT-2026-09-22

```text
ID: STRATEGIC-REAUDIT-2026-09-22
Fecha: 2026-09-22
Objeto: arquitectura, evidencia, producto, fuentes y sostenibilidad
Estado: COMPROBADO PARCIAL
Procedimiento: lectura completa de documentación local y apertura de documentación, repositorios y licencias oficiales enlazados en el informe
Entorno: carpeta local sin metadata .git; investigación web de solo lectura
Evidencia: docs/research/strategic-reaudit-2026-09-22.md y ADR 0003-0007
Qué demuestra: las capacidades/licencias citadas y la coherencia documental revisada en la fecha
Qué no demuestra: implementación, producción, capacidad, demanda, coste, calidad de datos o integración real
Próximo paso: aprobar el roadmap y ejecutar Hito 0 en una tarea separada
```

### PHASE-0-EVIDENCE-SLICE-2026-09-22

```text
ID: PHASE-0-EVIDENCE-SLICE-2026-09-22
Fecha: 2026-09-22
Objeto: primer corte vertical de dominio de evidencia y API pública
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; npm run build; servidor HMR + solicitudes HTTP locales
Entorno: Node.js 24.14.1, npm 11.11.0, Windows local, adaptador de repositorio en memoria
Evidencia: 14 pruebas pasaron; typecheck y lint terminaron con código 0; build terminó correctamente; HTTP observó 200, ETag, 304 sin cuerpo, borrador 404 y OpenAPI 3.1
Qué demuestra: invariantes de publicación del slice, contrato /v1/claims/:id, fallo cerrado para evidencia insuficiente, ocultamiento de borradores y caché condicional en el entorno observado
Qué no demuestra: PostgreSQL/PostGIS, persistencia, RLS, migraciones, ingestión, corpus histórico, licencias de fuentes reales, carga, producción o despliegue
Próximo paso: diseñar y probar el esquema PostgreSQL/PostGIS para fuentes, artefactos, claims, revisiones y evidence links sin reemplazar el adaptador de dominio
```

### PHASE-1-POSTGRES-PERSISTENCE-2026-09-22

```text
ID: PHASE-1-POSTGRES-PERSISTENCE-2026-09-22
Fecha: 2026-09-22
Objeto: persistencia canónica mínima y frontera de lectura pública
Estado: COMPROBADO PARCIAL
Comandos: npm run db:up; npm run test:postgres; npm test; npm run typecheck; npm run lint; npm run build; servidor HMR con CLAIM_REPOSITORY=postgres y solicitudes HTTP locales
Entorno: PostgreSQL 16.13 en imagen oficial postgres:16-alpine, Docker local, Node.js 24.14.1, Windows
Evidencia: migración aplicada; 6 pruebas PostgreSQL pasaron; 14 pruebas unitarias/funcionales sin regresión; HTTP PostgreSQL observó 200, una fuente localizable, ETag y 304 sin cuerpo
Qué demuestra: round-trip del ClaimRecord por la vista pública, borradores invisibles, rechazo de claim público sin evidencia, rechazo de AI como soporte único de documented, revisiones append-only y denegación de tablas canónicas al rol cha_public
Qué no demuestra: PostGIS, RLS editorial/multi-tenant, backup/restauración, ingestión, fuentes reales, corpus histórico, rendimiento, producción o despliegue
Próximo paso: crear el servicio transaccional de escritura editorial y el registro de transiciones/outbox antes de incorporar datos reales
```

### PHASE-2-EDITORIAL-WRITE-AND-OUTBOX-2026-09-22

```text
ID: PHASE-2-EDITORIAL-WRITE-AND-OUTBOX-2026-09-22
Fecha: 2026-09-22
Objeto: servicio transaccional editorial, ciclo de vida inmutable de revisiones y outbox canónico
Estado: COMPROBADO PARCIAL
Comandos: npm run db:up; node ace migration:run --force; npm run test:postgres; npm test; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: PostgreSQL 16.13 en imagen oficial postgres:16-alpine, Docker local, Node.js 24.14.1, Windows
Evidencia: migración 202609220002_create_outbox_events aplicada; 10 pruebas PostgreSQL de integración pasaron (4 nuevas + 6 existentes); 24 pruebas unitarias/funcionales pasaron (10 nuevas + 14 existentes); typecheck, lint y build con código 0
Qué demuestra: creación de borradores, publicación con validación de evidencia, corrección con supersedesRevisionId y retractación mediante nueva revisión append-only; inserción atómica de fuentes, artefactos deduplicados por hash, revisiones, enlaces y eventos outbox en la misma transacción; actualización sincrónica de public_claim_records y GetPublicClaim; ocultamiento de borradores y retractaciones de la vista pública; rollback limpio ante publicaciones sin evidencia sin dejar revisiones u outbox huérfanos; denegación de acceso al rol cha_public sobre outbox_events; consulta y marcado de eventos pendientes en outbox
Qué no demuestra: despacho asíncrono continuo mediante workers daemon, PostGIS, autenticación de usuarios/editores, ingestión de fuentes reales, conectores externos, corpus histórico, producción o despliegue
Próximo paso: implementar los primeros conectores de fuentes simulados y la ficha de alta con payloads versionados para el corpus piloto (Hito 0)
```

### PHASE-3-SOURCE-CONNECTORS-AND-PILOT-INGESTION-2026-09-22

```text
ID: PHASE-3-SOURCE-CONNECTORS-AND-PILOT-INGESTION-2026-09-22
Fecha: 2026-09-22
Objeto: conectores de fuentes (Banco Central BDE y Congreso BCN), fichas de alta formales, golden files versionados e IngestionService
Estado: COMPROBADO PARCIAL
Comandos: npm run db:up; npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 31 pruebas unitarias/funcionales pasaron (7 nuevas de conectores e IngestionService); 12 pruebas de integración PostgreSQL pasaron (2 nuevas de tubería completa de ingesta); typecheck, lint y build con código 0
Qué demuestra: fichas de alta documentadas en docs/data-sources/fichas/; obtención y normalización de series macroeconómicas TPM de BCentral BDE y leyes republicanas de Congreso BCN desde golden files reales; cálculo y verificación estricta de hash SHA-256 sobre el contenido crudo; defensa activa contra SSRF mediante allowlist de hosts; rechazo de payloads que excedan maxBytes; detección de schema drift y JSON corrupto; persistencia atómica en PostgreSQL de fuentes, artefactos deduplicados por hash, revisiones publicadas, enlaces con localizadores exactos y eventos outbox; visibilidad inmediata de los datos ingeridos en GetPublicClaim y la vista pública public_claim_records
Qué no demuestra: llamadas de red en vivo a las APIs externas sin token, scraping masivo, almacenamiento de objetos S3 en nube, corpus histórico exhaustivo, producción o despliegue
Próximo paso: implementar el explorador público sincronizado (timeline + filtros + OpenAPI) para consultar las afirmaciones y series ingeridas (Hito 1)
```

### PHASE-4-PUBLIC-EXPLORER-AND-COLLECTIONS-2026-09-22

```text
ID: PHASE-4-PUBLIC-EXPLORER-AND-COLLECTIONS-2026-09-22
Fecha: 2026-09-22
Objeto: explorador público sincronizado (GET /v1/explore), colecciones (GET /v1/claims), paginación por cursor opaco, filtros de evidencia y aislamiento determinista de outbox
Estado: COMPROBADO PARCIAL
Comandos: npm run db:up; npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 44 pruebas unitarias/funcionales pasaron (13 nuevas); 14 pruebas de integración PostgreSQL pasaron (2 nuevas con rol cha_public); typecheck, lint y build con código 0
Qué demuestra: aislamiento determinista de la cola outbox en las suites de integración sin saturación de LIMIT 50; paginación keyset determinista por cursor opaco base64url sobre (published_at, claim_id); filtrado estricto por evidenceStatus, sourceType y búsqueda lexical q; rechazo seguro con E_VALIDATION (422) ante cursores manipulados, límites fuera de rango (1..100) y estados inexistentes; entrega del read model de exploración (/v1/explore) con items citables para sincronizar timeline, lista y mapa, facetas agregadas por estado epistemológico y tipo de fuente, y rango temporal; soporte condicional ETag / 304; consulta estricta mediante el rol de solo lectura cha_public sobre la vista public_claim_records sin acceso a tablas canónicas; OpenAPI 3.1 actualizado
Qué no demuestra: rendimiento bajo millones de registros simultáneos (requiere prueba de carga), mapas interactivos con capas PostGIS (requiere fuentes con geometría espacial), producción o despliegue
Próximo paso: diseñar el constructor de gráficos reproducibles ChartSpec basado en Vega-Lite vinculado a los datos explorados (Hito 2)
```

### PHASE-5-REPRODUCIBLE-CHARTS-AND-PUBLICATIONS-2026-09-22

```text
ID: PHASE-5-REPRODUCIBLE-CHARTS-AND-PUBLICATIONS-2026-09-22
Fecha: 2026-09-22
Objeto: especificación de gráficos reproducibles (ChartSpec Vega-Lite 5.21.0), motor anti-manipulación y publicaciones tipadas con snapshots tabulares
Estado: COMPROBADO PARCIAL
Comandos: npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 64 pruebas unitarias/funcionales pasaron (20 nuevas de publicación y gráficos); 14 pruebas de integración PostgreSQL pasaron; typecheck, lint y build con código 0
Qué demuestra: definición canónica de ChartSpec basado en Vega-Lite y DataSnapshot tabular con hashes deterministas (queryHash y dataSnapshotHash SHA-256); detección y advertencia activa de ejes truncados engañosos (TRUNCATED_AXIS), doble eje con escalas/unidades no normalizadas (DUAL_AXIS_DISPARITY) y discontinuidades o saltos temporales sospechosos (DATA_DISCONTINUITY); rechazo estricto en el dominio y HTTP (422) de causalidad espuria (UNVERIFIED_CAUSALITY) ante métodos causales sin metodología o supuestos en limitations; validación de publicaciones tipadas según su función epistémica (dato requiere evidencia y unidad/período, interpretacion requiere razonamiento extenso y fuentes citadas, hipotesis exige criterios de refutación en limitations); declaración formal de conflictos de interés y soporte de forks reproducibles referenciando la publicación original; endpoints POST /v1/chart-specs/validate, POST /v1/publications y GET /v1/publications/:id con ETag y soporte 304; OpenAPI 3.1 actualizado
Qué no demuestra: persistencia canónica de publicaciones en base de datos relacional (implementado en repositorio en memoria para aislamiento inicial de Hito 2), renderizado gráfico server-side (las imágenes son derivados de cliente; el contrato canónico es la especificación JSON), moderación comunitaria y votos (Hito 3)
Próximo paso: diseñar el módulo de comunidad, gobernanza epistémica, votos reproducibles y moderación transparente (Hito 3)
```

### PHASE-6-PERSISTENT-PUBLICATIONS-AND-OUTBOX-2026-09-22

```text
ID: PHASE-6-PERSISTENT-PUBLICATIONS-AND-OUTBOX-2026-09-22
Fecha: 2026-09-22
Objeto: persistencia canónica de publicaciones, revisiones inmutables, chart_specs, eventos outbox y vista pública de seguridad en PostgreSQL
Estado: COMPROBADO PARCIAL
Comandos: node ace migration:run --force; npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: migración 202609220003_create_publications_and_charts aplicada y probada con rollback; 64 pruebas unitarias/funcionales pasaron; 19 pruebas de integración PostgreSQL pasaron (5 nuevas en PostgresPublicationRepository); typecheck, lint y build con código 0
Qué demuestra: creación de tablas canónicas chart_specs, publications y publication_revisions con restricciones de integridad de dominio; evolución segura de outbox_events para admitir eventos publication.created y aggregate_type 'publication'; atomicidad transaccional completa: persistencia de especificación gráfica, publicación, revisión y evento outbox en una única transacción en la conexión admin; vista de seguridad public_publication_records con security_barrier = true que agrega limpiamente el objeto chart_spec mediante LEFT JOIN; cumplimiento estricto del principio de menor privilegio: el rol cha_public puede consultar la vista de publicaciones pero se le deniega el acceso a las tablas maestras directas; soporte formal de bifurcaciones (forked_from_publication_id) entre publicaciones de distintos autores; deserialización tipada de arrays y objetos JSON; selección dinámica de repositorio en public_publications.ts mediante PUBLICATION_REPOSITORY
Qué no demuestra: renderizado de gráficos en cliente interactivo (requiere front-end con Vega-Embed), gobernanza comunitaria de publicaciones, comentarios respaldados y moderación (objeto del Hito 3)
Próximo paso: diseñar el módulo de usuarios, reputación contextual no basada en votos de popularidad, comentarios respaldados con evidencia y moderación auditable (Hito 3)
```

### PHASE-7-COMMUNITY-COMMENTS-AND-MODERATION-2026-09-22

```text
ID: PHASE-7-COMMUNITY-COMMENTS-AND-MODERATION-2026-09-22
Fecha: 2026-09-22
Objeto: comentarios con evidencia, reacciones comunitarias con garantía de aislamiento epistémico y flujo de moderación auditable con defensa anti-brigading (Hito 3)
Estado: COMPROBADO PARCIAL
Comandos: npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 83 pruebas unitarias/funcionales pasaron (19 nuevas del módulo de comunidad y moderación); 19 pruebas de integración PostgreSQL pasaron; typecheck, lint y build con código 0
Qué demuestra: implementación de comentarios tipados (aporte_evidencia, solicitud_aclaracion, discrepancia_metodologica, comentario_general); validación estricta que exige referencias de evidencia para aportes empíricos y fundamentación de al menos 25 caracteres para discrepancias metodológicas; sistema de reacciones y votos transparentes (relevante, metodologia_rigurosa, requiere_revision, discrepo_con_evidencia) con aislamiento epistemológico estricto según el Principio 12 (los votos ordenan atención comunitaria sin alterar en ninguna circunstancia el evidenceStatus ni el estado editorial); defensa activa contra brigading exigiendo una justificación verificable de al menos 15 caracteres en reportes; flujo de moderación auditable que registra la regla infringida y las notas de decisión, actualizando el estado de visibilidad a flagged, quarantined o removed sin destruir el registro interno ni la trazabilidad (Principio 8); endpoints HTTP /v1/publications/:id/comments, /v1/publications/:id/votes y /v1/reports con contratos OpenAPI 3.1 publicados
Qué no demuestra: persistencia de comentarios y votos en tablas PostgreSQL relacionales (gestionados en adaptador de repositorio en memoria para aislamiento inicial de Hito 3), interfaz gráfica de usuario en navegador para interacción comunitaria, volumen y coste humano de moderación en producción
Próximo paso: diseñar el módulo de asistencia con evidencia y evaluación de citas verificables (Hito 4) o persistencia relacional PostgreSQL de comentarios y votos
```

### PHASE-8-PERSISTENT-COMMUNITY-AND-MODERATION-2026-09-22

```text
ID: PHASE-8-PERSISTENT-COMMUNITY-AND-MODERATION-2026-09-22
Fecha: 2026-09-22
Objeto: persistencia canónica de comentarios con evidencia, votos comunitarios idempotentes, bitácora de reportes y decisiones de moderación en PostgreSQL (Hito 3 Completo)
Estado: COMPROBADO PARCIAL
Comandos: node ace migration:run --force; npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: migración 202609220004_create_community_tables aplicada con éxito; 83 pruebas unitarias/funcionales pasaron; 24 pruebas de integración PostgreSQL pasaron (5 nuevas en PostgresCommunityRepository); typecheck, lint y build con código 0
Qué demuestra: creación de tablas canónicas comments (con hilos parent_comment_id y referencias jsonb de evidencia), community_votes (con restricción UNIQUE de usuario y objetivo para idempotencia), content_reports (con justificación anti-brigading) y moderation_decisions (con notas y acciones auditables); vista de seguridad public_comment_records que filtra automáticamente comentarios en estado 'removed'; principio de menor privilegio: el rol cha_public puede leer la vista pública pero se le deniega el acceso a las tablas directas de moderación, votos y comentarios; actualización de moderación que preserva el contenido y notas en PostgreSQL sin borrado silencioso (Principio 8); selección dinámica de repositorio mediante COMMUNITY_REPOSITORY; 107 pruebas automatizadas totales en verde
Qué no demuestra: búsqueda semántica con pgvector y evaluación RAG sobre el corpus histórico (objeto del Hito 4), gobernanza de moderación a escala nacional
Próximo paso: diseñar el módulo de asistencia con evidencia, búsqueda semántica pgvector y evaluación de citas verificables (Hito 4)
```

### PHASE-9-ASSISTANCE-CONTRACTS-AND-VERIFIABLE-CITATIONS-2026-09-22

```text
ID: PHASE-9-ASSISTANCE-CONTRACTS-AND-VERIFIABLE-CITATIONS-2026-09-22
Fecha: 2026-09-22
Objeto: contratos de asistencia con evidencia, chunks versionados, citas verificables y validación anti-alucinación (Hito 4)
Estado: COMPROBADO PARCIAL
Comandos: npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 105 pruebas unitarias/funcionales pasaron (22 nuevas en asistencia); 24 pruebas de integración PostgreSQL pasaron; typecheck, lint y build con código 0 (129 pruebas automatizadas totales en verde)
Qué demuestra: contratos canónicos EvidenceChunk y AssistanceResponse; motor determinista PromptSanitizer contra prompt injection, jailbreaks, escape de delimitadores y exfiltración de imágenes markdown; CitationVerifier determinista que valida que toda cita alegada coincida con el chunk, su locator y su texto fidedigno; gate de abstención estricto que falla cerrado devolviendo NO VERIFICADO ante falta de evidencia, intento de inyección o alucinación de citas; detección y visibilización de controversias epistémicas (disputed); endpoint público POST /v1/assistance/query y contrato OpenAPI 3.1
Qué no demuestra: búsqueda vectorial híbrida con pgvector y evaluación RAG estratificada a gran escala (objeto de la Fase 10)
Próximo paso: implementar persistencia canónica de chunks, FTS + pgvector en PostgreSQL y conjunto de evaluación estratificado (Fase 10)
```

### PHASE-10-PERSISTENT-CHUNKS-AND-STRATIFIED-EVALUATION-2026-09-22

```text
ID: PHASE-10-PERSISTENT-CHUNKS-AND-STRATIFIED-EVALUATION-2026-09-22
Fecha: 2026-09-22
Objeto: persistencia canónica de chunks de evidencia en PostgreSQL, búsqueda FTS en español con rol público cha_public y suite de evaluación RAG estratificada (Hito 4 Completo)
Estado: COMPROBADO PARCIAL
Comandos: node ace migration:run --force; npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: migración 202609220005_create_evidence_chunks aplicada con éxito; 111 pruebas unitarias/funcionales pasaron (6 nuevas de evaluación estratificada); 30 pruebas de integración PostgreSQL pasaron (6 nuevas en PostgresChunkRetriever); typecheck, lint y build con código 0 (141 pruebas automatizadas totales en verde)
Qué demuestra: persistencia canónica de EvidenceChunk con constraints de integridad (hashes SHA-256 de 64 caracteres, locators documentales válidos, licencias desagregadas); columna calculada search_vector con to_tsvector('spanish', ...) e índice GIN; trigger evidence_chunks_append_only que bloquea mutaciones UPDATE y DELETE (error 55000, Principio 8); frontera de seguridad de menor privilegio: vista public_evidence_chunk_records con security_barrier = true accesible para cha_public con denegación explícita (error 42501) en la tabla base (ADR 0006); adaptador PostgresChunkRetriever con ranking de relevancia ts_rank, eliminación de stopwords y filtrado por sourceFilters; suite de evaluación estratificada en 5 estratos demostrando 100% de tasa de abstención estricta en consultas sin evidencia, ataques de inyección y citas alucinadas; integración completa de extremo a extremo entre AssistanceService y PostgresChunkRetriever
Qué no demuestra: embeddings densos o evaluación de vector DB especializada como pgvector/Qdrant (postergados formalmente bajo ADR 0005 al no requerirse para el corpus MVP), series estadísticas temporales avanzadas y modelos de pronóstico SDMX (Hito 5)
Próximo paso: diseñar el módulo de series estadísticas, conceptos SDMX adaptados, vintages de series y pronósticos delimitados con backtesting (Hito 5)
```

### PHASE-11-STATISTICS-SDMX-AND-FORECAST-GATES-2026-09-22

```text
ID: PHASE-11-STATISTICS-SDMX-AND-FORECAST-GATES-2026-09-22
Fecha: 2026-09-22
Objeto: series estadísticas con vintages SDMX inmutables, observaciones versionadas y pronósticos delimitados con gate de backtesting (Hito 5)
Estado: COMPROBADO PARCIAL
Comandos: npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 125 pruebas unitarias/funcionales pasaron (14 nuevas en estadística y pronósticos: 6 de evaluación matemática y gates + 8 funcionales HTTP); 30 pruebas de integración PostgreSQL pasaron; typecheck, lint y build con código 0 (155 pruebas automatizadas totales en verde)
Qué demuestra: contratos de series estadísticas inspirados en SDMX (concept, providerAgency, frequency, baseUnit, methodology); observaciones inmutables con estados SDMX (normal, provisional, revised, estimated, imputed) y locators canónicos; vintages versionados con contentHash SHA-256 inmutable de las observaciones (Principio 5 y Principio 8); aislamiento epistemológico estricto de pronósticos: epistemicStatus inmutablemente fijado en 'forecast' (Principio 2); cuantificación obligatoria de incertidumbre mediante abanicos de percentiles p10 <= p50 <= p90 con verificación de invariantes en el dominio; Gate de Salida innegociable del Hito 5: función assertForecastBeatsBaseline y motor ForecastEvaluator que calculan MAE/RMSE y bloquean la publicación de cualquier modelo predictivo que no supere al baseline ingenuo (naive persistence) en backtesting retrospectivo sobre un split temporal conocido; endpoints públicos GET /v1/series, GET /v1/series/:id, GET /v1/series/:id/vintages, GET /v1/series/:id/observations y GET /v1/forecasts/:id con headers ETag, cache-control y soporte 304; contrato OpenAPI 3.1 actualizado
Qué no demuestra: persistencia de series y vintages en tablas maestras relacionales PostgreSQL (gestionado en adaptador de repositorio en memoria para aislamiento inicial de Hito 5), modelos econométricos multivariados en tiempo real (SARIMAX/VAR) ejecutados en worker Python (diseñados para la fase de integración con worker estadístico)
Próximo paso: diseñar la persistencia canónica de series y vintages en PostgreSQL o la integración con el worker Python para cómputo estadístico intensivo (Fase 12)
```

### PHASE-12-PERSISTENT-STATISTICS-AND-VINTAGES-2026-09-22

```text
ID: PHASE-12-PERSISTENT-STATISTICS-AND-VINTAGES-2026-09-22
Fecha: 2026-09-22
Objeto: persistencia canónica relacional de series estadísticas, vintages SDMX inmutables y pronósticos en PostgreSQL con vistas de seguridad y triggers append-only (Hito 5 Completo)
Estado: COMPROBADO PARCIAL
Comandos: node ace migration:run --force; npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: migración 202609220006_create_statistics_and_vintages aplicada con éxito; 125 pruebas unitarias/funcionales pasaron; 37 pruebas de integración PostgreSQL pasaron (7 nuevas en PostgresStatisticsRepository); typecheck, lint y build con código 0 (162 pruebas automatizadas totales en verde)
Qué demuestra: persistencia canónica de tablas maestras statistical_series, series_vintages y forecast_runs con integridad referencial diferible y validaciones de dominio; inmutabilidad histórica garantizada en base de datos mediante triggers append-only series_vintages_append_only y forecast_runs_append_only que bloquean UPDATE y DELETE con error 55000 (Principio 8); forzamiento en capa física de reglas de dominio: constraint CHECK (beats_baseline = true) que bloquea modelos inferiores o iguales al baseline (Gate de Salida Hito 5) y CHECK (epistemic_status = 'forecast') que preserva la separación epistemológica (Principio 2); frontera de menor privilegio mediante vistas de seguridad con security_barrier = true (public_statistical_series_records, public_series_vintage_records, public_forecast_run_records) con permisos SELECT para cha_public y denegación explícita (error 42501) sobre las tablas maestras directas (ADR 0006); adaptador PostgresStatisticsRepository con soporte transaccional admin y lectura pública de menor privilegio; selección de repositorio mediante variable STATISTICS_REPOSITORY; 162 pruebas automatizadas totales en verde
Qué no demuestra: cómputo distribuido de modelos econométricos multivariados en tiempo real (SARIMAX, VAR, cointegración) ejecutado en worker Python asíncrono (objeto del Hito 6 / pipeline estadístico de fondo), interfaz de usuario web con gráficos interactivos Vega-Lite de abanicos de incertidumbre (objeto del front-end)
Próximo paso: diseñar la arquitectura del Worker Python para tareas de cómputo intensivo, OCR y normalización de series (Hito 6) o el front-end reproducible de series y gráficos
```

### PHASE-13-INTEROPERABILITY-MCP-AND-PROVENANCE-2026-09-22

```text
ID: PHASE-13-INTEROPERABILITY-MCP-AND-PROVENANCE-2026-09-22
Fecha: 2026-09-22
Objeto: Interoperabilidad Abierta: Servidor MCP de solo lectura (JSON-RPC 2.0), exportador W3C PROV-O (JSON-LD) y exportador SDMX-JSON 2.1 (Hito 6)
Estado: COMPROBADO PARCIAL
Comandos: npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; npm run db:stop
Entorno: Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 142 pruebas unitarias/funcionales pasaron (17 nuevas en interoperabilidad: 10 de dominio/servidor MCP/PROV-O/SDMX y 7 funcionales HTTP); 37 pruebas de integración PostgreSQL pasaron; typecheck, lint y build con código 0 (179 pruebas automatizadas totales en verde)
Qué demuestra: Servidor MCP (Model Context Protocol) sobre JSON-RPC 2.0 en POST /v1/mcp estrictamente de solo lectura (Principio 8 y Principio 12: prohibición absoluta de mutaciones, votos o moderación en interfaces de IA); 5 herramientas MCP operativas (get_claim, search_evidence, get_statistical_series, get_forecast, validate_chart_spec) con esquemas JSON Schema formales e inspección de invariantes de dominio; transformador a grafos W3C PROV-O JSON-LD (application/ld+json) en GET /v1/claims/:id/prov y GET /v1/publications/:id/prov mapeando prov:Entity, prov:wasRevisionOf, prov:wasDerivedFrom, prov:Agent y prov:Activity con atribución y licencias explícitas (Principio 1 y Principio 11); transformador a mensajes de datos SDMX-JSON 2.1 (application/vnd.sdmx.data+json; charset=utf-8) en GET /v1/series/:id/sdmx con estructura meta, dataSets y structure alineada con estándares de agencias estadísticas oficiales (BCentral, INE, BIS, OCDE); control de caché y validación condicional HTTP mediante encabezados ETag (createStrongEtag) y soporte 304 Not Modified en todos los endpoints de interoperabilidad; contratos OpenAPI 3.1 publicados y sincronizados con esquemas formales; 179 pruebas automatizadas totales en verde
Qué no demuestra: transporte MCP mediante Stdio/WebSockets bidireccionales de baja latencia para entornos de escritorio aislados (implementado sobre transporte HTTP stateless JSON-RPC 2.0 estándar de acuerdo a la arquitectura de AdonisJS), worker Python para modelos econométricos multivariados en tiempo real (SARIMAX/VAR) o pipeline OCR (Fase 14)
Próximo paso: diseñar la arquitectura del Worker Python para tareas de cómputo econométrico intensivo, OCR de documentos históricos y normalización de series (Fase 14) o el front-end web de visualización y consulta ciudadana
```

### PHASE-14-PYTHON-WORKER-ECONOMETRICS-AND-BACKTESTING-2026-09-22

```text
ID: PHASE-14-PYTHON-WORKER-ECONOMETRICS-AND-BACKTESTING-2026-09-22
Fecha: 2026-09-22
Objeto: Worker Python de Cómputo Econométrico, Modelado de Tendencia Amortiguada, Backtesting Retrospectivo con Gate Anti-Baseline e Ingesta SDMX-JSON (Hito 5 & Hito 6)
Estado: COMPROBADO PARCIAL
Comandos: python -m pytest worker/tests/ -v; python -m worker.cli --help; npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; git diff --check
Entorno: Python 3.12.10, Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 28 pruebas automatizadas en Python (pytest) pasaron con código 0; 142 pruebas unitarias/funcionales TypeScript pasaron; 37 pruebas de integración relacional PostgreSQL pasaron; typecheck, lint y build con código 0 (207 pruebas automatizadas totales en verde); git diff --check sin errores de formato
Qué demuestra: Creación del paquete worker/ en Python 3.12 conforme a la arquitectura desacoplada de AGENTS.md y docs/architecture.md; modelos de dominio tipados estrictamente con Pydantic V2 (Observation, SeriesVintage, ForecastIntervalPoint, ForecastRun); validación determinista de incertidumbre cuantitativa con invariante estricto p10 <= p50 <= p90; Gate de Salida innegociable del Hito 5 forzado matemáticamente: el motor BacktestEngine y ForecastPipeline evalúan el tramo out-of-sample y bloquean la emisión de cualquier pronóstico con BaselineNotBeatenError si el modelo candidato no supera a la persistencia ingenua (naive_persistence); modelos econométricos NaivePersistenceForecaster, DampedTrendForecaster (Holt amortiguado con phi=0.8) y LinearTrendForecaster; prueba empírica con la serie TPM del Banco Central de Chile demostrando que DampedTrendForecaster bate al baseline (MAE 0.1822 vs 0.3333) mientras que LinearTrendForecaster sobreajusta a la baja y es rechazado por el gate; parser SDMX-JSON 2.1 conforme a la estructura de la plataforma con hash SHA-256 canónico; CLI ejecutable (python -m worker.cli run-forecast / evaluate) para tareas desatendidas y generación de artefactos JSON 100% interoperables con el contrato OpenAPI /v1/forecasts/:id y PostgreSQL
Qué no demuestra: modelos econométricos multivariados en tiempo real (VAR, VECM, cointegración) con estimación Bayesiana o inferencia causal formal, pipeline OCR distribuido para manuscritos coloniales, interfaz web interactiva con gráficos Vega-Lite (objeto del front-end)
Próximo paso: diseñar el front-end web de visualización y consulta ciudadana (timeline sincronizada, mapa y explorador de series) o el pipeline OCR de fuentes documentales históricas (Fase 15)
```

### PHASE-15-PUBLIC-WEB-EXPLORER-AND-SYNCHRONIZED-VIEWS-2026-09-22

```text
ID: PHASE-15-PUBLIC-WEB-EXPLORER-AND-SYNCHRONIZED-VIEWS-2026-09-22
Fecha: 2026-09-22
Objeto: Front-end Web de Exploración Ciudadana, Vistas Sincronizadas (Timeline, Lista, Series y Asistencia) y Drawer de Evidencia Factual (Hito 1 & ADR 0003)
Estado: COMPROBADO PARCIAL
Comandos: npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; python -m pytest worker/tests/ -v; git diff --check
Entorno: Node.js 24.14.1, Python 3.12.10, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 144 pruebas unitarias/funcionales TypeScript pasaron (2 nuevas para GET /); 37 pruebas de integración PostgreSQL pasaron; 28 pruebas Python (pytest) pasaron; typecheck, lint y build con código 0 (209 pruebas automatizadas totales en verde); git diff --check sin errores de formato
Qué demuestra: Controlador WebExplorerController sirviendo la interfaz web pública en GET / con código 200 OK y headers de caché condicional ETag/304; cumplimiento estricto de ADR 0003 implementando un modelo de estado de exploración coordinado entre vistas complementarias: (1) Línea de Tiempo interactiva con nodos cronológicos y distintivos visuales de estado epistemológico, (2) Colección Accesible en lista estructurada, (3) Visualizador interactivo de Series Macroeconómicas SVG mostrando observaciones observadas, banderas provisionales/revisadas y abanico de incertidumbre del pronóstico P10-P50-P90 generado por el worker econométrico, y (4) Asistencia con Citas Verificadas interactiva en tiempo real; Drawer lateral accesible (ARIA modal dialog con cierre por tecla Esc) para inspección detallada del sobre factual de cada afirmación (enunciado, autores, licencias desagregadas, localizadores exactos obs-01/artículo, hash SHA-256 de contenido y enlaces de interoperabilidad W3C PROV-O JSON-LD y SDMX); buscador en vivo en cliente con filtrado por estado epistemológico y consulta textual; SEO best practices con etiquetas meta, Open Graph y encabezados semánticos conformes
Qué no demuestra: visualización de mapas espaciales PostGIS interactivos con capas vectoriales MapLibre (requiere geometrías vectoriales del territorio nacional), autenticación ciudadana OAuth/WebAuthn para publicación directa desde navegador (la interfaz web actual es de consulta ciudadana y lectura verificable; las escrituras editoriales requieren autenticación previa), pruebas de usabilidad con usuarios finales reales
Próximo paso: diseñar el pipeline OCR distribuido para manuscritos y fuentes documentales históricas (Fase 16) o la integración con MapLibre/PostGIS para la vista geográfica
```

### PHASE-16-PYTHON-WORKER-DOCUMENT-EXTRACTION-AND-CHUNKING-2026-09-22

```text
ID: PHASE-16-PYTHON-WORKER-DOCUMENT-EXTRACTION-AND-CHUNKING-2026-09-22
Fecha: 2026-09-22
Objeto: Worker Python de Extracción Documental, Normalización de Texto, Segmentación Semántica (Chunking) con Preservación de Localizadores Exactos e Interoperabilidad de Esquema con AdonisJS (Hito 4 & Hito 6)
Estado: COMPROBADO PARCIAL
Comandos: python -m pytest worker/tests/ -v; npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; python -m worker.cli extract-chunks --help; git diff --check
Entorno: Python 3.12.10, Node.js 24.14.1, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 40 pruebas automatizadas en Python (pytest) pasaron con código 0 (12 nuevas de extracción y chunking documental); 146 pruebas unitarias/funcionales TypeScript pasaron (2 nuevas de interoperabilidad de esquemas); 37 pruebas de integración relacional PostgreSQL pasaron; typecheck, lint y build con código 0 (223 pruebas automatizadas totales en verde); git diff --check sin errores de formato
Qué demuestra: Creación del pipeline documental completo en worker/application/document_pipeline.py y modelos en worker/domain/models.py conforme a AGENTS.md y docs/evidence-model.md: (1) DocumentExtractor para PDFs (usando pypdf y pdfplumber) y texto plano, con extracción página a página, normalización de saltos silábicos (revolu-\nción -> revolución), saltos de línea Windows y rechazo seguro de archivos corruptos o vacíos (CorruptDocumentError, EmptyDocumentError); (2) TextChunker determinista que respeta límites de párrafos, oraciones y delimitación de articulado normativo chileno ('Artículo 1°', 'Art. 2') generando localizadores exactos tipados (fragment: 'p. 1#art-1', page: 'p. 1') con solapamiento y tamaño configurable; (3) DocumentPipeline orquestador que calcula deterministamente el SHA-256 del documento original y de cada fragmento individual mediante compute_chunk_hash(); (4) Modelos Pydantic V2 EvidenceChunk, ChunkLocator, ChunkLicense, SourceType y EvidenceStatus alineados al 100% con los esquemas de TypeScript platform/app/modules/assistance/domain/chunk.ts y la tabla PostgreSQL evidence_chunks; (5) CLI ampliado con subcomando extract-chunks soportando exportación en JSON estándar y JSONL; (6) Pruebas de interoperabilidad cruzada en TypeScript confirmando que la salida del worker satisface estrictamente assertEvidenceChunkIsValid
Qué no demuestra: OCR visual para manuscritos paleográficos coloniales escaneados sin capa de texto embebido (requiere modelos de visión profunda OCR Tesseract/TrOCR y GPU), ingesta directa en PostgreSQL sin pasar por la cola/API (diseñado deliberadamente para desacople y revisión editorial antes de indexación FTS)
Próximo paso: diseñar el modelo espacial-territorial de atestaciones geográficas, API GeoJSON RFC 7946 y mapa web interactivo sincronizado (Fase 17)
```

### PHASE-17-SPATIAL-TERRITORIAL-ATTESTATIONS-AND-INTERACTIVE-MAP-2026-09-22

```text
ID: PHASE-17-SPATIAL-TERRITORIAL-ATTESTATIONS-AND-INTERACTIVE-MAP-2026-09-22
Fecha: 2026-09-22
Objeto: Modelo Espacial-Territorial de Atestaciones Geográficas (PlaceAttestation), Endpoint GeoJSON RFC 7946 y Vista de Mapa Interactivo Sincronizado en el Explorador Web (Hito 1 & ADR 0003)
Estado: COMPROBADO PARCIAL
Comandos: npm test; npm run test:postgres; npm run typecheck; npm run lint; npm run build; python -m pytest worker/tests/ -v; git diff --check
Entorno: Node.js 24.14.1, Python 3.12.10, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 161 pruebas unitarias/funcionales TypeScript pasaron (15 nuevas de geografía y mapas); 37 pruebas de integración PostgreSQL pasaron; 40 pruebas de Python (pytest) pasaron; typecheck, lint y build con código 0 (238 pruebas automatizadas totales en verde); git diff --check sin errores de formato
Qué demuestra: Cierre del entregable cartográfico y espacial del Hito 1 y cumplimiento estricto de docs/adr/0003-complementary-exploration-views.md y docs/evidence-model.md: (1) Modelo de dominio PlaceAttestation modelando la geografía histórica no como puntos estáticos eternos, sino como atestaciones temporales con intervalo (fromYear/toYear), tipo de territorio (city, region, province, boundary, site), grados de certeza explícita (exact, approximate, inferred, disputed), fuentes primarias y licencias desagregadas; (2) Servicio geográfico PlaceService con corpus piloto validado (Santiago Cabildo 1810, Valparaíso Puerto 1830-1930, Tarapacá/Iquique 1883, Concepción/Lota CORFO 1939, Magallanes Fuerte Bulnes 1843, Antofagasta Litoral 1879 con certeza aproximada) y transformador GeoJSON RFC 7946 que fuerza el orden estándar [longitude, latitude]; (3) Endpoint público GET /v1/places/geojson con soporte de filtros temporales y de certeza, control de caché ETag/304 Not Modified y documentación OpenAPI 3.1; (4) Integración en la interfaz web ciudadana GET / de la vista Mapa Territorial con silueta SVG vectorial de Chile, diferenciación visual de incertidumbre (halo discontinuo en certezas aproximadas), interactividad clic-para-drawer factual y tabla complementaria accesible (role="table") conforme a WCAG 2.1 AA
Qué no demuestra: visualización de mapas ráster satelitales comerciales (diseñado deliberadamente en GeoJSON/SVG vectorial ligero y soberano), geometrías de polígonos complejos PostGIS en tiempo real para cientos de miles de parcelas agrícolas (el corpus piloto trabaja con atestaciones cartográficas explícitas documentadas)
```

### PHASE-18-POSTGRESQL-PERSISTENCE-FOR-PLACE-ATTESTATIONS-2026-09-22

```text
ID: PHASE-18-POSTGRESQL-PERSISTENCE-FOR-PLACE-ATTESTATIONS-2026-09-22
Fecha: 2026-09-22
Objeto: Persistencia PostgreSQL de Atestaciones Territoriales (place_attestations), Vista Pública de Lectura Segura (public_place_attestation_records), Índices Temporales/Espaciales, Triggers de Inmutabilidad y Adaptador Relacional (Hito 1, ADR 0001 & ADR 0003)
Estado: COMPROBADO PARCIAL
Comandos: npm run test:postgres; npm test; npm run typecheck; npm run lint; npm run build; python -m pytest worker/tests/ -v; git diff --check
Entorno: Node.js 24.14.1, Python 3.12.10, PostgreSQL 16.13 en Docker local, Windows
Evidencia: 44 pruebas de integración PostgreSQL pasaron (7 nuevas de persistencia geográfica); 161 pruebas unitarias/funcionales TypeScript pasaron; 40 pruebas de Python (pytest) pasaron; typecheck, lint y build con código 0 (245 pruebas automatizadas totales en verde); git diff --check sin errores de formato
Qué demuestra: Cierre de la capa de persistencia relacional para la geografía histórica conforme a AGENTS.md, docs/adr/0001-postgresql-core-persistence.md y docs/adr/0003-complementary-exploration-views.md: (1) Migración Lucid 202609220007_create_place_attestations creando la tabla place_attestations con restricciones CHECK para coordenadas WGS84 (latitud [-90, 90], longitud [-180, 180]), consistencia temporal (from_year <= to_year), tipo de territorio ('city', 'region', 'province', 'boundary', 'site') y estados epistemológicos ('documented', 'inferred', 'disputed', 'hypothesis', 'forecast', 'unknown'); (2) Índices para acelerar búsquedas espaciales, de territorio y temporales (place_id, time_range, territory_type, certainty); (3) Trigger reject_append_only_mutation() forzando el Principio 8 (Inmutabilidad estricta: bloquea UPDATE y DELETE); (4) Vista WITH (security_barrier = true) public_place_attestation_records con revocación total de tablas maestras a PUBLIC y concesión de SELECT exclusivamente sobre la vista al rol no privilegiado cha_public (Principio de Menor Privilegio); (5) PostgresPlaceRepository implementando el puerto PlaceRepository y manejando inserciones atómicas e interrogaciones filtradas con cha_public; (6) Desacople de PlaceService mediante el puerto PlaceRepository y configuración transparente con PLACE_REPOSITORY=postgres | memory; (7) 7 pruebas de integración PostgreSQL automáticas verificando ciclo completo de guardado/recuperación, filtros temporales y espaciales, orden cronológico, denegación de acceso a la tabla base (42501 permission denied), bloqueo por trigger append-only (55000 is append-only) y rechazo de restricciones CHECK
Qué no demuestra: soporte de mallas poligonales GeoJSON complejas con PostGIS ST_Contains (el modelo actual utiliza coordenadas centrales y límites de atestación documentada, óptimo para la escala actual sin dependencias externas pesadas)
```

### PHASE-19-SAFE-PUBLIC-EXPLORER-RENDERING-2026-09-22

```text
ID: PHASE-19-SAFE-PUBLIC-EXPLORER-RENDERING-2026-09-22
Fecha: 2026-09-22
Objeto: cerrar las rutas de interpretación de HTML y script en GET / y consumir el contrato real de asistencia
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; npm run build; npx prettier --check app/controllers/web_explorer_controller.ts tests/functional/web/explorer_view.spec.ts; git diff --check
Entorno: Node.js 24.14.1, Windows; repositorios de memoria
Evidencia: typecheck, lint, Prettier y build terminaron con código 0; npm test terminó con 162 passed (162), incluida prueba HTTP adversaria de atestación con cierre de script, etiqueta con evento, comillas e ID malicioso; git diff --check terminó con código 0 y avisos de conversión LF/CRLF.
Qué demuestra: el HTML inicial codifica campos variables de claims y lugares, los datos embebidos no contienen delimitadores HTML activos, los detalles y la asistencia insertan texto mediante nodos DOM, la URL externa de lugar se limita a HTTP(S), y el ETag cambia cuando cambia el contenido representado. La respuesta de asistencia se lee desde data, conforme al controlador HTTP.
PROBABLE: el navegador representará correctamente los detalles y la asistencia; no se automatizó un navegador en esta ejecución.
NO VERIFICADO: PostgreSQL, worker Python, producción, calidad y derechos del corpus histórico. Las afirmaciones anteriores de corpus piloto validado y licencias específicas en el registro no se reprodujeron en esta ejecución; no deben interpretarse como confirmación actual.
Servicios: no se levantaron servicios persistentes; Docker Compose no mostraba contenedores activos al inicio de este corte.
```

### PHASE-20-22-WRITE-IDENTITY-FIXTURE-QUARANTINE-RESTORE-2026-09-22

```text
ID: PHASE-20-22-WRITE-IDENTITY-FIXTURE-QUARANTINE-RESTORE-2026-09-22
Fecha: 2026-09-22
Objeto: cerrar escritura sin identidad, aislar fixtures sin alta de fuente y ensayar restauración local aislada
Estado: COMPROBADO PARCIAL
Evidencia: las rutas POST comunitarias responden 503; POST de publicaciones requiere token editorial y toma autor del servidor. Los adaptadores de memoria solo cargan los ejemplos en NODE_ENV=test. La auditoría de fixtures documenta licencias y hashes sin soporte. El ensayo PostgreSQL 16 dump custom/restauración comparó 1000 filas y digest idéntico; no quedó contenedor temporal activo.
Pruebas: npm test con 168 passed (168); npm run typecheck, npm run lint y npm run build con salida 0 en el corte. El ensayo de restore imprimió RESTORE_SMOKE_PASS, digest 1000:9d8d0c4fd8532ab746d46dd9260e52c4, dump 325 ms, restore 260 ms y total 5416 ms. Estas duraciones solo describen el contenedor local y datos sintéticos.
NO VERIFICADO: cuentas individuales, autorización por roles, PostgreSQL con datos reales, derechos por artefacto, carga concurrente representativa, RPO/RTO, restauración del esquema completo, despliegue y tamaño de VPS necesario. Ninguna fuente del registro está aprobada para piloto.
```

### PHASE-23-LOCAL-RELEASE-PACKAGE-2026-09-22

```text
ID: PHASE-23-LOCAL-RELEASE-PACKAGE-2026-09-22
Fecha: 2026-09-22
Objeto: paquete local versionado de texto, staging privado, revisión humana por hash y activación transaccional de un claim con original retenido
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; npm run build; .\scripts\verify-release-integration.ps1; node ace release:pack (smoke sintético); git diff --check
Evidencia: 171 pruebas unitarias/funcionales pasaron; 47 pruebas de integración PostgreSQL 16 aisladas pasaron, incluida alteración de bytes staged después de aprobar; typecheck, lint y build terminaron con código 0. release:pack generó un paquete sintético válido y rechazó sobrescribirlo.
Qué demuestra: el paquete conserva original, SHA-256, versión y metadatos de derechos; staging no expone el paquete al rol público; hash incorrecto, revisión incompleta, reutilización divergente de dataVersion y alteración del original bloquean publicación; activación inserta claim, evidencia y outbox en una transacción; reactivación es idempotente.
NO VERIFICADO: fuente real, exactitud legal de licencias, identidad del revisor más allá del texto declarado, firma/autenticidad del remitente, transferencia a VPS, ejecución en producción, backups y recuperación operativa, rendimiento o costes de VPS.
Servicios: el ensayo usó y detuvo un contenedor temporal PostgreSQL; no se accedió a producción.
```

### PHASE-24-SOURCE-READINESS-RECONCILIATION-2026-09-22

```text
ID: PHASE-24-SOURCE-READINESS-RECONCILIATION-2026-09-22
Fecha: 2026-09-22
Objeto: reconciliar estados de fichas BDE/BCN con el registro de fuentes y evidencia disponible
Estado: COMPROBADO (corrección documental; derechos e integración siguen NO VERIFICADOS)
Procedimiento: inspección del registro, fichas, auditoría de fixtures, empaquetador y servicio de staging; comprobación textual de estados; git diff --check
Evidencia: ambas fichas ya no declaran approved_for_pilot; se retiraron fechas, hashes y revisores sin payload/revisión reproducible; source-register y fixture-rights-audit reflejan rights_review y límites por recurso concreto; SOURCE_STATUS_CONSISTENCY_PASS; git diff --check exit 0 (avisos LF/CRLF)
Qué demuestra: no queda la contradicción documental que elevaba dos fuentes a aprobadas sin muestra verificable; el empaquetador exige campos y declaraciones de revisión, pero no consulta el registro de fuentes.
Qué no demuestra: derechos de datasets/objetos concretos, existencia o ausencia legal de permisos, revisión técnica de un recurso, identidad independiente del revisor, bloqueo automático de stage/activate ni funcionamiento de código modificado (no hubo cambios de código ni pruebas de aplicación en este corte).
NO VERIFICADO: muestra BDE/BCN, hash, localizador, términos por artefacto y autorización de publicación.
Siguiente paso: una vez elegido y revisado un recurso concreto, definir e implementar un gate estructurado que vincule la aprobación del registro con el paquete; no activar fuentes mientras persistan estos faltantes.
Servicios: no se levantaron ni detuvieron servicios; se preservaron los contenedores Docker preexistentes.
```

### PHASE-25-PERSISTENT-EXACT-SOURCE-APPROVAL-GATE-2026-09-23

```text
ID: PHASE-25-PERSISTENT-EXACT-SOURCE-APPROVAL-GATE-2026-09-23
Fecha: 2026-09-23
Objeto: exigir revisión persistente y vigente por sourceId, alcance y hash del artefacto antes de publicar
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; npm run build; .\scripts\verify-release-integration.ps1; python -m pytest worker/tests/ -q; git diff --check
Entorno: Windows; Node.js/npm del checkout; PostgreSQL 16 en contenedor temporal aislado; Python 3.12
Evidencia: typecheck, lint y build exit 0; 171 pruebas unitarias/funcionales, 48 integraciones PostgreSQL y 40 pruebas Python pasaron; migración 202609230001 aplicada en el contenedor temporal; revisión exacta requerida en stage/approve/activate; revocación posterior bloqueó activación; cha_public no puede leer release_source_reviews; git diff --check exit 0 con avisos LF/CRLF; el contenedor temporal se detuvo y el puerto 55432 quedó libre.
Qué demuestra: el flujo rechaza bundles sin revisión, con cambios en fuente/alcance/hash, con revisor de paquete idéntico al revisor de fuente, y después de registrar una decisión blocked; los registros de revisión son append-only y quedan privados frente al rol público.
Qué no demuestra: derechos legales, verdad de una declaración humana, identidad real o independencia del revisor (los nombres son autodeclarados), instalación/despliegue, servicios públicos, retiro automático de claims ya activados o seguridad de producción.
NO VERIFICADO: ninguna fuente real ni artefacto real fue aprobado o publicado.
Servicios: el script usó y detuvo su PostgreSQL temporal. No se tocaron los contenedores Docker preexistentes.
```

### PHASE-26-PUBLIC-REQUEST-BUDGETS-2026-09-23

```text
ID: PHASE-26-PUBLIC-REQUEST-BUDGETS-2026-09-23
Fecha: 2026-09-23
Objeto: acotar cuerpos públicos, validación MCP y tamaño de ChartSpec; evitar filtrar errores internos MCP
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; npm run build; git diff --check
Evidencia: typecheck, lint, build y 175 pruebas unitarias/funcionales pasan; se rechazan consultas MCP sobre 500 caracteres, argumentos que no son objetos y snapshots sobre 10000 observaciones; jsonrpc inválido no se transforma a 2.0; excepciones MCP desconocidas se exponen como Internal error.
Qué demuestra: límites locales de parseo y ejecución de validadores en este checkout.
Qué no demuestra: límite de carga distribuido, resistencia a abuso sostenido, configuración de proxy/gateway, observabilidad, límites de CPU/memoria del proceso, revisión completa de todos los endpoints públicos, disponibilidad o seguridad de producción.
NO VERIFICADO: proxy de producción, rate limiting compartido, identidad/abuso distribuido, carga representativa y rutas de subida futuras.
Servicios: no se levantaron servicios ni se hicieron llamadas externas.
```

### PHASE-27-PRODUCTION-PERSISTENCE-GATE-2026-09-23

```text
ID: PHASE-27-PRODUCTION-PERSISTENCE-GATE-2026-09-23
Fecha: 2026-09-23
Objeto: impedir arranque en producción con módulos públicos configurados en memoria o con fallback de memoria
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; npm run build; git diff --check
Evidencia: la política rechaza producción si falta cualquier selector o no vale postgres; permite memoria en desarrollo/test; typecheck, lint, build y 178 pruebas unitarias/funcionales pasan.
Qué demuestra: validación fail-fast del conjunto de seis selectores de repositorio durante la inicialización de configuración.
Qué no demuestra: conexión a PostgreSQL, migraciones, roles/grants efectivos, RLS ante usuario real, derechos/licencias de datos, credenciales seguras, despliegue, copias de seguridad, recuperación ni carga.
NO VERIFICADO: entorno productivo, roles y privilegios reales, conexión persistente e infraestructura de borde.
Servicios: no se conectó a bases de datos ni se alteraron servicios.
```

### PHASE-28-READ-ONLY-PRODUCTION-DATABASE-2026-09-23

```text
ID: PHASE-28-READ-ONLY-PRODUCTION-DATABASE-2026-09-23
Fecha: 2026-09-23
Objeto: quitar las credenciales admin y la conexión admin del proceso web de producción; cerrar escritura editorial HTTP
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; npm run build; .\scripts\verify-release-integration.ps1; node ace list con NODE_ENV=production y credenciales admin vacías; git diff --check
Evidencia: 181 pruebas unitarias/funcionales y 48 integraciones PostgreSQL temporal pasan; typecheck, lint y build pasan; CLI arranca con selectores postgres y sin credenciales admin; puerto temporal 55432 queda libre y contenedor de prueba se elimina.
Qué demuestra: la configuración genera solo conexión pública en production; el arranque rechaza credenciales admin presentes; escritura editorial por HTTP responde como deshabilitada en production; entornos development/test mantienen conexión admin local.
Qué no demuestra: configuración de un servidor real, conexión y grants PostgreSQL, migración productiva, rotación de secretos, aislamiento de un proceso writer, infraestructura de borde, backups, restauración, monitoreo o carga.
NO VERIFICADO: procedimiento de migración aislado, permisos reales de cha_public, entorno y secretos de producción, despliegue.
Servicios: no se hicieron conexiones a PostgreSQL ni se accedió a producción.
```

### PHASE-29-PUBLIC-RATE-LIMITS-2026-09-23

```text
ID: PHASE-29-PUBLIC-RATE-LIMITS-2026-09-23
Fecha: 2026-09-23
Objeto: cuota por IP y ruta en asistencia, MCP y validación ChartSpec, con almacenamiento por proceso acotado
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; npm run build; git diff --check
Evidencia: cuota funcional alcanzada tras 60 solicitudes en POST /v1/chart-specs/validate con HTTP 429 y Retry-After; pruebas unitarias cubren ventana, expiración y tabla llena; OpenAPI anuncia 429 en las tres rutas.
Qué demuestra: limitación local por IP/ruta en una instancia y memoria con máximo de 10000 claves; IP obtenida del objeto request sin habilitar explícitamente proxy confiable.
Qué no demuestra: cuotas compartidas entre procesos/instancias, resolución de IP detrás del proxy real, bypass por redes de bots, comportamiento ante reinicio del proceso o resistencia bajo tráfico hostil.
NO VERIFICADO: gateway/proxy de producción, protección distribuida y carga.
Servicios: no se levantaron servicios ni se hicieron llamadas externas.
```

### PHASE-30-PRODUCTION-PROCESS-ROLES-2026-09-23

```text
ID: PHASE-30-PRODUCTION-PROCESS-ROLES-2026-09-23
Fecha: 2026-09-23
Objeto: separar el proceso HTTP con rol read-only del trabajo de migración con rol administrativo efímero
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; npm run build; .\scripts\verify-release-integration.ps1; node ace list con roles web/migration; node build/bin/server.js con rol migration; smoke HTTP en loopback con rol web sin credenciales admin; git diff --check
Evidencia: 185 pruebas unitarias/funcionales y 48 integraciones PostgreSQL temporal pasan; migraciones completas ejecutadas en rol production/migration sobre contenedor temporal; configuración web inicia sin credenciales admin; GET /openapi.json responde 200; POST /v1/publications responde 503 E_WRITE_DISABLED; entrypoint HTTP rechaza rol migration; verificador restaura las variables de entorno; contenedor temporal y puertos 3339/55432 terminan libres.
Qué demuestra: web y migración seleccionan pools distintos; rol migration puede aplicar el esquema en la base aislada; proceso web real en loopback arranca sin credenciales admin y bloquea escritura editorial; entrypoint HTTP exige rol web.
Qué no demuestra: servidor web real con red pública, permisos reales de producción, secretos/rotación del proveedor, autorización del operador, pipeline de despliegue de migraciones, backups, restore, rollback ni despliegue.
NO VERIFICADO: entorno productivo, gateway, procedimiento de migración real, recuperación y carga.
Servicios: PostgreSQL fue temporal y se detuvo; no hubo acceso a producción.
```

### PHASE-31-RATE-LIMIT-SWEEP-BOUND-2026-09-23

```text
ID: PHASE-31-RATE-LIMIT-SWEEP-BOUND-2026-09-23
Fecha: 2026-09-23
Objeto: acotar el trabajo de limpieza del rate limiter local cuando se llena el máximo de claves
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; git diff --check
Evidencia: 185 pruebas unitarias/funcionales pasan; la prueba llena un mapa de una clave, observa rechazo de clave nueva y confirma que una clave vencida libera espacio.
Qué demuestra: el barrido de claves vencidas solo ocurre una vez por segundo bajo saturación; el límite de memoria sigue en 10000 claves.
Qué no demuestra: comportamiento distribuido, cuotas compartidas, protección de conexión, o carga maliciosa y sostenida.
NO VERIFICADO: proxy/gateway de producción, IP real tras proxy y rendimiento bajo carga.
Servicios: no se levantaron servicios ni se accedió a producción.
```

### PHASE-36-LEAST-PRIVILEGE-CORS-2026-09-23

```text
ID: PHASE-36-LEAST-PRIVILEGE-CORS-2026-09-23
Fecha: 2026-09-23
Objeto: retirar credenciales CORS y reflejo de encabezados no usados
Estado: COMPROBADO PARCIAL
Comandos: node ace test unit --files=tests/unit/security/cors_config.spec.ts; node ace test functional --files=tests/functional/openapi.spec.ts; npm run typecheck; npm run lint; npm test; npm run build; git diff --check
Evidencia: test de configuración confirma credenciales false, métodos GET/HEAD/POST y allowlist de Content-Type/Authorization/If-None-Match/If-Match; preflight no anuncia credenciales ni refleja x-unlisted-header. Typecheck, lint, build y 194 pruebas unitarias/funcionales pasan.
Qué demuestra: los navegadores no reciben autorización CORS basada en cookies y no pueden solicitar encabezados ajenos al contrato configurado.
Qué no demuestra: autenticación/autorización de clientes externos, TLS, allowlist del dominio frontend definitivo ni protección contra clientes no navegador.
NO VERIFICADO: dominio productivo, orígenes de cliente externo, proxy/TLS y despliegue.
Servicios: no se levantaron servicios ni se accedió a producción.
```

### PHASE-34-BOUNDED-GEOJSON-COLLECTION-2026-09-23

```text
ID: PHASE-34-BOUNDED-GEOJSON-COLLECTION-2026-09-23
Fecha: 2026-09-23
Objeto: limitar tamaño/coste de lecturas GeoJSON y de datos serializados en la página inicial
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; .\scripts\verify-release-integration.ps1; npm run build; git diff --check
Evidencia: GeoJSON devuelve 100 filas por defecto y no permite más de 500; functional recorre todas las fixtures con cursor y no observa omisiones ni duplicados; entrada con límite, año, ID o cursor malformado responde 422. Página inicial usa 100 y enlaza a la página GeoJSON siguiente. Migración temporal aplica límites de campo e índice keyset; 50 pruebas PostgreSQL prueban paginación, checks de DB, privilegios y las demás integraciones. Typecheck, lint, build y 191 pruebas unitarias/funcionales pasan.
Qué demuestra: cota por respuesta, posición estable para datos válidos con ID ASCII, rechazo de cursor manipulado y enforcement de checks en PostgreSQL temporal.
Qué no demuestra: despliegue de migración en datos previos, máximo de memoria/latencia bajo corpus real, costo de filtros combinados a escala, protección distribuida, prueba de carga ni despliegue.
NO VERIFICADO: compatibilidad de datos históricos con nuevos checks, plan PostgreSQL en volumen productivo, proxy/gateway y migración productiva.
Servicios: PostgreSQL temporal detenido; puerto 55432 libre; variables del proceso restauradas; no se accedió a producción.
```

### PHASE-35-ALL-V1-ROUTE-RATE-LIMITS-2026-09-23

```text
ID: PHASE-35-ALL-V1-ROUTE-RATE-LIMITS-2026-09-23
Fecha: 2026-09-23
Objeto: aplicar límites por IP/patrón a todas las rutas públicas registradas `/v1`
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; node ace test functional --files=tests/functional/statistics/series_http.spec.ts --files=tests/functional/publication/chart_specs.spec.ts --files=tests/functional/openapi.spec.ts; npm test; npm run build; git diff --check
Evidencia: 60 llamadas a `/v1/forecasts/:id` con IDs distintos son aceptadas hasta el límite, la siguiente recibe 429 con Retry-After; POST ChartSpec conserva protección. Test recorre todas las operaciones GET/POST `/v1` en OpenAPI y comprueba contrato 429. Typecheck, lint, build y 192 pruebas unitarias/funcionales pasan.
Qué demuestra: límite local de 60 solicitudes por minuto y por plantilla/IP, registrado antes de parsear cuerpo, en todas las rutas API que el router registra con prefijo `/v1`.
Qué no demuestra: protección entre procesos, resolución de IP detrás del proxy productivo, bypass por red distribuida, limitación de conexiones o prueba de carga.
NO VERIFICADO: proxy confiable, gateway distribuido, entorno productivo y experiencia bajo tráfico legítimo concurrente.
Servicios: no se levantaron servicios ni se accedió a producción.
```

### PHASE-33-HTTP-SECURITY-HEADERS-2026-09-23

```text
ID: PHASE-33-HTTP-SECURITY-HEADERS-2026-09-23
Fecha: 2026-09-23
Objeto: establecer cabeceras de seguridad en respuestas HTML, API y error
Estado: COMPROBADO PARCIAL
Comandos: node ace test functional --files=tests/functional/web/explorer_view.spec.ts --files=tests/functional/openapi.spec.ts; npm run typecheck; npm run lint; npm test; npm run build; git diff --check
Evidencia: las respuestas HTML, JSON y 404 incluyen X-Content-Type-Options, X-Frame-Options y Referrer-Policy; HTML y JSON incluyen Permissions-Policy. Typecheck, lint y build pasan; 186 pruebas unitarias/funcionales pasan.
Qué demuestra: el middleware global adjunta las cabeceras a las rutas verificadas y el framework captura cabeceras en error 404.
Qué no demuestra: HSTS/TLS de borde, CSP compatible y efectiva, comportamiento de todos los navegadores, mitigación integral de XSS/CSRF ni configuración del proxy productivo.
NO VERIFICADO: DNS, HTTPS, proxy, CSP, navegador externo y producción.
Servicios: no se levantaron servicios ni se accedió a producción.
```

### PHASE-32-PYTHON-WORKER-DEPENDENCY-LOCKS-2026-09-23

```text
ID: PHASE-32-PYTHON-WORKER-DEPENDENCY-LOCKS-2026-09-23
Fecha: 2026-09-23
Objeto: fijar y auditar dependencias Python runtime/dev del worker con hashes
Estado: COMPROBADO PARCIAL
Comandos: pip install --require-hashes -r worker/requirements-dev.txt en entorno virtual limpio; pip-audit -r worker/requirements.txt; pip-audit -r worker/requirements-dev.txt; pytest worker/tests -q; npm audit --json en platform; git diff --check
Evidencia: ambos locks instalaron desde hashes; pip-audit no encontró vulnerabilidades conocidas en runtime ni dev; 40 pruebas Python pasan; npm audit reportó 0 vulnerabilidades en 534 dependencias JavaScript (369 producción y 155 desarrollo). Versiones vulnerables detectadas al auditar los manifiestos iniciales fueron elevadas antes de generar los locks.
Qué demuestra: instalación reproducible verificada y estado de avisos conocidos en las fuentes de auditoría consultadas el 2026-09-23, bajo Windows/Python 3.12 y el lock JavaScript presente.
Qué no demuestra: seguridad funcional/intrínseca de paquetes, SO de despliegue, SBOM firmado, análisis estático/dinámico completo, controles de build, proceso de actualización continua ni seguridad del producto desplegado.
NO VERIFICADO: lock y pruebas en Linux objetivo, revisión de procedencia de todos los paquetes, actualizaciones automáticas y entorno productivo.
Servicios: no se levantaron servicios ni se accedió a producción.
```

### PHASE-43-BOUNDED-STATISTICAL-COLLECTIONS-2026-09-23

```text
ID: PHASE-43-BOUNDED-STATISTICAL-COLLECTIONS-2026-09-23
Fecha: 2026-09-23
Objeto: acotar payloads estadísticos, paginar observaciones e impedir que el historial cargue arrays repetidos
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; .\scripts\verify-release-integration.ps1; npm run build; git diff --check
Evidencia: dominio limita vintage a 10.000 observaciones y 2 MiB; DB temporal rechaza inserción de 10.001 observaciones; API prueba resúmenes, paginación, ETag distinto por página y rechazos de límites/query repetida. 2 pruebas de unidad, 10 pruebas funcionales y 52 pruebas de integración PostgreSQL temporal pasan.
Qué demuestra: límites en dominio, adaptadores y constraints PostgreSQL; colección HTTP paginada; historial sin arrays de observaciones.
Qué no demuestra: compatibilidad de vintages existentes en cualquier instalación persistente, límites de memoria/latencia bajo carga real, seguridad total del producto ni despliegue productivo.
NO VERIFICADO: auditoría de payloads preexistentes, plan de consulta y rendimiento en corpus real, proxy/gateway distribuido, despliegue, respaldos y recuperación.
Servicios: PostgreSQL temporal detenido por el script; no se accedió a producción.
```

### PHASE-44-BOUNDED-COMMENT-COLLECTIONS-2026-09-23

```text
ID: PHASE-44-BOUNDED-COMMENT-COLLECTIONS-2026-09-23
Fecha: 2026-09-23
Objeto: impedir que la lectura pública de comentarios cargue toda la conversación
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; .\scripts\verify-release-integration.ps1; npm run build; git diff --check
Evidencia: GET comments fija 50 por defecto y 100 máximo; query inválida/repetida o negativa responde 422; PostgreSQL usa LIMIT/OFFSET con orden estable created_at/id; integración recorre dos páginas consecutivas sin duplicados. 203 pruebas unitarias/funcionales y 52 PostgreSQL pasan.
Qué demuestra: límite de filas por respuesta de comentarios y recorrido determinista bajo el fixture de PostgreSQL temporal.
Qué no demuestra: carga concurrente, latencia de offset grande, límite total de almacenamiento, identidad comunitaria lista para producción ni seguridad total del producto.
NO VERIFICADO: comportamiento bajo volumen/uso real, protección distribuida y entorno de despliegue.
Servicios: PostgreSQL temporal detenido por el script; no se accedió a producción.
```

### PHASE-45-BOUNDED-SERIES-COLLECTION-2026-09-23

```text
ID: PHASE-45-BOUNDED-SERIES-COLLECTION-2026-09-23
Fecha: 2026-09-23
Objeto: paginar el catálogo público de series estadísticas
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; .\scripts\verify-release-integration.ps1; npm run build; git diff --check
Evidencia: GET /v1/series aplica límite 100 por defecto, 500 máximo y offset hasta 10.000; PostgreSQL ejecuta LIMIT/OFFSET y total por separado; API rechaza parámetros negativos o fuera de rango. La portada toma la primera página. 204 pruebas unitarias/funcionales y 52 pruebas de integración PostgreSQL pasan; typecheck, lint y build pasan.
Qué demuestra: la API y consultas del repositorio limitan la cantidad de filas devueltas; páginas ordenadas por ID para el catálogo.
Qué no demuestra: latencia/costo bajo grandes volúmenes, carga concurrente, despliegue productivo ni seguridad total del producto.
NO VERIFICADO: volumen real, plan PostgreSQL productivo, gateway distribuido y operación productiva.
Servicios: PostgreSQL temporal detenido por el script; no se accedió a producción.
```

### PHASE-46-POSTGRES-TLS-2026-09-23

```text
ID: PHASE-46-POSTGRES-TLS-2026-09-23
Fecha: 2026-09-23
Objeto: cifrar y autenticar el servidor PostgreSQL desde procesos productivos
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; .\scripts\verify-release-integration.ps1; npm run build; npm audit --audit-level=moderate; git diff --check
Evidencia: NODE_ENV=production configura ssl con rejectUnauthorized=true para conexiones PostgreSQL de web y migration; DB_SSL_CA permite CA PEM adicional. Integración temporal habilita TLS real: rechaza conexión con CA ajena, acepta CA correcta, aplica migraciones y pasa 52 pruebas PostgreSQL. Suite pasa 205, typecheck/lint/build pasan; npm audit reporta cero vulnerabilidades JavaScript.
Qué demuestra: política cliente de TLS con validación de certificado y hostname y fallo cerrado frente a CA no confiable en la conexión migratoria temporal.
Qué no demuestra: TLS, CA, hostname, proxy o cifrado en reposo del entorno productivo; tampoco seguridad total del producto.
NO VERIFICADO: TLS/CA/DNS de producción; auditoría Python (pip-audit no está instalado y el host bloqueó su instalación en entorno temporal).
Servicios: PostgreSQL temporal detenido, puerto 55432 libre y certificados efímeros eliminados; no se accedió a producción.
```

### PHASE-47-CONTENT-SECURITY-POLICY-2026-09-23

```text
ID: PHASE-47-CONTENT-SECURITY-POLICY-2026-09-23
Fecha: 2026-09-23
Objeto: mitigar ejecución de script inyectado en HTML y restringir capacidades del navegador
Estado: COMPROBADO PARCIAL
Comandos: npm run typecheck; npm run lint; npm test; .\scripts\verify-release-integration.ps1; npm run build; git diff --check
Evidencia: GET / genera nonce criptográfico de 18 bytes por respuesta, aplica nonce coincidente al script y style, usa no-store y rota nonce incluso con If-None-Match. Observación HTTP local confirma CSP, nonces coherentes y cero atributos de evento inline. La revisión detectó un onsubmit que CSP bloqueaba; se reemplazó por listener delegado y prueba dirigida 4/4. Chromium abre la portada, pero el fixture local vacío impide ejercitar marcadores. La integración de liberación pasa 52 pruebas; suite unitaria/funcional pasa 205; typecheck, lint y build pasan.
Qué demuestra: cabecera CSP coordinada con HTML, nonce rotativo, ausencia de atributos de evento inline y render inicial de Chromium local.
Qué no demuestra: interacción con datos reales, compatibilidad entre navegadores, defensa total XSS, CSP report-only, ni configuración TLS/HSTS de borde.
NO VERIFICADO: interacción con datos reales; compatibilidad entre navegadores; CSP en infraestructura/proxy y prueba de seguridad dinámica integral.
Servicios: PostgreSQL temporal detenido; servidor web local de prueba detenido; puerto 55432 libre y certificados temporales eliminados.
```

### PHASE-48-HTTP-TEST-RESPONSE-CONTRACTS-2026-09-23

```text
ID: PHASE-48-HTTP-TEST-RESPONSE-CONTRACTS-2026-09-23
Fecha: 2026-09-23
Objeto: restaurar tipado estricto de pruebas de respuestas HTTP Adonis
Estado: COMPROBADO
Comandos: npm run typecheck; npm run lint; npm test; .\scripts\verify-release-integration.ps1; npm run build
Evidencia: helper readJsonBody decodifica el JSON real de response.text y el llamador declara el contrato de éxito/error que aserta. 36 pruebas afectadas pasan; suite completa 205; 52 integraciones PostgreSQL; typecheck, lint y build pasan.
Qué demuestra: contratos runtime HTTP cubiertos y árbol TypeScript compilable tras codegen Adonis en el checkout actual.
Qué no demuestra: que el cliente de prueba infiera automáticamente cuerpos de rutas ni seguridad total del producto.
NO VERIFICADO: procesos y dependencias productivas, análisis de todos los cuerpos en escala real.
Servicios: PostgreSQL temporal detenido por el script; no se accedió a producción.
```

### PHASE-49-EXPLICIT-TRUSTED-PROXY-2026-09-23

```text
ID: PHASE-49-EXPLICIT-TRUSTED-PROXY-2026-09-23
Fecha: 2026-09-23
Objeto: impedir falsificación de IP reenviada para el rate limit local
Estado: COMPROBADO PARCIAL
Comandos: prueba inicial roja de openapi; npm test (209); npm run typecheck; npm run lint; npm run build; .\scripts\verify-release-integration.ps1 (52); git diff --check
Evidencia: Adonis tenía trustProxy loopback por defecto. Antes del cambio, 61 cabeceras X-Forwarded-For distintas evitaron el límite por IP; tras fijar `trustProxy: false` por defecto, la prueba recibe 429. Configuración opcional acepta solo una IP exacta y rechaza CIDR/lista/wildcard/hostname; 3 pruebas unitarias y la regresión HTTP pasan. 209 pruebas unitarias/funcionales, 52 PostgreSQL, typecheck, lint y build pasan.
Qué demuestra: la cabecera X-Forwarded-For no varía el IP cliente de la cuota si TRUSTED_PROXY está ausente; una IP proxy solo es confiada si se configura literalmente.
Qué no demuestra: que el proxy sanee/reemplace cabeceras, IP correcta en infraestructura productiva, rate limit compartido, DDoS ni seguridad total.
NO VERIFICADO: peer proxy real, cadena X-Forwarded-For real, gateway distribuido, tráfico concurrente.
Servicios: PostgreSQL temporal detenido por el script; no se accedió a producción.
```

### PHASE-50-CSP-STYLE-ATTRIBUTES-2026-09-23

```text
ID: PHASE-50-CSP-STYLE-ATTRIBUTES-2026-09-23
Fecha: 2026-09-23
Objeto: retirar estilos inline de atributos de la portada y endurecer CSP
Estado: COMPROBADO PARCIAL
Comandos: prueba focalizada explorer (4); npm run typecheck; npm run lint; npm test (209); npm run build; navegador Chromium local (click tab-map; errores/consola vacíos); git diff --check
Evidencia: búsqueda de `style=` y `.style.` en la plantilla no encuentra usos propios; estilos declarativos usan clases bajo el style nonceado, y tabs/filtros/respuestas usan clases dinámicas. La cabecera declara `style-src-attr 'none'`. En Chromium, el mapa queda visible tras seleccionar su pestaña; cero atributos style pertenecen al documento; no hay errores/avisos de consola. Una extensión inserta su propio elemento fijo con style y se excluyó al contar el documento de la aplicación.
Qué demuestra: la portada no necesita atributos de estilo para render inicial ni cambio de pestaña bajo CSP; JavaScript no crea esos atributos.
Qué no demuestra: interacción con datos reales, todos los navegadores, CSP de proxy productivo ni defensa integral XSS.
NO VERIFICADO: integración PostgreSQL repetida después de esta fase (sin cambios backend/schema); renderer tras despliegue y navegadores adicionales.
Servicios: servidor web de desarrollo detenido; PostgreSQL temporal detenido; sin acceso a producción.
```

### PHASE-51-PRODUCTION-HSTS-2026-09-23

```text
ID: PHASE-51-PRODUCTION-HSTS-2026-09-23
Fecha: 2026-09-23
Objeto: emitir HSTS en proceso productivo sin asumir cobertura de subdominios
Estado: COMPROBADO PARCIAL
Comandos: npm test (211); npm run typecheck; npm run lint; npm run build; git diff --check
Evidencia: política devuelve `max-age=15552000` solo para production y omite `includeSubDomains`/`preload`; test confirma ausencia en respuesta 404 bajo NODE_ENV=test. Suite completa 211, typecheck/lint/build pasan.
Qué demuestra: comportamiento configurado del proceso y respuesta local de entorno no productivo.
Qué no demuestra: HTTPS público ni persistencia del encabezado a través del proxy/edge.
NO VERIFICADO: TLS del borde, HSTS efectivo en los dominios de producción y cobertura de subdominios.
Servicios: sin servidor persistente; no se accedió a producción.
```

### PHASE-52-SELF-HOSTED-UI-FONTS-2026-09-23

```text
ID: PHASE-52-SELF-HOSTED-UI-FONTS-2026-09-23
Fecha: 2026-09-23
Objeto: evitar solicitudes de la interfaz a Google Fonts y alinear tipografía con CSP
Estado: COMPROBADO PARCIAL
Comandos: prueba funcional de portada; npm test (211); npm run typecheck; npm run lint; npm run build; git diff --check
Evidencia: HTML ya no referencia fonts.googleapis.com ni fonts.gstatic.com y usa la pila tipográfica del sistema. La prueba funcional exige ambas condiciones negativas y verifica que el script embebido compile. Suite unitaria/funcional 211; typecheck, lint, build pasan.
Qué demuestra: la respuesta HTML local no inicia la carga de fuentes desde dominios externos.
Qué no demuestra: renderizado idéntico en todos los sistemas operativos, comportamiento del navegador en despliegue ni privacidad integral de la plataforma.
NO VERIFICADO: renderizado visual en equipos adicionales y tráfico de producción.
Servicios: no se levantaron servicios persistentes; PostgreSQL temporal detenido; no se accedió a producción.
```

### PHASE-53-STATISTICAL-VINTAGE-SERIES-BINDING-2026-09-23

```text
ID: PHASE-53-STATISTICAL-VINTAGE-SERIES-BINDING-2026-09-23
Fecha: 2026-09-23
Objeto: impedir atribuir observaciones y pronósticos de una serie a otra
Estado: COMPROBADO PARCIAL
Comandos: prueba funcional roja inicial; npm test (214); npm run typecheck; npm run lint; npm run build; .\scripts\verify-release-integration.ps1 (53); git diff --check
Evidencia: la petición HTTP con vintage ajeno devolvía 200 antes de la corrección y ahora 404 para observaciones y SDMX. El servicio devuelve 503 para un pronóstico con procedencia cruzada. PostgreSQL temporal rechaza actualización directa de current_vintage_id y pronóstico cruzado con SQLSTATE 23503, conservando el vintage original. Suite 214/214 y 53/53 integraciones pasan; typecheck, lint y build pasan.
Qué demuestra: atribución protegida en las rutas probadas y restricciones relacionales nuevas en una base PostgreSQL temporal recién creada.
Qué no demuestra: compatibilidad de la migración con datos existentes, seguridad productiva general ni calidad del corpus.
NO VERIFICADO: preflight de relaciones en una base real, migración/despliegue/rollback productivo.
Servicios: PostgreSQL temporal detenido por el script; no se accedió a producción.
```

### PHASE-54-LAZY-CLAIM-DETAIL-2026-09-23

```text
ID: PHASE-54-LAZY-CLAIM-DETAIL-2026-09-23
Fecha: 2026-09-23
Objeto: retirar lecturas N+1 y sobres de evidencia del HTML inicial de la portada
Estado: COMPROBADO PARCIAL
Comandos: prueba funcional roja inicial; npm test (215); npm run typecheck; npm run lint; npm run build; .\scripts\verify-release-integration.ps1 (53); git diff --check
Evidencia: antes del cambio, el HTML de `/` contenía el hash de una fuente de detalle. Después, la prueba confirma su ausencia en `/` y su presencia en `/v1/claims/:id`. El controlador dejó de recuperar 50 sobres secuencialmente; el panel solicita el detalle al abrirse, limpia el estado anterior e invalida respuestas desplazadas. Suite 215/215 y 53/53 integraciones pasan; typecheck, lint y build pasan.
Qué demuestra: el HTML de la portada probado no incorpora los sobres completos y la ruta de detalle sigue disponible. La solicitud a demanda queda implementada y compila.
Qué no demuestra: interacción visual del panel bajo latencia, carga distribuida, tiempo de respuesta productivo ni seguridad integral del contenido publicado.
NO VERIFICADO: navegador real para esta fase, accesibilidad interactiva, datos y proxy productivos.
Servicios: PostgreSQL temporal detenido por el script; no se accedió a producción.
```
