# API pública v1

## Propósito

La API ofrece recursos citables y versionados para humanos, aplicaciones y sistemas de IA. OpenAPI es el contrato canónico de transporte. MCP podrá añadirse como adaptador de herramientas de lectura; no reemplaza REST ni obtiene permisos editoriales.

## Recursos iniciales

```text
GET /v1/search
GET /v1/explore
GET /v1/events/:id
GET /v1/events/:id/claims
GET /v1/entities/:id
GET /v1/places/:id
GET /v1/places/geojson
GET /v1/claims/:id
GET /v1/claims/:id/revisions
GET /v1/sources/:id
GET /v1/artifacts/:id/manifest
GET /v1/series
GET /v1/series/:id
GET /v1/series/:id/vintages
GET /v1/series/:id/observations
GET /v1/publications/:id
GET /v1/chart-specs/:id
GET /v1/forecasts/:id
GET /v1/snapshots
GET /v1/snapshots/:id
GET /openapi.json
```

Los comentarios públicos aceptan `limit` (1–100, predeterminado 50) y `offset` (0–10000); la respuesta incluye `total`, `limit`, `offset` y enlaces de navegación. El catálogo `GET /v1/series` acepta `limit` (1–500, predeterminado 100) y el mismo rango de offset. Las colecciones estadísticas también están paginadas: observaciones acepta `limit` (1–1000, predeterminado 500); vintages acepta `limit` (1–500, predeterminado 100). El historial entrega resúmenes sin arrays de observaciones. Cada vintage admite hasta 10.000 observaciones y 2 MiB de JSON serializado.

`/v1/explore` devuelve el read model necesario para coordinar timeline, mapa y lista bajo filtros normalizados; no es un endpoint ilimitado. Las publicaciones/escrituras usan contratos separados y autenticados, fuera de la superficie cacheable pública.

`/v1/places/geojson` pagina por cursor estable; usa 100 registros por defecto y admite hasta 500. La respuesta incluye `pagination.next` y `pagination.nextCursor`. Los filtros se preservan en el enlace siguiente; un límite o cursor inválido devuelve 422.

## Sobre de respuesta factual

```json
{
  "data": {},
  "included": [],
  "sources": [],
  "evidenceStatus": "documented",
  "asOf": "2026-09-22T00:00:00Z",
  "version": "...",
  "freshness": {
    "generatedAt": "...",
    "sourceVersion": "..."
  },
  "limitations": [],
  "links": {
    "self": "..."
  }
}
```

`evidenceStatus` no se calcula desde votos, número de fuentes o salida de IA. Cuando un recurso reúne claims con estados distintos, la API los devuelve por claim; no aplica un promedio engañoso.

## Fuentes y localizadores

Una cita de API incluye `sourceId`, `artifactId`, tipo de fuente, título/responsable, fechas, licencia/derechos, hash y `locator` (página, tabla, fila, selector, fragmento o timecode). Los fragmentos de texto cumplen derechos aplicables y límites de cita; cuando no se puede redistribuir, se entrega metadata/localizador y enlace permitido.

## Filtros y paginación

- Cursor opaco estable para colecciones; no exponer offset ilimitado como contrato principal.
- Límites máximos documentados para `pageSize`, rango temporal, bounding box, geometrías, series y campos incluidos.
- Filtros repetibles y orden estable con desempate por ID.
- Fechas/intervalos conservan precisión e incertidumbre; no forzar un día inventado.
- Campos costosos requieren `include` explícito o exportación asíncrona.
- La respuesta enlaza `next`; no construye URLs desde input sin normalización.

## Cache y concurrencia

- ETag se deriva de versión de representación y consulta normalizada.
- `If-None-Match` permite 304; `If-Match` protege escritura editorial contra actualizaciones perdidas.
- `Cache-Control` distingue contenido público, privado y no cacheable.
- La portada HTML (`GET /`) emite nonce CSP fresco y usa `Cache-Control: no-store`; no responde 304 para evitar reutilizar el nonce junto a HTML almacenado. Los recursos JSON mantienen su política ETag correspondiente.
- Una publicación corregida mantiene URL/revisión citables y marca cuál es vigente.

