# Chile Historia Abierta

Proyecto ciudadano para comprender Chile, sus capacidades y sus desafíos mediante evidencia que cualquiera pueda consultar y cuestionar.

## Propósito

Explorar historia, instituciones, economía, ciencia y desarrollo de Chile. Cada afirmación debe permitir conocer su fuente, fecha, versión, método y límites. Los logros y los problemas reciben el mismo estándar de revisión. Las interpretaciones, disputas, hipótesis y pronósticos se distinguen de los hechos documentados.

La dirección editorial propuesta comienza con capacidades de Chile: servicios públicos digitales, ingeniería sísmica y astronomía. Estos expedientes aún no están publicados ni revisados en esta base.

## Estado

**Prototipo local, no sitio desplegado.** Incluye código de un explorador web, API AdonisJS 7, PostgreSQL y worker Python para evidencia y series. Los ejemplos de prueba no constituyen un corpus histórico o estadístico validado. El verificador heredado normaliza las citas y todavía no comprueba coincidencia carácter a carácter. Incluso una cita literal no acreditaría autenticidad, vigencia ni corrección de una interpretación.

El estado y los resultados de la separación están en [docs/STATUS.md](docs/STATUS.md). La documentación histórica conservada puede describir propuestas; no sustituye ese estado.

## Dos productos independientes

Este repositorio contiene la base ciudadana. **NormaCheck** es la herramienta personal privada de investigación: su historial, pizarrón personal y módulos empresariales no se publican aquí. Este repositorio nace de una copia revisada del corte ciudadano `b9180cdff8c94c9b0f6af0654bd5225118809721`, anterior a los módulos regulatorios. No incorpora automáticamente las mejoras posteriores de NormaCheck.

## Cómo orientarse

- [Visión y criterio editorial](docs/vision-and-boundaries.md): qué queremos explicar y cómo revisar afirmaciones.
- [Estado comprobado](docs/STATUS.md): resultados, límites y bloqueadores.
- [Prioridades](docs/roadmap.md): orden de trabajo y criterios de cierre.
- [Arquitectura actual](docs/architecture.md) y [API registrada](docs/api/public-api.md): qué código existe.
- [Fuentes](docs/data-sources/source-register.md) y [flujo de paquetes](docs/operations/local-release-workflow.md): revisión antes de publicar.

## Desarrollo local

Requiere Node.js 24, Python 3.12 y Docker local para PostgreSQL 16. Desde `platform/`:

```powershell
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
node ace generate:key
npm run db:up
node ace migration:run --force
npm run dev
```

Generar `APP_KEY` solo en la preparación inicial; conservar la clave de una instalación existente.

El explorador abre en `http://localhost:3333`. El PostgreSQL de desarrollo publica solo en loopback, puerto `55432`. Estos comandos preparan una base local; no son el procedimiento de pruebas. Revisar el entorno local antes de migrar. El modo de memoria sirve para desarrollo; no equivale a un corpus público revisado. No introducir información confidencial.

## Verificación

Desde `platform/`:

```powershell
npm run typecheck
npm run lint -- --max-warnings=0
npm run test:guards
npm run test:isolated
npm run build
```

Para el worker, desde la raíz y dentro de un entorno virtual Python propio:

```powershell
python -m pip install --require-hashes -r worker/requirements-dev.txt
python -m pytest -q
```

Completar con `git diff --check`.

Las pruebas usan PostgreSQL desechable, credenciales aleatorias, entorno filtrado, comprobación de identidad antes de migrar y bloqueo de red externa en Node. No usar una base real ni `.env.test` como autorización. `npm test` y `npm run test:postgres` seleccionan suites del mismo ejecutor aislado.

## Publicación y derechos

El repositorio es visible públicamente; no se ha otorgado una licencia de software abierto (`UNLICENSED`). Las licencias de software, datasets y documentos se verifican por separado. No se incluyen los textos descargados para el corpus privado. Publicar el código no despliega una web ni acredita derechos para redistribuir documentos.
