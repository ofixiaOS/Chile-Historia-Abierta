# Qué se adaptó de la ingeniería de OFIXIA

Se revisaron de forma solo lectura `AGENTS.md`, el protocolo de ingeniería de alta fidelidad, la guía de desarrollo y el registro de verificación de OFIXIA Privacy. Se reutilizan criterios generales, no reglas específicas de privacidad o multi-tenant.

## Adaptado

- Evidencia antes de afirmar.
- Separación `COMPROBADO`, `PROBABLE` y `NO VERIFICADO`.
- Pruebas negativas y de ataque, no solo camino feliz.
- Fallo cerrado cuando no existe fuente, licencia, persistencia o validación.
- Versionado durable y hash para payloads y artefactos.
- No confundir pruebas locales con disponibilidad real de terceros.
- Flujo Explorar → Planificar → Implementar → Verificar.
- Control explícito del ciclo de vida de workers y procesos pesados.

## No adaptado

- RLS por tenant.
- Reglas legales de Ley Karin, privacidad, APDP, DT, Flow o FEA.
- Supuestos comerciales de OFIXIA.
- Infraestructura de producción, secretos, despliegue o proveedores de OFIXIA.

## Resultado

Este proyecto necesita un protocolo de verdad y procedencia: una respuesta del LLM, una API HTTP 200 o un gráfico bonito no bastan para declarar que una afirmación histórica está comprobada.
