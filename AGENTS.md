# Chile Historia Abierta — instrucciones del agente

## Propósito

Chile Historia Abierta es una plataforma pública para explorar historia, economía y sociedad chilena mediante una línea de tiempo, mapas, series estadísticas, foro y una API consultable por personas y sistemas de IA.

La plataforma no debe presentar una “historia oficial alternativa”. Debe mostrar afirmaciones, fuentes, desacuerdos, metodología y límites de evidencia.

## Principios innegociables

1. **Evidencia antes que narrativa.** Toda afirmación histórica o económica importante debe conservar fuente, fecha, licencia, localización y método de transformación.
2. **Separación epistemológica.** Distinguir siempre `documented`, `inferred`, `disputed`, `hypothesis`, `forecast` y `unknown`.
3. **La IA interpreta; no es la base de datos.** Un LLM nunca puede inventar una fuente, una cifra, una página ni una causalidad.
4. **Fuentes con distinto peso.** No mezclar archivo primario, organismo oficial, paper, prensa, testimonio y publicación de foro como si fueran equivalentes.
5. **Reproducibilidad.** Cada gráfico, cálculo, comparación o predicción debe conservar consulta, filtros, versión de datos y código o método aplicable.
6. **Incertidumbre visible.** Las predicciones siempre incluyen horizonte, modelo, intervalo, backtesting y limitaciones.
7. **No sobreafirmar.** Usar `COMPROBADO`, `PROBABLE` y `NO VERIFICADO` en diagnósticos, documentación y entregas.
8. **Preservar el contexto.** No borrar ni sobrescribir evidencia histórica; crear versiones y correcciones trazables.
9. **Privacidad y seguridad.** No publicar datos personales sensibles, no aceptar SSRF, prompt injection, subida ejecutable ni consultas sin límites.
10. **Primero el MVP.** No incorporar un grafo, vector DB o framework de agentes hasta demostrar una necesidad concreta.
11. **Licencias separadas.** Registrar y verificar por separado licencia de software, dataset y objeto; un repositorio público o API accesible no implica redistribución permitida.
12. **Popularidad no es evidencia.** Votos, reputación, patrocinio y salidas de IA nunca elevan el estado epistemológico ni otorgan permisos editoriales.

## Flujo obligatorio

1. Leer README.md y docs/STATUS.md; inspeccionar branch, HEAD, status y diff; preservar trabajo previo y contrastar las fuentes pertinentes.
2. Comunicar un plan breve antes de editar código, sin crear archivos de fase.
3. Implementar con TypeScript estricto y controladores delgados.
4. Verificar con pruebas unitarias, funcionales, negativas y `git diff --check`.
5. Reportar qué quedó comprobado y qué sigue abierto.

## Arquitectura base

- Monolito modular AdonisJS 7 y TypeScript, con API y explorador HTML servido por el backend.
- PostgreSQL con adaptadores y vistas públicas; memoria para desarrollo y fixtures exclusivos de tests.
- Worker Python para procesamiento documental y estadística local.
- PostGIS, pgvector, almacenamiento de objetos y colas son propuestas, no componentes acreditados de este corte. Evaluarlos solo ante una necesidad comprobada.
- Consultar docs/architecture.md y platform/start/routes.ts antes de afirmar que un módulo o ruta existe.

## Preparación para escala

- Diseñar desde el inicio interfaces de adaptadores para fuentes, búsqueda, almacenamiento y forecasting.
- Mantener API pública stateless y separar lecturas públicas de escritura editorial.
- Preparar colas, outbox, caché, CDN, almacenamiento de objetos y observabilidad, aunque se activen gradualmente.
- No introducir microservicios por anticipación: escalar primero la aplicación modular y extraer solo cuellos medidos.
- Las rutas públicas deben poder servirse desde réplicas/read models sin exponer la base editorial.

## Reglas de datos

- Las APIs externas son entradas, no fuentes canónicas locales.
- Ingerir, validar, versionar y conservar el payload original antes de normalizar.
- Registrar `sourceUrl`, `sourceName`, `retrievedAt`, `publishedAt`, `license`, `contentHash`, `dataVersion` y `transformationMethod`.
- No usar un único campo `license` cuando software, dataset u objeto tienen términos distintos; conservar atribución y política de redistribución por artefacto.
- No convertir OCR, texto de foro o salida de IA en hecho sin revisión y fuente.
- No usar correlación como causalidad.

## Reglas de API y LLM

- Versionar la API como `/v1` y publicar OpenAPI.
- Respuestas de hechos deben incluir fuentes y estado de evidencia.
- Aplicar límites de tamaño, paginación, rate limit, cache y timeouts.
- Para RAG, devolver fragmentos citables, identificadores de fuente y fecha de recuperación.
- Si faltan fuentes o hay conflicto, responder “no verificado” o mostrar ambas posiciones.

## Reglas de foro

- Una publicación puede ser dato, interpretación, hipótesis o predicción.
- Los gráficos se guardan como especificación reproducible, no solo como imagen.
- Permitir correcciones y versiones; no ocultar el historial editorial.
- Moderar spam, doxxing, difamación, discurso de odio, manipulación gráfica y citas falsas.
- Los votos ordenan atención comunitaria; no alteran `evidenceStatus` ni deciden moderación automáticamente.

## Sostenibilidad

- Mantener el conocimiento público esencial accesible y trazable.
- Monetizar hosting, capacidad, soporte, importaciones, dashboards y servicios, no conclusiones ni posiciones editoriales.
- No aceptar financiación condicionada a alterar fuentes, claims, moderación o predicciones.
- Registrar conflictos de interés y separar permisos financieros de curaduría.
- Toda propuesta comercial debe preservar la independencia editorial y la reproducibilidad.

## Alcance del agente

Antes de afirmar que una fuente, integración, predicción o prueba funciona, inspeccionarla o reproducirla. No hacer commit, push, despliegue, scraping agresivo ni consultas a producción sin solicitud explícita.


## Documentación y separación de productos

Este repositorio es público y ciudadano. NormaCheck conserva el producto personal privado; no copiar automáticamente su historial, datos, pizarrón ni módulos empresariales. No añadir credenciales, exportaciones personales o textos sin derechos revisados.

README.md orienta; AGENTS.md fija reglas; docs/STATUS.md registra hitos consolidados. La visión, arquitectura, API y roadmap deben distinguir implementación, propuesta y antecedente histórico. No crear documentos phase-XX.md ni duplicar logs en docs/verification-register.md. Usar npm run test:guards y npm run test:isolated desde platform/: PostgreSQL 16 desechable, entorno filtrado, credenciales aleatorias y marcador de identidad comprobado antes de migrar. No usar .env.test ni invocar proveedores pagados. Ejecutar tipos tras modificar TypeScript y exigir lint sin advertencias, build y git diff --check. Un proceso con código cero sin cierre de suites no acredita aprobación. No hacer commit, push o despliegue sin solicitud explícita.
