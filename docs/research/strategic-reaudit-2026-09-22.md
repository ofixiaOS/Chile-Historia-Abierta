# Reauditoría estratégica — 2026-09-22

> Antecedente histórico anterior a la separación pública. No es una instrucción vigente ni acredita el estado actual. Priorizar README.md, AGENTS.md y [STATUS.md](../STATUS.md); no ampliar este archivo con nuevos registros de fase.

## Alcance y método

Se revisaron `AGENTS.md`, `README.md`, las cuatro reglas de `.cursor/rules`, los documentos de visión, arquitectura, escala, evidencia, fuentes, API, IA, foro, monetización, roadmap, protocolo de alta fidelidad, registro de verificación y los ADR 0001–0002. El directorio inspeccionado no contiene `.git`; por ello no fue posible distinguir cambios locales de una línea base ni ejecutar `git diff --check`. Todo el contenido existente se trató como estado del usuario y no se modificó código.

La investigación externa priorizó especificaciones, documentación oficial, repositorios y licencias originales. La fecha de corte es 2026-09-22. La actividad observada en repositorios es una señal de mantenimiento, no una garantía futura. Las licencias descritas no sustituyen revisión jurídica para un uso concreto.

## Resumen ejecutivo

- **COMPROBADO:** AdonisJS 7 es una base TypeScript activa y apta para API, autenticación, moderación y orquestación. La versión 7 requiere Node.js 24; su paquete oficial de colas sigue marcado como experimental. Debe mantenerse la cola detrás de un contrato propio y fijar versión si se evalúa ese paquete.
- **COMPROBADO:** PostgreSQL/PostGIS conserva la mejor relación entre integridad, consulta temporal/espacial, coste operacional y compatibilidad para la fuente canónica inicial. `pgvector` permite comenzar sin una base vectorial separada.
- **PROBABLE:** la timeline debe ser una puerta de entrada destacada, no la única interfaz. Búsqueda, mapa, series, colecciones y publicaciones deben ser vistas pares sobre el mismo modelo de información.
- **COMPROBADO:** fuente, licencia, afirmación y versión no pueden colapsarse en un solo registro. Datos agregados como WHG y DBnomics conservan términos de fuentes heterogéneas; Memoria Chilena declara derechos por objeto digital. La licencia debe viajar por artefacto y por derivación.
- **PROBABLE:** conviene construir el flujo editorial, las publicaciones reproducibles y la reputación basada en evidencia dentro del dominio AdonisJS. Discourse, NodeBB y Omeka son productos maduros, pero introducirían otro modelo de identidad, autorización, versionado y evidencia.
- **COMPROBADO:** Vega-Lite ofrece una especificación declarativa versionable bajo BSD-3-Clause. Es mejor base para `ChartSpec` que guardar configuraciones específicas de una librería de renderizado.
- **PROBABLE:** OpenLayers es el candidato inicial más simple para capas raster/vector y formatos GIS; MapLibre GL JS debe evaluarse si el prototipo exige vector tiles, estilos GPU o navegación de gran densidad.
- **COMPROBADO:** Wikibase, Apache Jena/Fuseki, Qdrant, OpenSearch y Microsoft GraphRAG tienen licencias verificables y capacidades reales, pero ninguno es requisito del MVP. Su adopción debe depender de una prueba comparativa y un problema medido.
- **NO VERIFICADO:** capacidad real, coste mensual, cobertura de fuentes, calidad de recuperación, carga de moderación y demanda institucional. Requieren prototipos y datos observados, no estimaciones presentadas como hechos.

## Supuestos cuestionados

### “La timeline es el producto”

**PROBABLE — reformulado.** Una timeline comunica secuencia y permite zoom, pero es débil para preguntas sin fecha conocida, comparación espacial, análisis multivariable y controversias. La home debe comenzar por una pregunta/búsqueda y ofrecer rutas equivalentes: tiempo, territorio, indicadores, entidades, colecciones y discusión. La timeline queda como vista emblemática sincronizable con mapa y gráficos.