## Errores

Formato estable con `code`, `message`, `status`, `requestId`, `details` seguros y enlace de documentación. No filtrar SQL, rutas, secretos, prompts ni payloads restringidos.

Códigos de dominio mínimos: `E_NOT_FOUND`, `E_VALIDATION`, `E_RATE_LIMIT`, `E_QUERY_TOO_COMPLEX`, `E_RIGHTS_RESTRICTED`, `E_SOURCE_UNAVAILABLE`, `E_VERSION_CONFLICT`, `E_EXPORT_PENDING` y `E_EVIDENCE_INSUFFICIENT`.

## Separación operacional

- El rol público es read-only sobre read models/proyecciones permitidas.
- La escritura editorial del piloto exige un token Bearer configurado en el servidor; el autor enviado por el cliente se ignora. Esto no constituye identidad comunitaria ni autenticación reforzada de usuarios.
- Los repositorios de memoria públicos comienzan vacíos fuera de `NODE_ENV=test`. Los ejemplos incluidos en código son fixtures técnicos, no datos históricos aprobados; una respuesta vacía refleja la ausencia de un corpus dado de alta.
- Comentarios, votos y reportes HTTP devuelven `E_COMMUNITY_WRITES_DISABLED` (503) hasta implementar identidad individual, permisos y controles de abuso.
- Ningún GET público consulta proveedores externos durante la solicitud.
- CORS no envía credenciales y restringe métodos/encabezados a los usados por la API. La allowlist de producción permanece vacía hasta definir el frontend público; el render HTML actual es same-origin.
- Exportaciones grandes, OCR, embeddings y forecasts son jobs; el cliente recibe estado y URL final autorizada.
- **COMPROBADO LOCAL:** cada ruta registrada bajo `/v1` aplica 60 solicitudes/minuto por patrón de ruta e IP, con memoria acotada por proceso. Cambiar un `:id` no crea otro bucket.
- **NO VERIFICADO:** límite compartido entre instancias, resolución de IP detrás del proxy real, cuota por usuario/API key y comportamiento bajo tráfico distribuido.

## OpenAPI y compatibilidad

- Publicar OpenAPI 3.1 y schemas versionados en CI cuando exista implementación.
- Cambios incompatibles requieren nueva versión o periodo de deprecación documentado.
- Ejemplos no cuentan como contrato si contradicen el schema.
- Incluir `license`, términos, contacto, seguridad, errores, límites y ejemplos de citas.
- Probar contract tests y ejemplos contra la implementación; la existencia de `/openapi.json` no demuestra conformidad.

## Snapshots y agentes

Los snapshots versionados permiten investigación reproducible y reducen scraping costoso. Cada snapshot incluye manifest, licencia por recurso, hashes, schema y fecha.

Un adaptador MCP futuro expone herramientas de lectura acotadas (`search`, `get_claim`, `get_source`, `get_series`) sobre `/v1`, con límites equivalentes. No acepta URLs arbitrarias, no publica y no convierte la respuesta de un modelo en fuente.

## Estado de verificación

- **COMPROBADO:** OpenAPI define una descripción estándar agnóstica del lenguaje; RFC 9110 define ETags y solicitudes condicionales.
- **COMPROBADO LOCAL:** `GET /v1/claims/:id`, ETag/304, errores estables y la lectura mediante el rol/vista pública fueron reproducidos en la fase 0–1. La prueba PostgreSQL observó que el rol público no puede consultar `claim_revisions` directamente.
- **PROBABLE:** este contrato cubre el MVP sin GraphQL/SPARQL público.
- **NO VERIFICADO:** límites, SLO y cuotas concretas hasta disponer de implementación y prueba de carga.

Ver [ADR 0006](../adr/0006-public-read-boundary.md) y [modelo de evidencia](../evidence-model.md).
