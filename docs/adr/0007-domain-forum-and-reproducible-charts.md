# ADR 0007 — Comunidad de dominio y gráficos reproducibles propios

## Estado

Aceptado — 2026-09-22.

## Contexto

Discourse, NodeBB y Omeka son proyectos maduros, pero sus modelos no hacen del enlace entre claim, evidencia, revisión estadística y gráfico reproducible la unidad central. Integrarlos implicaría duplicar identidad, permisos y moderación.

## Decisión

Construir en AdonisJS el subconjunto comunitario necesario: publicaciones tipadas, comentarios con evidencia, forks, revisiones, correcciones, reportes, apelaciones y conflictos de interés.

`ChartSpec` será un contrato propio, versionado y validado, basado inicialmente en Vega-Lite. Guardará consulta, IDs y versiones de datos, filtros, unidades, transformaciones, método, versión del renderer y hashes. PNG/SVG son derivados, no el original reproducible.

## Consecuencias

- Más implementación de dominio inicial, pero una sola identidad y política de evidencia.
- Los votos ordenan atención; no alteran evidencia ni moderación automáticamente.
- Se puede reevaluar un foro externo si la comunidad general domina el coste y existe una integración verificable que preserve el contrato de evidencia.