TimelineJS 3 es un proyecto bajo MPL-2.0 orientado a relatos lineales embebidos; su propia documentación describe el iframe como caso principal. Es reutilizable para relatos curados o prototipos, no como shell de exploración de un corpus denso.

### “Un evento es un hecho”

**PROBABLE — rechazado.** `event` identifica un acontecimiento o intervalo; lo que se afirma sobre él son `claimRevision` enlazadas a evidencias. Un evento puede tener fecha, geometría, participantes o interpretación disputadas. La interfaz no debe sumar fuentes como si la cantidad resolviera su calidad.

### “Open source implica datos reutilizables”

**COMPROBADO — rechazado.** La licencia del software no licencia el corpus. WHG publica su plataforma con BSD-3-Clause, pero su agregado y fuentes tienen términos propios; DBnomics mantiene los términos de los proveedores originales; Memoria Chilena separa la licencia del minisitio de los objetos digitales. El registro debe distinguir `softwareLicense`, `datasetLicense`, `itemRights` y `redistributionPolicy`.

### “RAG o un grafo validan la verdad”

**COMPROBADO — rechazado.** PROV-O modela procedencia, no veracidad. GraphRAG estructura recuperación, pero sus entidades y relaciones pueden ser generadas por LLM. Toda respuesta debe volver a fragmentos inmutables y localizaciones verificables; una relación inferida no adquiere estatus documental por aparecer en un grafo.

### “Preparar escala exige operar toda la escala”

**PROBABLE — rechazado.** Se necesitan límites, contratos, perfiles de consulta y datos inmutables desde el comienzo. Réplicas, Qdrant, OpenSearch, Fuseki o microservicios solo se activan al incumplir un SLO o requisito probado después de optimizar la etapa actual.

## Flujo de usuario de extremo a extremo

1. La persona formula una pregunta o elige una entrada por tema, periodo, territorio, entidad o serie.
2. La búsqueda devuelve grupos diferenciados: acontecimientos, claims, personas/instituciones, lugares, series, documentos y publicaciones. Cada resultado muestra fecha o intervalo, estado de evidencia y fuente principal.
3. La persona abre un espacio de exploración con controles compartidos. Cambiar rango temporal, territorio o tema actualiza timeline, mapa y datos sin cambiar la identidad de los recursos.
4. La timeline muestra densidad agregada al alejarse y acontecimientos al acercarse; nunca intenta pintar todos los objetos a la vez.
5. El mapa representa geometría válida para el periodo seleccionado, con incertidumbre espacial y temporal visible. Un nombre, frontera o pertenencia puede tener varias atestaciones.
6. El panel de acontecimiento separa descripción, claims documentadas, controversias, fuentes, actores, lugares y series relacionadas. Las relaciones `acontecimiento → mecanismo propuesto → indicador → resultado` llevan estado epistemológico independiente.
7. La persona inspecciona el fragmento o página que respalda cada claim, derechos de uso, fecha de recuperación, hash y transformaciones.
8. En el constructor de gráficos selecciona series y eventos; define filtros, unidades, transformaciones y método. La vista previa advierte revisiones, cambios metodológicos, doble eje y comparaciones incompatibles.
9. Antes de publicar elige `dato`, `interpretación`, `hipótesis` o `predicción`. El servidor valida requisitos distintos para cada tipo; no infiere el tipo desde popularidad o texto generado.
10. La publicación fija un snapshot reproducible: especificación de gráfico, consulta normalizada, versiones de series, fuentes, código/método y hashes.
11. Otros usuarios comentan citando evidencia, crean una réplica o hacen fork del análisis. Editar crea una revisión; corregir enlaza la revisión reemplazada y explica el motivo.
12. Moderación, apelación y declaración de conflictos quedan auditables. Votos ordenan atención comunitaria, pero no modifican `evidenceStatus`.

En móvil se priorizan búsqueda, panel y una vista visual a la vez. Timeline, mapa y gráfico no compiten simultáneamente por el ancho. Teclado, lector de pantalla, contraste, foco, texto alternativo y una tabla accesible equivalente son requisitos de aceptación.

## Proyectos y estándares investigados

### Reutilizar ahora

#### PostgreSQL, PostGIS y pgvector

