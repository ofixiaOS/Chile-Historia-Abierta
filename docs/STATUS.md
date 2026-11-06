# Estado vigente — Chile Historia Abierta

Corte: 6 de noviembre de 2026.

## Separación

**COMPROBADO:** repositorio ciudadano independiente, iniciado desde el corte `b9180cdff8c94c9b0f6af0654bd5225118809721`. Se conservan el explorador, evidencia, catálogo, estadísticas, geografía, publicaciones, API y worker de esa base. No se traslada el historial Git privado, el módulo regulatorio, el pizarrón personal ni el corpus de NormaCheck.

El ejecutor de pruebas aisladas se trasladó desde el desarrollo privado sin su inicialización B2B. Se adaptaron las pruebas editoriales para usar las credenciales efímeras del ejecutor. Las mejoras ciudadanas posteriores al corte de origen requieren revisión y traslado selectivo; esta separación no acredita paridad de funcionalidades.

## Verificación

**COMPROBADO localmente:** tipos, lint sin advertencias, build, 7 controles del ejecutor, 215 pruebas unitarias/HTTP y 53 de integración, con cierre de suites sin omisiones y PostgreSQL desechable eliminado; 42 pruebas Python aprobadas. `git diff --check` aprobado antes del commit. `npm audit --omit=dev --audit-level=high` no detectó alertas altas o críticas y reportó 14 moderadas y 1 baja. No se atribuyen a este producto los resultados del repositorio privado.

## Revisión documental del corte público

**COMPROBADO por inspección:** la arquitectura heredada mezclaba implementación y propuestas; la guía API incluía rutas no registradas. Se corrigieron las guías y las instrucciones de agentes, se definió el recorrido editorial ciudadano y se ordenaron las prioridades. No se modificó código de aplicación ni se aprobó corpus.

**Bloqueadores identificados:**

- **Corregido en el corte siguiente:** `CitationVerifier` exige presencia literal sin normalizar y coincidencia exacta de localizador.
- **Corregido en el corte siguiente:** la asistencia separa los estados y retiene la síntesis sin revisión; las citas válidas no elevan `evidenceStatus`.
- Los ejemplos incorporados y sus licencias son fixtures, no evidencia revisada. No hay nuevas fuentes aprobadas.
- La corrección pública con revisión previa consultable, identidad comunitaria y operación con recuperación comprobada siguen pendientes.

La [CI del commit inicial público](https://github.com/ofixiaOS/Chile-Historia-Abierta/actions/runs/42228534661) terminó aprobada. No acredita los bloqueadores anteriores. Esta revisión es documental; no se repitieron suites de producto sin cambios de código. Se contrastaron las 24 rutas documentadas con las registradas, se comprobaron los enlaces relativos de los documentos modificados y se ejecutó `git diff --check`.

## Verificación literal y abstención de síntesis

Se preservan espacios, tildes, puntuación y composición Unicode al comparar; el proveedor determinista recorta el original sin reconstruirlo. Un fallo descarta el lote completo de citas. API y OpenAPI añaden `verification` y `INTERPRETATION_UNVERIFIED`; la respuesta permanece `not_verified`, con síntesis retenida incluso ante citas válidas. Esto no autentica originales ni verifica vigencia o interpretación.

**COMPROBADO localmente:** 229 pruebas unitarias/HTTP y 53 de integración aprobadas, sin omisiones y con PostgreSQL desechable eliminado; 7 controles del ejecutor, tipos, lint sin advertencias, build y `git diff --check` aprobados. Hay 14 casos nuevos; incluyen alteraciones de cita y una síntesis falsa acompañada de cita válida. La primera ejecución detectó una expectativa incorrecta en un caso nuevo de espacios; se corrigió la prueba y se repitió el ejecutor completo. No cambió el worker Python ni se repitió su suite.

## Próximo trabajo

- Revisar fuentes, derechos, transcripciones y metodología de un primer expediente sobre capacidades de Chile.
- Revisar la interfaz y navegación con usuarios, incluidos móvil y accesibilidad.
- Auditar los contratos heredados antes de habilitar publicación ciudadana o proveedores externos.
- Decidir licencia de software y política editorial de correcciones.

**NO VERIFICADO:** corpus auténtico y actualizado, exactitud de interpretaciones, ingestión continua, operación pública, carga, respaldo/restauración, demanda y disponibilidad. No se desplegó una web ni se conectaron proveedores pagados.

Los documentos de arquitectura e implementación históricos son antecedentes y propuestas, no certificaciones de funcionamiento actual.
