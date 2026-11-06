# ADR 0004 — Sobre de evidencia y revisiones inmutables

## Estado

Aceptado — 2026-09-22.

## Contexto

Las fuentes investigadas separan licencia de software, dataset y objeto. Las series pueden revisarse; nombres, geometrías y relaciones históricas pueden cambiar por periodo; un claim puede ser corregido o disputado sin borrar su historia.

## Decisión

Cada afirmación, observación, relación, documento, gráfico y pronóstico publicado referencia un `evidenceEnvelope` versionado. Como mínimo conserva fuente, localización, derechos/licencia, fechas, payload/artefacto original, hash, método de transformación, agente responsable, versión y limitaciones.

`event` no equivale a hecho. Los enunciados viven en revisiones inmutables de `claim`. Corregir crea una revisión que enlaza y explica la anterior. Votos, patrocinio, reputación y salidas de IA nunca escriben `evidenceStatus`.

## Consecuencias

- El almacenamiento normalizado es mutable solo mediante nuevas versiones o estados editoriales; los artefactos originales son append-only.
- La licencia se evalúa por artefacto y derivación, no solo por proveedor.
- Los read models pueden regenerarse desde el historial canónico.
- Exportaciones PROV-O, IIIF, SDMX o JSON-LD son proyecciones, no el modelo de escritura.