- **Repositorio/licencia:** PostgreSQL License para `pgvector`; PostGIS GPL-2.0-or-later, sin contagiar a una aplicación que solo usa la base según su FAQ oficial.
- **Madurez/capacidad:** PostgreSQL ofrece particionamiento, vistas materializadas, roles y réplicas; PostGIS agrega índices y funciones espaciales; `pgvector` soporta búsqueda exacta, HNSW e IVFFlat.
- **Dependencia comercial:** ninguna obligatoria; existen ofertas administradas opcionales.
- **Integración/operación:** baja frente a agregar motores; acceso normal desde AdonisJS y workers Python.
- **Riesgo:** que ingestión, búsqueda y lectura pública compitan por el mismo primario. Se mitiga con presupuestos de consulta, jobs, read models y réplicas antes de cambiar de base.
- **Recomendación:** fuente canónica y búsqueda híbrida inicial mediante FTS + vectores + filtros de procedencia.

#### Vega-Lite

- **Repositorio/licencia:** BSD-3-Clause; repositorio activo observado.
- **Reutilizable:** gramática JSON declarativa, interacción y esquema validable.
- **Integración:** natural con frontend TypeScript; no impone backend.
- **Riesgo:** una spec válida puede seguir siendo engañosa. El dominio debe añadir reglas de unidad, ejes, transformaciones y procedencia.
- **Recomendación:** adoptar un `ChartSpec` propio que incluya o compile a una versión fijada de Vega-Lite, sin guardar solo SVG/PNG.

#### OpenAPI y HTTP condicional

- **Especificación/licencia:** OpenAPI está bajo Apache-2.0; RFC 9110 define ETag y solicitudes condicionales.
- **Recomendación:** contrato OpenAPI 3.1, JSON Schema compartido, paginación por cursor y ETags construidos desde versión de read model + parámetros normalizados.

#### IIIF Presentation API 3

- **Capacidad:** manifiestos para objetos digitales compuestos, `rights`, `requiredStatement`, estructura de páginas y anotaciones.
- **Recomendación:** consumir o emitir IIIF cuando una institución ya lo ofrezca. No duplicar pirámides de imágenes ni ocultar sus derechos en metadatos genéricos.

### Adaptar, no adoptar como dominio

#### OpenLayers y MapLibre GL JS

- **Licencias:** OpenLayers BSD-2-Clause; MapLibre GL JS BSD-3-Clause.
- **Capacidad:** OpenLayers simplifica múltiples formatos y servicios; MapLibre prioriza vector tiles y render WebGL.
- **Recomendación:** prototipo comparativo con un conjunto chileno representativo. Comenzar con OpenLayers si predominan GeoJSON/IIIF/WMS y densidad moderada; usar MapLibre si vector tiles y estilos de alto volumen demuestran mejor rendimiento/accesibilidad. El `MapRenderer` debe evitar que el dominio dependa de cualquiera.

#### TimelineJS 3

- **Licencia:** MPL-2.0.
- **Madurez:** repositorio amplio y activo; enfoque oficial en storytelling y embeds.
- **Recomendación:** reutilizar para relatos o colecciones curadas. Construir la exploración temporal principal sobre el propio contrato de eventos/read model.

#### Linked Places Format y World Historical Gazetteer

- **Capacidad:** LPF modela nombres, geometrías, tipos y relaciones con alcance temporal y certeza; WHG expone API y reconciliación.
- **Licencias:** código de WHG BSD-3-Clause; agregado WHG CC-BY-NC-4.0 y fuentes heterogéneas. En el repositorio inspeccionado de LPF no apareció archivo de licencia: **NO VERIFICADO** como especificación reutilizable bajo licencia clara.
- **Recomendación:** adaptar conceptos de atestación temporal y mantener exportadores tras revisión de licencia. WHG puede ser fuente de reconciliación, no autoridad automática ni dependencia de tiempo de ejecución.

#### W3C PROV-O, CIDOC CRM y Linked Art

