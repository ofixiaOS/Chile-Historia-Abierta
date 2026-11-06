# API pública v1

Corte: 6 de noviembre de 2026. Inventario contrastado con `platform/start/routes.ts`. Que una ruta exista no significa que tenga corpus aprobado o esté habilitada para escritura pública.

## Contrato

`GET /openapi.json` sirve el contrato generado por esta aplicación. Consultar sus esquemas y las pruebas HTTP para cada respuesta; no asumir un sobre JSON uniforme para todos los recursos. La implementación OpenAPI está en `platform/app/openapi/`.

## Rutas registradas de lectura

```text
GET /
GET /openapi.json
GET /v1/claims
GET /v1/claims/:id
GET /v1/explore
GET /v1/publications/:id
GET /v1/publications/:id/comments
GET /v1/publications/:id/votes
GET /v1/series
GET /v1/series/:id
GET /v1/series/:id/vintages
GET /v1/series/:id/observations
GET /v1/forecasts/:id
GET /v1/claims/:id/prov
GET /v1/publications/:id/prov
GET /v1/series/:id/sdmx
GET /v1/places/geojson
```

## Rutas registradas POST

```text
POST /v1/chart-specs/validate
POST /v1/publications
POST /v1/publications/:id/comments
POST /v1/publications/:id/votes
POST /v1/reports
POST /v1/assistance/query
POST /v1/mcp
```

Validar una especificación no publica un gráfico. La escritura editorial del piloto requiere credencial configurada; no acredita identidad comunitaria individual. Comentarios, votos y reportes tienen bloqueada la escritura HTTP hasta implementar esa identidad. MCP ya existe como adaptador; POST no implica permiso editorial.

No están registradas rutas independientes `/v1/search`, `/v1/events`, `/v1/entities`, `/v1/sources`, `/v1/artifacts` o `/v1/snapshots`, ni sus variantes descritas en planes antiguos. No diseñar clientes suponiendo que existen.

## Datos y límites

Los adaptadores de memoria se inician sin fixtures fuera de tests. Una colección vacía no demuestra que una fuente carezca de información: puede reflejar que no se ha cargado un corpus revisado.

Paginación, filtros, unidades, vintages y localizadores deben consultarse en el esquema del recurso correspondiente. GeoJSON usa cursor; varias colecciones usan limit/offset. No se promete un único modelo de paginación para toda la API.

La asistencia conserva `evidenceStatus: not_verified` y `abstained: true`: no tiene un mecanismo de revisión de interpretaciones. Si las citas coinciden literalmente con los fragmentos y localizadores, las devuelve, retiene la síntesis y usa `INTERPRETATION_UNVERIFIED`. Si fallan, usa `CITATION_UNVERIFIED` y no devuelve citas parciales.

El objeto obligatorio `verification` distingue `citationStatus` (`not_checked`, `verified`, `failed`) de `sourceAuthenticity`, `sourceCurrency` e `interpretationStatus` (actualmente `unverified`). `verified` solo describe la coincidencia con fragmentos recuperados, no con un original autenticado. La ausencia de evidencia o el rechazo de consulta deja las citas `not_checked`.

Este cambio modifica el contrato anterior: los clientes no deben interpretar la presencia de citas como una respuesta aprobada ni esperar `documented` o `disputed` para la síntesis. Los desacuerdos de los fragmentos se conservan como contexto, sin validar una conclusión.

## Cache y operación

El HTML genera nonce CSP y usa `no-store`. Los recursos JSON implementan sus propias políticas de ETag; no asumirlas para escrituras o todos los endpoints. Los controles de rate limit no equivalen a protección distribuida o ensayo de carga.

Las exportaciones PROV-O y SDMX son proyecciones del modelo local; no constituyen certificación, firma ni conformidad completa con estándares. No hay despliegue público acreditado.
