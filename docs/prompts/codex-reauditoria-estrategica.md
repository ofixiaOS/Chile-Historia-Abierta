# Prompt maestro para reauditar Chile Historia Abierta

> Antecedente histórico anterior a la separación pública. No es una instrucción vigente ni acredita el estado actual. Priorizar README.md, AGENTS.md y [STATUS.md](../STATUS.md); no ampliar este archivo con nuevos registros de fase.

Ejecuta este prompt desde la raíz del proyecto `Chile Historia Abierta`, de modo que Codex cargue primero su `AGENTS.md`.

---

## Prompt

Actúa como arquitecto principal, investigador técnico y estratega de producto de **Chile Historia Abierta**. Tu tarea es volver a examinar críticamente la idea completa, investigar alternativas actuales y mejorar el plan y la documentación. No debes asumir que las decisiones actuales son correctas solo porque ya están documentadas.

### Objetivo

Realiza una reauditoría integral y basada en evidencia de esta propuesta:

> Una plataforma pública y abierta para explorar la historia, economía y sociedad chilena mediante una línea de tiempo navegable, mapas, series estadísticas, fuentes trazables, foro con gráficos reproducibles, RAG/knowledge graph, predicciones claramente delimitadas y una API pública consultable por personas y sistemas de IA.

Debes determinar:

1. Qué partes de la idea son sólidas, cuáles están incompletas y cuáles deben cambiar.
2. Qué proyectos open source, estándares y datasets existentes conviene reutilizar, integrar, adaptar, bifurcar o descartar.
3. Qué arquitectura permitirá comenzar de forma pragmática sin obligar a reescribir el dominio cuando crezcan el tráfico, los datos o la comunidad.
4. Cómo mejorar el flujo de usuario, la navegación temporal, la búsqueda, el mapa, el foro, los gráficos y la API para IA.
5. Cómo sostener el proyecto económicamente sin comprometer independencia editorial ni acceso público esencial.
6. Qué riesgos técnicos, editoriales, legales, de licencias, seguridad, moderación, privacidad y desinformación faltan documentar.

### Contexto obligatorio

Lee completamente antes de concluir:

- `AGENTS.md`
- `README.md`
- `.cursor/rules/*.mdc`
- `docs/vision-and-boundaries.md`
- `docs/architecture.md`
- `docs/scalability.md`
- `docs/evidence-model.md`
- `docs/data-sources/source-register.md`
- `docs/api/public-api.md`
- `docs/ai-grounding.md`
- `docs/forum-and-charts.md`
- `docs/monetization.md`
- `docs/roadmap.md`
- `docs/skills/high-fidelity-engineering.md`
- `docs/verification-register.md`
- `docs/adr/*.md`

Inspecciona además el estado real de la carpeta y preserva cualquier cambio local. No borres ni reemplaces decisiones anteriores sin dejar trazabilidad.

### Investigación externa obligatoria

Usa búsqueda web actual. Prioriza documentación oficial, repositorios originales, papers y fuentes primarias. No bases decisiones relevantes en snippets, blogs SEO o respuestas de otros LLM.

Investiga al menos estas categorías:

- atlas, timelines y mapas históricos open source;
- knowledge graphs históricos y humanidades digitales;
- Wikibase, RDF/SPARQL, CIDOC CRM, Linked Open Data y alternativas pragmáticas;
- RAG, GraphRAG y recuperación híbrida con procedencia;
- series económicas versionadas y APIs estadísticas;
- herramientas de gráficos reproducibles y publicación de notebooks/análisis;
- plataformas comunitarias, moderación y reputación basada en evidencia;
- APIs públicas orientadas a agentes e IA, OpenAPI, MCP y datos descargables;
- sostenibilidad de proyectos open source, fiscal hosting, grants y planes institucionales;
- experiencias chilenas o latinoamericanas comparables.

Para cada proyecto candidato verifica, cuando sea posible:

- repositorio y sitio oficial;
- licencia del código y licencia de los datos por separado;
- actividad y madurez observables;
- capacidades reutilizables;
- dependencia de servicios comerciales;
- coste de integración y operación;
- riesgo de abandono o lock-in;
- compatibilidad con AdonisJS 7, PostgreSQL/PostGIS y una API pública versionada.

No llames “open source” a un proyecto cuya licencia no hayas comprobado. Un repositorio público sin licencia clara no cuenta automáticamente como software libre reutilizable.

### Preguntas que debes desafiar

- ¿La línea de tiempo debe ser la interfaz principal o solo una de varias vistas?
- ¿PostgreSQL/PostGIS/pgvector sigue siendo la mejor base inicial y de crecimiento?
- ¿Cuándo se justificarían Wikibase, Jena/Fuseki, Qdrant, OpenSearch o un grafo dedicado?
- ¿Conviene integrar componentes existentes o construir la experiencia completa sobre AdonisJS 7?
- ¿Cómo evitar reprogramar el dominio al migrar búsqueda, cache, almacenamiento o forecasting?
- ¿Qué debe ser dato canónico, qué debe ser un claim y qué debe ser una interpretación comunitaria?
- ¿Cómo impedir que votos, sponsors o LLM conviertan una afirmación débil en “verdad”?
- ¿Cómo conservar revisiones estadísticas, documentos originales, hashes, licencias y correcciones?
- ¿Cómo diseñar una lectura pública de alto tráfico sin exponer las rutas editoriales?
- ¿Qué monetización puede generar ingresos recurrentes sin privatizar el conocimiento básico?