- **Estado:** PROV-O es recomendación W3C; CIDOC CRM 7.1.3 es una ontología formal para interoperabilidad cultural; Linked Art 1.0 está publicado bajo CC BY 4.0 y usa JSON-LD/CIDOC CRM.
- **Límite comprobado:** Linked Art declara fuera de alcance la procedencia fina de datos y la cuantificación de incertidumbre. No reemplaza el modelo epistemológico del proyecto.
- **Recomendación:** usar PROV como perfil de exportación y vocabulario de derivación. Crear un mapeo acotado a CIDOC/Linked Art después de estabilizar el modelo local; no persistir el dominio en triples desde el MVP.

#### DBnomics y SDMX

- **Licencias:** DBnomics declara ODbL para el agregado, repositorios con licencias propias —muchos fetchers AGPLv3+— y términos originales por proveedor.
- **Capacidad:** API normalizada sobre múltiples productores. SDMX modela datos y metadatos estadísticos y mantiene guías de versionado.
- **Recomendación:** DBnomics es un conector conveniente y contrastable, no fuente originaria. Preservar código del proveedor, payload, fecha, revisión y licencia. Adaptar conceptos SDMX de estructura, estado de observación y versión sin exigir SDMX completo al MVP.

### Integrar solo tras un gate medido

#### OpenSearch

- **Licencia/madurez:** Apache-2.0, repositorio activo y motor distribuido; soporta búsqueda híbrida y pipelines de combinación.
- **Coste:** otro clúster JVM, índices derivados, sincronización y operación.
- **Gate:** considerar si FTS + `pgvector` no cumple simultáneamente relevancia y SLO en un corpus de prueba, después de índices/caché, y OpenSearch mejora el objetivo acordado por al menos 30% sin perder trazabilidad ni exceder presupuesto operativo.

#### Qdrant

- **Licencia/madurez:** Apache-2.0, API REST/OpenAPI, búsqueda densa, dispersa e híbrida; cloud comercial opcional.
- **Coste:** segundo almacén derivado, reindexación y consistencia.
- **Gate:** considerar si la carga vectorial degrada al primario o no cumple recall/latencia tras ajustar HNSW/IVFFlat, y una prueba reproducible demuestra ≥30% de mejora en el criterio limitante a calidad equivalente.

#### Apache Jena/Fuseki

- **Licencia/madurez:** Apache-2.0; implementa RDF, SPARQL y servidor Fuseki.
- **Coste:** Java, otra representación e índices, sincronización y superficie pública de consultas costosas.
- **Gate:** integrar como proyección si existen al menos dos consumidores/alianzas que requieran SPARQL o RDF interoperable y un perfil acotado no satisface el caso mediante exportaciones estáticas.

#### Wikibase

- **Licencia/madurez:** GPL-2.0 para la extensión inspeccionada; impulsa Wikidata y ofrece statements con calificadores y referencias.
- **Coste:** stack MediaWiki/PHP separado, UX editorial e identidad distintas, sincronización bidireccional difícil.
- **Gate:** evaluar solo si una comunidad editorial multilingüe necesita edición colaborativa tipo wiki y el coste de construir esa función supera una integración probada. No convertirlo en primario por moda semántica.

#### Microsoft GraphRAG

- **Licencia/actividad:** MIT y actividad reciente observada.
- **Capacidad:** indexación con extracción, comunidades y búsqueda local/global; requiere interacciones con modelos y prompt tuning.
- **Riesgo:** coste, relaciones alucinadas, actualización y evaluación complejas.
- **Gate:** solo experimento offline cuando un benchmark etiquetado muestre que la recuperación híbrida falla preguntas multi-documento/multi-hop relevantes. Nunca publica relaciones extraídas sin revisión.

### Descartar por ahora

#### Omeka S

GPL-3.0, proyecto maduro para colecciones GLAM, pero exige LAMP/MySQL/PHP. Puede inspirar interoperabilidad y exhibiciones; adoptarlo duplicaría la plataforma y el modelo editorial.

#### Recogito 2

Apache-2.0 y valioso para anotación semántica, pero el repositorio inspeccionado exige Java 8, Node 10 y Elasticsearch 5.6.5. Es material de diseño o herramienta externa aislada, no dependencia de producción.

