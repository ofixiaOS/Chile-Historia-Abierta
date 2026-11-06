# ADR 0003 — Vistas complementarias sobre un mismo modelo

## Estado

Aceptado — 2026-09-22.

## Contexto

La visión inicial daba a la línea de tiempo un lugar ambiguo: podía interpretarse como interfaz principal o como una vista más. Una timeline es eficaz para secuencia, pero no para preguntas sin fecha conocida, comparación espacial o análisis multivariable.

## Decisión

La entrada principal comienza por pregunta/búsqueda y ofrece vistas coordinadas de timeline, mapa, series, entidades, fuentes, colecciones y discusión. La timeline es una vista emblemática, no el contenedor de todo el producto.

Los filtros de periodo, territorio, tema, entidad y estado de evidencia forman un estado de exploración compartido. Cada vista consume recursos e IDs estables del mismo dominio; ninguna mantiene un modelo paralelo de “hechos”.

## Consecuencias

- El MVP debe probar el flujo completo, no una imagen temporal gigante.
- Timeline y mapa agregan/densifican al alejarse y muestran detalle bajo demanda.
- TimelineJS puede apoyar relatos curados, pero no define la interfaz canónica.
- Móvil presenta una vista visual a la vez y conserva una alternativa textual accesible.
