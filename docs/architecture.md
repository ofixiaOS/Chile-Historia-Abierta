# Arquitectura y límites actuales

Corte documental: 6 de noviembre de 2026. Esta descripción se contrastó con el árbol del repositorio público; no acredita un despliegue.

## Implementado en esta base

Monolito modular AdonisJS 7 con TypeScript, adaptadores de memoria y PostgreSQL, y un worker Python independiente. El explorador HTML se genera en `platform/app/controllers/web_explorer_controller.ts`; no es una aplicación React ni el diseño posterior del repositorio privado.

Los módulos presentes en `platform/app/modules/` son:

- `catalog`: conectores y contratos de fuentes.
- `evidence`: afirmaciones, revisiones y referencias de evidencia.
- `statistics`: series, vintages, observaciones y pronósticos.
- `geography`: atestaciones territoriales y GeoJSON.
- `publication` y `community`: publicaciones y contratos de participación.
- `identity`: identidad editorial del piloto.
- `assistance`: recuperación de fragmentos, proveedor determinista y comprobador de citas.
- `interoperability`: MCP y proyecciones PROV-O/SDMX.
- `releases`: preparación y revisión de paquetes locales.

La existencia de un módulo no implica que su flujo esté habilitado al público o validado con datos reales. Las rutas registradas están en `platform/start/routes.ts`; véase [la guía de API](api/public-api.md).

## Recorrido de datos

```text
Archivo local y metadatos
  → preparación y revisión de paquete
  → PostgreSQL: fuentes, artefactos, revisiones y vistas permitidas
  → servicios de aplicación y DTOs
  → API /v1 y explorador web

Worker Python → procesamiento documental y análisis estadístico local
```

El flujo de paquetes tiene alcance acotado: texto UTF-8, una fuente y una afirmación por paquete. No es una ingesta nacional ni un sistema automático de actualización. Ver [operación local](operations/local-release-workflow.md).

## Entorno y permisos

El Compose de desarrollo usa `postgres:16-alpine`, publica en `127.0.0.1:55432` y conserva un volumen local. `.env.example` distingue conexiones de propietario/migración y lectura pública. Cada repositorio se selecciona por su variable de entorno; iniciar PostgreSQL no selecciona automáticamente todos los adaptadores.

La memoria comienza sin fixtures fuera de tests. Las credenciales de ejemplo son exclusivamente locales. Las restricciones de los procesos de producción están descritas en [production-processes.md](operations/production-processes.md), sin acreditar una instalación operativa.

Las pruebas usan PostgreSQL desechable y un marcador de identidad antes de migrar; no usan el volumen de desarrollo. No reemplazar el ejecutor aislado por `node ace test` o migraciones sobre una base elegida manualmente.

## Brechas relevantes

El verificador de citas normaliza mayúsculas, tildes, puntuación y espacios; no verifica coincidencia literal. El servicio de asistencia puede asignar `documented` después de superar ese control: no equivale a revisión del contenido. Estos contratos requieren corrección antes de presentar respuestas como evidencia verificada.

No se identificaron migraciones de extensiones PostGIS o pgvector. Tampoco se acredita almacenamiento S3, una cola distribuida, ingestión continua, identidad comunitaria individual ni un proceso completo de corrección pública.

## Decisiones futuras

PostGIS, búsqueda semántica, almacenamiento de objetos o colas se evaluarán cuando el corpus y una necesidad medida lo justifiquen. Los ADR históricos orientan decisiones; no certifican componentes instalados. No introducir microservicios o un grafo dedicado antes de validar el recorrido editorial del [roadmap](roadmap.md).