#### Discourse y NodeBB como foro principal

Discourse es GPL-2.0-or-later y maduro sobre Rails/PostgreSQL; NodeBB es GPL-3.0, Node.js y soporta PostgreSQL/Redis/MongoDB. Ambos resuelven comunidad general, pero no el contrato central `claim ↔ evidence ↔ chart snapshot ↔ revision`. Integrarlos temprano crea dos identidades y dos políticas de moderación. Construir el subconjunto de discusión necesario en AdonisJS; reevaluar si la operación comunitaria supera al dominio histórico.

#### ActivityPub, federación y microservicios

ActivityPub es recomendación W3C, pero la federación amplía spam, moderación y abuso antes de validar una comunidad local. Microservicios tampoco aportan un límite útil sin equipos o cargas independientes. Se descartan en MVP.

## Fuentes chilenas y latinoamericanas

- **Banco Central BDE — COMPROBADO:** API con cuenta/token, máximo declarado de cinco series por segundo por cuenta, reproducción/adaptación permitida con atribución y términos revocables/modificables. Ingerir snapshots; nunca depender de consulta en vivo para servir el sitio.
- **INE — COMPROBADO PARCIAL:** existe una página oficial de términos y licencia de datos abiertos. La licencia y metodología deben registrarse por dataset antes de alta; no se verificó una API uniforme para todos los productos.
- **Datos Abiertos del Congreso — COMPROBADO:** el portal declara uso libre de trabas de sus datos legislativos. Registrar, aun así, endpoint, versión, fecha y alcance por recurso.
- **Memoria Chilena — COMPROBADO:** los minisitios usan CC BY-SA 3.0, pero los objetos digitales tienen derechos caso a caso. Nunca heredar automáticamente la licencia del minisitio al PDF o imagen.
- **Archivo Nacional — NO VERIFICADO para redistribución masiva:** se verificaron servicios y condiciones de reproducción, no una licencia general de descarga/republicación.
- **OpenHistoricalMap — COMPROBADO PARCIAL:** los datos se declaran CC0 salvo elementos con `license=*`; no se verificó una licencia única para todo su conjunto de software. Ingerir solo objetos cuya atribución/derechos queden preservados.
- **WHG — PROBABLE como apoyo:** incluye fuentes latinoamericanas y licencia/atribución por namespace. Su agregado CC-BY-NC afecta usos comerciales; evaluar por dataset y preferir reconciliación offline.

## Arquitectura por escenarios

No se estiman usuarios, filas ni coste sin medición. Cada escenario describe forma operativa y señales de cambio.

### Pequeño: validar corpus y flujo

- Un monolito modular AdonisJS 7, un PostgreSQL/PostGIS con `pgvector`, object storage compatible con S3 y uno o más procesos worker.
- Cola detrás de `JobQueue`; la opción oficial de AdonisJS se considera experimental y debe ir fijada y evaluada. Una cola de base puede bastar inicialmente.
- FTS + vector + filtros, read models en PostgreSQL, CDN para artefactos públicos.
- SLOs iniciales definidos tras una prueba de carga reproducible; no se publican cifras inventadas.

### Mediano: lectura pública dominante

- CDN, ETags, caché compartida y read models refrescados por outbox.
- Rol/host de lectura público sin permisos sobre tablas editoriales; réplicas cuando lecturas sostenidas interfieran con ingesta/escritura.
- Workers separados por clase de recurso; DLQ, reintentos acotados, idempotency keys y presupuesto por proveedor.
- Motor especializado solo si gana el benchmark de gate correspondiente.

### Grande: ecosistema y corpus heterogéneo

- Réplicas y particionamiento basados en planes de consulta y crecimiento observados; exportaciones/snapshots versionados en object storage/CDN.
- Separar un módulo como servicio únicamente si necesita escalar/deplegarse de forma independiente y la separación reduce un problema observado de disponibilidad, coste o propiedad del equipo.
- RDF/SPARQL, motor de búsqueda o vectorial siguen siendo proyecciones reconstruibles desde el canónico; nunca nuevos árbitros de verdad.

## Condiciones medibles de evolución

