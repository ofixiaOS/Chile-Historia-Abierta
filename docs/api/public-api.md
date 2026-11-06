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

El estado `documented` de una respuesta de asistencia no acredita revisión humana. El comprobador actual normaliza texto y no valida literalidad, autenticidad o soporte semántico; es una brecha pendiente, descrita en [STATUS.md](../STATUS.md).

## Cache y operación

El HTML genera nonce CSP y usa `no-store`. Los recursos JSON implementan sus propias políticas de ETag; no asumirlas para escrituras o todos los endpoints. Los controles de rate limit no equivalen a protección distribuida o ensayo de carga.

Las exportaciones PROV-O y SDMX son proyecciones del modelo local; no constituyen certificación, firma ni conformidad completa con estándares. No hay despliegue público acreditado.
