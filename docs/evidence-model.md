# Modelo de evidencia

## Principio

Una entidad o acontecimiento no es una afirmación. Un documento no garantiza que su contenido sea verdadero. Una fuente oficial no elimina sus definiciones, revisiones o sesgos. El sistema conserva por separado lo observado, lo afirmado, quién lo sostuvo, dónde, bajo qué derechos y cómo fue transformado.

## Vocabularios separados

### Estado epistemológico del claim

- `documented`: una fuente identificada sostiene explícitamente el enunciado o una observación registra el valor.
- `inferred`: conclusión humana explícita derivada de evidencias identificadas.
- `disputed`: fuentes o especialistas competentes sostienen posiciones incompatibles.
- `hypothesis`: propuesta falsable pendiente de evidencia suficiente.
- `forecast`: resultado futuro/escenario de un modelo con horizonte e incertidumbre.
- `unknown`: evidencia insuficiente para clasificar con mayor fuerza.

### Estado del flujo editorial

`draft`, `in_review`, `published`, `corrected`, `retracted` o `archived`.

Estos estados no se mezclan: un claim `published` puede ser `disputed`; un claim `retracted` conserva su revisión y motivo.

### Tipo de fuente

`primary_archive`, `official_statistical`, `official_administrative`, `academic_research`, `secondary_historiography`, `press`, `testimony`, `community_post`, `ai_output`.

El tipo orienta la interfaz y revisión, pero no calcula automáticamente verdad ni prioridad.

## Entidades canónicas mínimas

- `source`: obra/proveedor, responsables, URL/identificador, tipo y términos generales.
- `sourceArtifact`: archivo/payload exacto, retrieval, MIME, tamaño, hash, storage key y derechos por objeto.
- `documentSegment`: página, rango, tabla, celda, selector/fragmento, OCR y confianza.
- `entity`: persona, institución, lugar, gobierno, ley, concepto o indicador.
- `entityIdentifier`: ID externo, esquema, vigencia y tipo de equivalencia (`exact`, `close`, `related`).
- `event`: identidad de un acontecimiento/intervalo, sin convertir sus propiedades disputables en hechos implícitos.
- `placeAttestation`: nombre, tipo, geometría, intervalo, certeza y evidencia de una fuente concreta.
- `claim`: identidad estable del enunciado.
- `claimRevision`: texto, estado epistemológico, alcance temporal/espacial, autor, revisión editorial y relación con la versión previa.
- `evidenceLink`: relación tipada entre claimRevision y segmento/observación: `supports`, `contradicts`, `contextualizes`, `mentions`.
- `series`: concepto, proveedor, frecuencia, unidad y metodología.
- `seriesVintage`: versión/publicación de una serie y cobertura.
- `observation`: periodo, valor, flags/estado, unidad y vintage.
- `relationshipClaim`: sujeto, predicado, objeto, intervalo y revisión; no un edge sin fuente.
- `transformationRun`: entradas versionadas, código/método, parámetros, ambiente, salida, hashes y responsable.
- `forecastRun`: dataset, split temporal, baseline, modelo, hiperparámetros, backtest, horizonte, intervalos y limitaciones.
- `publicationRevision`: tipo, contenido, claims, conflictos, snapshot reproducible y revisión anterior.
- `moderationDecision`: regla, evidencia, actor, resultado, fecha y apelación.

## Evidence envelope

Cada claim, observación, relación, gráfico y pronóstico publicado referencia un sobre con:

```text
sourceId / sourceArtifactId
sourceType
sourceUrl + canonicalIdentifier
sourceName + responsibleAgent
publishedAt + retrievedAt
locator (page, table, row, selector, timecode or fragment)
softwareLicense + datasetLicense + itemRights
redistributionPolicy + requiredAttribution
contentHash + hashAlgorithm
dataVersion / vintage
transformationRunId + transformationMethod
reviewState + reviewer + reviewedAt
limitations + rightsNotes
```

Campos desconocidos se guardan como `unknown`/`null` con pendiente explícito; no se rellenan por inferencia de IA.

## Reglas de integridad

1. Corregir crea revisión; nunca reescribe la versión citada.
2. Un claim publicado exige al menos un `evidenceLink` localizable o queda `unknown`/hipótesis.
3. Una contradicción no se resuelve por conteo de fuentes. Se muestran alcance, competencia, independencia y método.
4. La misma URL recuperada con hash distinto crea un nuevo artefacto/versionado.
5. La licencia se evalúa por artefacto y derivación. La licencia del software no se hereda al dataset, ni la del sitio al objeto digital.
6. Un resultado de OCR conserva imagen/página y confianza; no es texto autoritativo.
7. `ai_output` nunca es evidencia de un hecho externo; puede registrar una inferencia pendiente y su contexto.
8. Votos, reputación, sponsors, ranking y frecuencia de repetición no escriben `evidenceStatus`.
9. Un `exactMatch` externo requiere revisión; reconciliación automática comienza como candidato.
10. Un gráfico o predicción cita vintages exactos, no solo `seriesId`.

## Tiempo y geografía inciertos

Fechas soportan instante/intervalo y límites `earliest`/`latest`, precisión y calendario. Geometrías se modelan como atestaciones con intervalo y certeza, no como propiedad eterna del lugar. Nombres y pertenencias territoriales también tienen vigencia y evidencia.

## Estadísticas y revisiones

- Preservar valor publicado, vintage, unidad, frecuencia, estado de observación y nota metodológica.
- Una revisión no sustituye silenciosamente el valor previo.
- Transformaciones —deflactar, desestacionalizar, indexar, interpolar— generan una serie derivada con método y entradas.
- La UI distingue dato observado, estimado, provisional, revisado e imputado cuando la fuente lo provea.
- Adoptar conceptos SDMX donde ayuden; no afirmar conformidad completa sin validación.

## Causalidad

La conexión `acontecimiento → mecanismo → indicador → resultado` se compone de claims distintos. Proximidad temporal, correlación o relevancia semántica solo justifican relaciones descriptivas/inferidas. Un claim causal exige método, supuestos, evidencia y revisión explícitos.

## Interoperabilidad

El modelo local puede exportarse parcialmente a PROV-O, JSON-LD/CIDOC/Linked Art, IIIF, Linked Places o SDMX. Las pérdidas y extensiones se documentan. Esas proyecciones no reemplazan las revisiones, incertidumbre ni derechos locales. Ver [ADR 0004](adr/0004-evidence-envelope-and-immutable-revisions.md).