Antes de agregar tecnología se registra un ADR con corpus, carga, métrica, línea base, candidato, coste, resultado y plan de reversa.

- **Caché/read model:** activar cuando una consulta pública repetida consume presupuesto significativo o incumple SLO; el read model debe ser reconstruible y exponer `generatedAt`/`sourceVersion`.
- **Réplica:** activar cuando, durante ventanas representativas, la lectura pública causa saturación/colas o afecta ingestión después de índices, límites y caché.
- **Particionamiento:** activar solo con tablas y consultas que demuestren pruning útil en `EXPLAIN (ANALYZE, BUFFERS)`; no por número hipotético de filas.
- **OpenSearch/Qdrant:** gate de benchmark indicado arriba, incluyendo coste mensual y operación de reindexado.
- **Jena/Wikibase/grafo dedicado:** requisito externo o patrón multi-hop documentado, no deseo abstracto de “tener un knowledge graph”.
- **Microservicio:** límite de dominio estable, necesidad de ciclo de despliegue/escala distinto y al menos dos incidentes o una degradación repetible atribuible al acoplamiento; si no, mantener módulo.
- **GraphRAG:** conjunto de evaluación etiquetado, mejora verificable sobre RAG híbrido y revisión humana de extracción.

## Seguridad y abuso

- Las URLs de conectores no provienen directamente del usuario: allowlist de host/esquema, resolución DNS controlada, bloqueo de rangos privados/metadata, límites de redirección, tamaño y tiempo.
- Documentos, OCR, web y posts son datos no confiables para el LLM. Ninguno puede cambiar instrucciones del sistema ni autorizar herramientas; la defensa no depende solo de un segundo LLM clasificador.
- Sanitizar HTML/SVG, servir adjuntos desde dominio aislado, verificar MIME por contenido, rechazar ejecutables y aplicar antivirus donde corresponda.
- Separar rate limit de búsqueda, exportación, login, publicación, comentarios y llamadas con IA; incluir cuotas de complejidad además de peticiones.
- Moderación combina controles preventivos, rate limits, reportes, trazabilidad, apelación y revisión humana. No prometer detección automática perfecta de difamación o citas falsas.
- Scraping público se gestiona con caché, cuotas, snapshots descargables y términos claros; no se presenta como un problema eliminable.

## Sostenibilidad e independencia

### Núcleo gratuito

Exploración pública, fuentes y controversias, páginas citables, API de uso razonable, OpenAPI, correcciones, política editorial, exportaciones/snapshots seleccionados y acceso a especificaciones de gráficos.

### Capacidad cobrable

- Universidades y centros: espacios privados, corpus propios, SSO, soporte, cuotas mayores, notebooks/exportaciones y capacitación.
- Colegios: colecciones didácticas, guías, talleres y administración institucional; nunca una versión simplificada que oculte controversias.
- Medios: embeds con SLA, snapshots, consultas masivas y visualizaciones personalizadas.
- Fundaciones/archivos: digitalización, OCR, reconciliación, catalogación y exhibiciones, con derechos definidos por contrato.
- Bibliotecas: hosting de colecciones, IIIF, migración y soporte de preservación.

### Barreras de independencia

- Política pública de aceptación de fondos y registro de patrocinador, monto/rango, destino, duración y conflicto.
- Patrocinio nunca concede permisos editoriales, moderación, ranking, `evidenceStatus` ni acceso anticipado a correcciones sensibles.
- Curaduría y finanzas tienen roles separados; claims que involucren a un financiador muestran el conflicto y requieren revisión independiente.
- Publicar informe anual de ingresos por categoría y gastos; contratos institucionales no ocultan cambios al corpus público.
- Donaciones y fiscal hosting son opciones a evaluar. GitHub documenta 0% de comisión para patrocinios desde cuentas personales y hasta 6% desde organizaciones; elegibilidad, impuestos y estructura chilena siguen **NO VERIFICADOS**.

## Mapa final de decisiones

### Construir ahora

