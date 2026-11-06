# Registro inicial de fuentes

Fecha de revisión documental: 2026-09-22. Este registro autoriza investigación, no ingestión automática. Cada dataset/colección necesita una ficha de alta y una prueba acotada antes de publicación.

## Estados

- `candidate`: sitio/documentación identificados; conector no aprobado.
- `rights_review`: faltan derechos, atribución o redistribución por dataset/objeto.
- `technical_review`: faltan payload, cobertura, metodología, límites o estabilidad.
- `approved_for_pilot`: licencia y muestra verificadas para un piloto delimitado.
- `blocked`: uso incompatible, revocado o sin base suficiente.

Ninguna entrada está `approved_for_pilot` todavía. Las fichas individuales deben coincidir con este registro; una ficha no constituye aprobación sin payload, hash reproducible, localizador y revisión de derechos para el recurso concreto.

La revisión de los datos incrustados en código detectó ejemplos con hashes, localizadores y licencias no sustentados. Permanecen como fixtures de pruebas y no constituyen un corpus publicable. Ver [auditoría de fixtures y derechos](fixture-rights-audit-2026-09-22.md).

## Chile

### Banco Central de Chile — BDE

- **Estado:** `rights_review` (también falta cerrar la revisión técnica de las series del piloto).
- **Uso:** series macroeconómicas/financieras.
- **Acceso comprobado:** REST/SOAP y librería; cuenta y token; máximo declarado de cinco series por segundo por cuenta.
- **Derechos:** revisar términos vigentes y terceros por código de serie; el alcance general no acredita derechos de un artefacto concreto.
- **Requisito:** snapshot local, catálogo de códigos, vintage/fecha de publicación, unidad/metodología, atribución y rate limit propio.
- **Fuentes:** [API](https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/documentacion.html), [términos](https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/terminos_condiciones.html).

### Instituto Nacional de Estadísticas — INE

