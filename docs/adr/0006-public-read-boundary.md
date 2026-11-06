# ADR 0006 — Frontera de lectura pública y escritura editorial

## Estado

Aceptado — 2026-09-22.

## Contexto

La lectura pública será cacheable y potencialmente mucho mayor que la escritura. Servir consultas editoriales complejas desde las mismas rutas, credenciales y tablas aumenta el riesgo de filtración y contención.

## Decisión

La API pública consume DTOs/read models reconstruibles y usa un rol de base de datos sin permisos de escritura ni acceso a borradores, secretos o material restringido. Las rutas editoriales y de moderación viven en un host o prefijo protegido, con autenticación reforzada y sin caché pública.

Una transacción editorial escribe el canónico y un outbox. Workers idempotentes actualizan proyecciones; cada respuesta publica `asOf`, versión y estado de frescura. CDN, ETag y caché pueden agregarse sin cambiar el dominio.

## Consecuencias

- Consistencia eventual visible entre publicación y lectura pública.
- Una falla de proyección no revierte ni oculta la evidencia canónica; se monitorea y reintenta con DLQ.
- Réplicas y motores especializados solo reciben proyecciones permitidas y pueden reconstruirse.
- Los endpoints públicos no llaman proveedores externos durante la solicitud.