- modelo de evidencia y revisiones inmutables;
- flujo búsqueda → exploración multivista → gráfico → publicación reproducible;
- módulos AdonisJS de API, editorial, comunidad y moderación;
- fuente canónica PostgreSQL/PostGIS y búsqueda FTS + `pgvector`;
- read models públicos, outbox, jobs idempotentes y object storage;
- `ChartSpec` versionado basado en Vega-Lite;
- política de licencias por artefacto y atribución visible;
- OpenAPI `/v1`, snapshots y métricas de calidad/operación.

### Preparar mediante interfaces

- `SourceConnector`, `SearchProvider`, `MapRenderer`, `ChartRenderer`, `ObjectStorage`, `JobQueue`, `EmbeddingProvider`, `ForecastProvider`, `ProvenanceExporter` y `ModerationProvider`;
- exportaciones IIIF/PROV/JSON-LD/SDMX donde exista un caso;
- read models reconstruibles y eventos de outbox versionados.

### Integrar posteriormente

- Qdrant u OpenSearch tras benchmark;
- Jena/Fuseki o Wikibase por requisito de interoperabilidad/edición;
- GraphRAG tras evaluación etiquetada;
- MCP como adaptador de herramientas de solo lectura sobre la API, no como API canónica;
- réplica, particionamiento, vector tiles y servicios separados tras medición.

### Descartar por ahora

- Omeka S, Recogito 2 y un foro externo como núcleo;
- ActivityPub/federación;
- microservicios, Kubernetes y grafo dedicado sin gate;
- consulta directa a proveedores para responder tráfico público;
- ranking de verdad por votos, sponsors o LLM;
- timeline única, imagen histórica gigante o predicción sin baseline/backtesting.

## Riesgos y oportunidades

### Riesgos prioritarios

- **COMPROBADO:** incompatibilidad o heterogeneidad de licencias puede impedir redistribución aunque la API sea accesible.
- **PROBABLE:** normalizar temprano puede borrar definiciones estadísticas, calendarios, fronteras y controversias.
- **PROBABLE:** el mayor coste humano será curaduría/moderación, no almacenamiento.
- **PROBABLE:** una interfaz visual puede producir certeza falsa si oculta incertidumbre y revisiones.
- **NO VERIFICADO:** demanda suficiente para planes institucionales y disposición a pagar.

### Oportunidades

- **PROBABLE:** diferenciarse por evidencia localizable, correcciones y análisis reproducibles, no por “más IA”.
- **COMPROBADO:** estándares como IIIF, PROV-O, OpenAPI y Vega-Lite permiten interoperabilidad sin operar un stack semántico completo.
- **PROBABLE:** snapshots descargables y planes de capacidad institucional pueden financiar el acceso público sin vender conclusiones.

## Conclusiones por estado

### COMPROBADO

- Las licencias de código y datos son dimensiones distintas y las fuentes agregadas pueden mezclar términos.
- AdonisJS 7 está activo, es TypeScript-first, usa licencia MIT y exige Node.js 24; su cola oficial es experimental.
- PostgreSQL/PostGIS/pgvector, Vega-Lite, OpenLayers/MapLibre, OpenAPI, Qdrant, OpenSearch, Jena, Wikibase, GraphRAG, Omeka, Recogito, Discourse y NodeBB tienen los repositorios/licencias indicados en las fuentes directas.
- Banco Central, Congreso, INE y Memoria Chilena publican términos distintos que deben preservarse por fuente/objeto.

### PROBABLE

- La arquitectura modular PostgreSQL-first minimiza reescritura y operación para el MVP.
- Varias vistas coordinadas responden mejor que una timeline única.
- Un foro de dominio acotado en AdonisJS reduce duplicación de identidad, permisos y evidencia.
- La principal propuesta de valor sostenible es capacidad/servicio institucional sobre conocimiento público abierto.

### NO VERIFICADO

- SLO, volumen, relevancia de búsqueda, coste de IA/infraestructura, carga de moderación y capacidad del equipo.
- Licencia reutilizable de Linked Places Format como especificación y licencia única del software completo de OpenHistoricalMap.
- Licencia/metodología individual de cada dataset todavía no ingerido.
- Estructura legal, fiscal hosting y tratamiento tributario óptimos para operar desde Chile.
- Que GraphRAG, Qdrant, OpenSearch, Wikibase o Jena mejoren el producto en su corpus real.