- **Estado:** `rights_review` + `technical_review` por producto.
- **Uso:** población, empleo, precios y estadísticas sociales.
- **Comprobado:** existe licencia oficial de datos abiertos y descargo metodológico.
- **No verificado:** API uniforme, cobertura, revisión y licencia concreta de cada recurso candidato.
- **Fuente:** [términos y licencia](https://www.ine.gob.cl/terminos-de-uso-y-licencia-de-datos-abiertos).

### Datos Abiertos del Congreso Nacional / BCN

- **Estado:** `rights_review` (también falta cerrar la revisión técnica del recurso del piloto).
- **Uso:** tramitación, parlamentarios, leyes e historia legislativa.
- **Derechos:** verificar términos y derechos del recurso/objeto concreto; no inferir que toda norma u objeto puede redistribuirse desde una ficha del portal.
- **Requisito:** registrar si el recurso proviene de Cámara, Senado o BCN; endpoint, muestra, fecha, hash, identificador normativo, versión y cobertura.
- **Fuente:** [portal oficial](https://opendata.congreso.cl/).

### Memoria Chilena / Biblioteca Nacional

- **Estado:** `rights_review` por objeto.
- **Uso:** documentos, imágenes, colecciones y contexto curatorial.
- **Derechos comprobados:** minisitios CC BY-SA 3.0; los objetos digitales no heredan esa licencia y exponen situación de propiedad intelectual individual.
- **Regla:** almacenar `itemRights` de la ficha; no descargar/redistribuir si el permiso no es explícito. Enlazar o mostrar mediante mecanismo permitido cuando corresponda.
- **Fuente:** [preguntas frecuentes](https://www.memoriachilena.gob.cl/602/w3-article-123838.html).

### Archivo Nacional de Chile

- **Estado:** `rights_review`.
- **Uso:** documentos primarios, catálogos y reproducciones.
- **Comprobado:** existen servicios y condiciones/costes de reproducción.
- **No verificado:** licencia general de redistribución masiva o API estable.
- **Regla:** gestionar colección por colección y conservar autorización/restricción junto al artefacto.
- **Fuente:** [Archivo Nacional](https://www.archivonacional.gob.cl/).

## Internacionales e interoperabilidad

### DBnomics

- **Estado:** `technical_review`.
- **Uso:** descubrimiento/acceso normalizado a series económicas.
- **Licencias comprobadas:** agregado ODbL; cada dato conserva términos del proveedor; repositorios con licencias propias, muchos fetchers AGPLv3+.
- **Regla:** DBnomics es intermediario, no fuente originaria. Guardar proveedor/código originales y comprobar contra fuente cuando sea material.
- **Fuente:** [términos oficiales](https://db.nomics.world/about).

### Wikidata

- **Estado:** `technical_review`.
- **Uso:** IDs externos, alias y candidatos de reconciliación.
- **Derechos comprobados:** la página oficial de acceso declara los datos bajo CC0; aun así, cada conector debe registrar revisión, fecha y límites operativos vigentes.
- **Regla:** un QID enlaza identidad propuesta, no prueba un claim histórico; registrar fecha y consulta.
- **Fuente:** [Wikidata: data access](https://www.wikidata.org/wiki/Wikidata:Data_access).

### World Historical Gazetteer

- **Estado:** `rights_review`.
- **Uso:** reconciliación de lugares, nombres/geométricas temporales y IDs.
- **Licencias comprobadas:** código del website BSD-3-Clause; agregado WHG CC-BY-NC-4.0; fuentes por namespace con licencias heterogéneas. La mayoría de endpoints requiere token.
- **Riesgo:** la condición no comercial y fuentes mezcladas pueden ser incompatibles con servicios pagados/redistribución.
- **Fuente:** [API y atribución](https://docs.whgazetteer.org/content/technical/apis.html), [licencias](https://whgazetteer.org/licenses/), [repositorio](https://github.com/WorldHistoricalGazetteer/website).

### OpenHistoricalMap

- **Estado:** `rights_review`.
- **Uso:** geometrías y objetos históricos candidatos.
- **Derechos comprobados:** datos CC0 salvo elementos marcados con `license=*`; existen excepciones por objeto.
- **No verificado:** una licencia única para todo el software que opera el proyecto.
- **Regla:** preservar `source`, `license` y atribución de cada elemento; no asumir homogeneidad del extracto.
- **Fuente:** [exportación](https://www.openhistoricalmap.org/export), [licencia por elemento](https://wiki.openstreetmap.org/wiki/Open_Historical_Map/Tags/Key/license).

### OpenAlex y Crossref

- **Estado:** `rights_review`.
- **Uso:** DOI, autores, instituciones y metadatos de literatura.
- **Regla:** metadatos no implican licencia del texto completo. Guardar identificador, proveedor del metadata y fecha; acceder al contenido solo según sus derechos.
- **Fuentes:** [OpenAlex data](https://docs.openalex.org/download-all-data/openalex-snapshot), [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/).

## Formato de ficha de alta

```text
sourceId:
datasetOrCollection:
ownerAndResponsibleAgent:
sourceType:
canonicalUrl:
accessMethod:
authenticationAndRateLimit:
softwareLicense:
datasetLicense:
itemRightsPolicy:
redistributionPolicy:
requiredAttribution:
coverageTemporalSpatial:
unitFrequencyMethodology:
revisionPolicy:
personalOrSensitiveData:
sampleRetrievedAt:
sampleContentHash:
schemaVersion:
qualityChecks:
knownLimitations:
status:
reviewerAndDate:
```

## Checklist de alta

- [ ] fuente y responsable identificados
- [ ] licencia de software, dataset y objeto separadas
- [ ] atribución y redistribución verificadas
- [ ] cobertura temporal/geográfica y exclusiones documentadas
- [ ] unidad, frecuencia, calendario y metodología documentados
- [ ] revisión/vintage y flags de observación preservables
- [ ] autenticación, cuota, timeout y contacto documentados
- [ ] payload de muestra guardado con hash y fecha
- [ ] prueba de idempotencia, duplicado y schema drift
- [ ] PII/sensibilidad y retención evaluadas
- [ ] degradación ante caída definida
- [ ] limitaciones visibles para API/UI
