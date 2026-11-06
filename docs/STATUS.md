# Estado vigente — Chile Historia Abierta

Corte: 6 de noviembre de 2026.

## Separación

**COMPROBADO:** repositorio ciudadano independiente, iniciado desde el corte `b9180cdff8c94c9b0f6af0654bd5225118809721`. Se conservan el explorador, evidencia, catálogo, estadísticas, geografía, publicaciones, API y worker de esa base. No se traslada el historial Git privado, el módulo regulatorio, el pizarrón personal ni el corpus de NormaCheck.

El ejecutor de pruebas aisladas se trasladó desde el desarrollo privado sin su inicialización B2B. Se adaptaron las pruebas editoriales para usar las credenciales efímeras del ejecutor. Las mejoras ciudadanas posteriores al corte de origen requieren revisión y traslado selectivo; esta separación no acredita paridad de funcionalidades.

## Verificación

**COMPROBADO localmente:** tipos, lint sin advertencias, build, 7 controles del ejecutor, 215 pruebas unitarias/HTTP y 53 de integración, con cierre de suites sin omisiones y PostgreSQL desechable eliminado; 42 pruebas Python aprobadas. `git diff --check` aprobado antes del commit. `npm audit --omit=dev --audit-level=high` no detectó alertas altas o críticas y reportó 14 moderadas y 1 baja. No se atribuyen a este producto los resultados del repositorio privado.

## Próximo trabajo

- Revisar fuentes, derechos, transcripciones y metodología de un primer expediente sobre capacidades de Chile.
- Revisar la interfaz y navegación con usuarios, incluidos móvil y accesibilidad.
- Auditar los contratos heredados antes de habilitar publicación ciudadana o proveedores externos.
- Decidir licencia de software y política editorial de correcciones.

**NO VERIFICADO:** corpus auténtico y actualizado, exactitud de interpretaciones, ingestión continua, operación pública, carga, respaldo/restauración, demanda y disponibilidad. No se desplegó una web ni se conectaron proveedores pagados.

Los documentos de arquitectura e implementación históricos son antecedentes y propuestas, no certificaciones de funcionamiento actual.