## Fuentes directas abiertas

### Plataforma y datos

- [AdonisJS: introducción](https://docs.adonisjs.com/introduction), [upgrade v7](https://docs.adonisjs.com/v6-to-v7), [cola experimental](https://docs.adonisjs.com/guides/digging-deeper/queues) y [repositorio MIT](https://github.com/adonisjs/core)
- [pgvector y licencia](https://github.com/pgvector/pgvector), [PostGIS y licencia](https://github.com/postgis/postgis/blob/master/LICENSE.TXT), [FAQ GPL](https://postgis.net/documentation/faq/gpl-license/)
- [PostgreSQL: particionamiento](https://www.postgresql.org/docs/current/ddl-partitioning.html) y [vistas materializadas](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- [Vega-Lite](https://github.com/vega/vega-lite), [OpenLayers](https://github.com/openlayers/openlayers), [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)
- [TimelineJS 3](https://github.com/NUKnightLab/TimelineJS3)
- [IIIF Presentation API 3](https://iiif.io/api/presentation/3.0/)

### Semántica, RAG y búsqueda

- [PROV-O](https://www.w3.org/TR/prov-o/), [CIDOC CRM 7.1.3](https://cidoc-crm.org/get-last-official-release), [Linked Art 1.0](https://linked.art/model/)
- [Wikibase y GPL-2.0](https://github.com/wikimedia/mediawiki-extensions-Wikibase/blob/master/COPYING), [Apache Jena/Fuseki](https://jena.apache.org/documentation/)
- [Microsoft GraphRAG](https://github.com/microsoft/graphrag), [documentación de prompt tuning](https://microsoft.github.io/graphrag/prompt_tuning/overview/)
- [Qdrant](https://github.com/qdrant/qdrant), [OpenSearch](https://github.com/opensearch-project/OpenSearch), [búsqueda híbrida OpenSearch](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/)
- [World Historical Gazetteer: API y atribución](https://docs.whgazetteer.org/content/technical/apis.html), [licencias](https://whgazetteer.org/licenses/) y [código BSD-3-Clause](https://github.com/WorldHistoricalGazetteer/website)
- [Linked Places Format](https://github.com/LinkedPasts/linked-places-format), [Recogito 2](https://github.com/pelagios/recogito2)

### Comunidad, API y seguridad

- [Discourse open source](https://www.discourse.org/open-source), [NodeBB](https://github.com/NodeBB/NodeBB), [Omeka S](https://github.com/omeka/omeka-s)
- [OpenAPI](https://spec.openapis.org/oas/), [licencia Apache-2.0](https://github.com/OAI/OpenAPI-Specification/blob/main/LICENSE), [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)
- [MCP y transición de licencia](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/LICENSE)
- [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

### Series y fuentes

- [SDMX: guías y versionado](https://sdmx.org/guidelines/), [DBnomics: términos y licencias](https://db.nomics.world/about)
- [Banco Central BDE: términos](https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/terminos_condiciones.html) y [documentación API](https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/documentacion.html)
- [INE: términos y licencia de datos abiertos](https://www.ine.gob.cl/terminos-de-uso-y-licencia-de-datos-abiertos)
- [Congreso Nacional: datos abiertos legislativos](https://opendata.congreso.cl/)
- [Memoria Chilena: preguntas frecuentes y derechos](https://www.memoriachilena.gob.cl/602/w3-article-123838.html)
- [OpenHistoricalMap: exportación y licencia de datos](https://www.openhistoricalmap.org/export), [licencias por objeto](https://wiki.openstreetmap.org/wiki/Open_Historical_Map/Tags/Key/license)

### Sostenibilidad

- [GitHub Sponsors: comisiones e impuestos](https://docs.github.com/en/sponsors/sponsoring-open-source-contributors/about-sponsorships-fees-and-taxes)
- [Open Collective: fiscal hosting](https://opencollective.com/fiscal-hosting), [Open Source Collective](https://docs.oscollective.org/)
