# Ingeniería de alta fidelidad adaptada

Este protocolo adapta criterios útiles revisados en la documentación de OFIXIA. No copia reglas de RLS, pagos, privacidad legal o multi-tenant que no pertenecen a este proyecto.

## Anti-humo

- No declarar una fuente, integración o predicción como funcional sin evidencia observable.
- No llamar “hecho” a una salida de LLM.
- No sumar resultados de pruebas solapadas como si fueran cobertura independiente.
- No confundir API disponible con datos correctos, completos o licenciados.

## Fallo cerrado

- Si una fuente no puede verificarse, conservar estado pendiente.
- Si una licencia no permite redistribución, no publicar el contenido.
- Si una serie cambia unidad, frecuencia o metodología, crear nueva versión y advertencia.
- Si un modelo no supera un baseline en backtesting, no publicarlo como predictivo.

## Integraciones

1. Persistir intento y metadatos locales.
2. Descargar con timeout, límites y reintentos acotados.
3. Validar esquema, hash y licencia.
4. Normalizar a una versión nueva.
5. Publicar solo tras controles de calidad.

## Pruebas negativas

Cubrir proveedor caído, respuesta 200 inválida, cambio de esquema, duplicado, datos incompletos, licencia incompatible, prompt injection, cita inventada, concurrencia, rate limit y archivo alterado.

## Evidencia de entrega

Toda tarea termina con:

- cambios realizados;
- comandos ejecutados;
- pruebas que pasaron;
- límites del entorno;
- `COMPROBADO`, `PROBABLE`, `NO VERIFICADO`;
- pendientes concretos.