### Arquitectura y escala

Evalúa escenarios pequeños, medianos y grandes. No inventes cifras de capacidad: explicita supuestos y principales factores de coste.

Revisa especialmente:

- aplicación modular stateless;
- separación de lectura pública y escritura editorial;
- CDN, ETag, cache y read models;
- PostgreSQL primario, réplicas, particionamiento y vistas materializadas;
- object storage versionado;
- colas idempotentes, transactional outbox y dead-letter queue;
- observabilidad, backups y recuperación;
- protección ante abuso, scraping, spam, prompt injection, SSRF y cargas costosas;
- contratos reemplazables para fuentes, búsqueda, almacenamiento, gráficos y pronósticos;
- criterios medibles para extraer microservicios, incorporar un grafo o cambiar de motor de búsqueda.

La meta no es diseñar infraestructura vistosa, sino preservar el dominio y evitar migraciones destructivas. Rechaza complejidad que no tenga una condición concreta de activación.

### Producto y experiencia

Propón un flujo completo desde una pregunta inicial hasta una publicación reproducible. Considera:

- búsqueda simple y avanzada;
- zoom temporal y navegación por capas;
- mapa histórico;
- panel de acontecimiento con fuentes y controversias;
- constructor visual de gráficos;
- conexión explícita entre acontecimiento, mecanismo propuesto, indicador y resultado;
- publicación como dato, interpretación, hipótesis o predicción;
- réplica, fork, corrección y versionado de análisis;
- moderación, reputación y conflictos de interés;
- accesibilidad, uso móvil y rendimiento.

No diseñes una “imagen gigante” estática. Decide qué vistas complementarias necesita el mismo modelo de información.

### Evidencia y límites

Clasifica cada conclusión relevante como:

- `COMPROBADO`: inspeccionado en documentación primaria, repositorio, licencia o evidencia reproducible.
- `PROBABLE`: inferencia razonada que todavía requiere validación.
- `NO VERIFICADO`: no existe evidencia suficiente o no se pudo comprobar.

Distingue siempre:

- fuente primaria;
- dato oficial;
- investigación académica;
- fuente secundaria;
- testimonio;
- hipótesis comunitaria;
- inferencia de IA;
- pronóstico estadístico.

No confundas correlación con causalidad. No uses al LLM como fuente canónica. Si una fuente contradice otra, conserva el desacuerdo y explica su alcance.

### Alcance de cambios autorizado

Puedes modificar únicamente documentación, reglas y ADRs. No implementes todavía la aplicación, no instales dependencias, no crees servicios cloud, no despliegues, no hagas commit ni push.

Primero completa la investigación y redacta el diagnóstico. Después actualiza la documentación para que refleje las decisiones mejor sustentadas. Conserva el historial conceptual mediante ADRs nuevos cuando cambie una decisión importante.

No copies documentación de proyectos externos. Resume con atribución y enlaces.

### Entregables obligatorios

1. Crear `docs/research/strategic-reaudit-YYYY-MM-DD.md` con:
   - resumen ejecutivo;
   - supuestos cuestionados;
   - proyectos y estándares investigados;
   - comparación `reutilizar / adaptar / construir / descartar`;
   - riesgos y oportunidades;
   - conclusiones `COMPROBADO / PROBABLE / NO VERIFICADO`;
   - fuentes con enlaces directos.
2. Actualizar, si la evidencia lo justifica:
   - `docs/architecture.md`;
   - `docs/scalability.md`;
   - `docs/evidence-model.md`;
   - `docs/data-sources/source-register.md`;
   - `docs/api/public-api.md`;
   - `docs/ai-grounding.md`;
   - `docs/forum-and-charts.md`;
   - `docs/monetization.md`;
   - `docs/roadmap.md`.
3. Crear ADRs para decisiones nuevas o reversadas. No edites silenciosamente una decisión estructural.
4. Actualizar `AGENTS.md` o reglas solo cuando aparezca una norma durable y concreta; evita inflarlas con consejos genéricos.
5. Entregar un mapa final de decisiones con:
   - construir ahora;
   - preparar mediante interfaces;
   - integrar después;
   - descartar por ahora.

### Se considera terminado cuando

- todas las fuentes importantes fueron abiertas y verificadas, no solo encontradas en resultados de búsqueda;
- licencias de código y datos quedaron diferenciadas;
- existe una recomendación clara sobre AdonisJS 7 y cada componente open source;
- el flujo de usuario está definido de extremo a extremo;
- la arquitectura tiene condiciones medibles de evolución y no depende de reescribir el dominio;
- monetización e independencia editorial son compatibles;
- no hay contradicciones evidentes entre README, arquitectura, roadmap, ADRs y AGENTS;
- los enlaces y frontmatter modificados fueron revisados;
- el informe final enumera archivos cambiados, evidencia usada, decisiones rechazadas y pendientes reales;
- no se modificó código de aplicación ni se realizó commit, push o despliegue.

Trabaja con autonomía, pero no rellenes vacíos con seguridad artificial. Si algo no puede verificarse, documéntalo como pendiente concreto en lugar de inventar una respuesta.

---

## Uso recomendado

- Ejecutar con razonamiento alto o muy alto.
- Abrir la carpeta `Chile Historia Abierta` como proyecto antes de pegar el prompt.
- Mantener esta tarea separada de la implementación para poder revisar primero las decisiones.
- Después de aprobar la reauditoría, crear otra tarea para implementar el primer hito del roadmap actualizado.
