# Publicar una fuente preparada en el PC local

Este flujo permite preparar un archivo de texto en el PC y trasladar un paquete pequeño a una instalación PostgreSQL de la plataforma. El servidor público solo recibe el paquete revisado; OCR, descarga, limpieza y exploración de fuentes pueden ejecutarse localmente. La implementación actual admite **un archivo UTF-8 de hasta 1 MiB, una fuente y un claim por paquete**. No procesa PDF, CSV ni lotes.

## Antes de preparar un paquete

1. Dar de alta la fuente real en el registro de fuentes con URL, fecha, condiciones de uso y alcance de redistribución comprobados. Hoy [ninguna fuente está aprobada para piloto](../data-sources/source-register.md); el ejemplo de abajo es sintético y no debe publicarse como historia chilena.
2. Guardar el archivo original y la ficha de revisión en una carpeta local respaldada, preferentemente fuera del disco C: si allí falta espacio. El paquete también conserva esos bytes; hacer copia de seguridad del paquete y de la base PostgreSQL por separado.
3. Usar un `dataVersion` único e inmutable por publicación. Una corrección posterior requiere otra versión y un flujo de revisión explícito; este corte aún no implementa correcciones de claims activos.

## Estructura del borrador

Guardar este JSON como `draft.json` y el texto literal como `source.txt`. Los valores siguientes son exclusivamente sintéticos:

```json
{
  "dataVersion": "ejemplo-sintetico-v1",
  "createdAt": "2026-09-22T12:00:00.000Z",
  "source": {
    "sourceId": "synthetic-source",
    "scopeIdentifier": "synthetic-document-001",
    "sourceType": "official_administrative",
    "sourceName": "Fuente sintética de prueba",
    "responsibleAgent": "Equipo local",
    "sourceUrl": "https://example.invalid/documento",
    "publishedAt": null
  },
  "artifact": {
    "retrievedAt": "2026-09-22T12:00:00.000Z",
    "softwareLicense": "No se redistribuye software",
    "datasetLicense": "Datos sintéticos creados para esta prueba",
    "itemRights": "Texto sintético propio",
    "redistributionPolicy": "public_domain",
    "requiredAttribution": "Equipo local"
  },
  "claim": {
    "statement": "El texto de prueba contiene un pasaje sintético.",
    "evidenceStatus": "documented",
    "quoteExcerpt": "pasaje sintético",
    "locator": { "type": "fragment", "value": "parrafo-1" },
    "transformationMethod": "Transcripción literal del archivo de prueba",
    "limitations": ["No describe un hecho histórico"]
  }
}
```

`source.txt` debe contener literalmente `pasaje sintético`. `sourceUrl` identifica la procedencia; `release:pack` y `release:stage` no visitan esa URL. El validador comprueba estructura, hash y presencia de la cita. Una persona debe verificar que URL, autoría, localizador, licencia, atribución, estado epistemológico e interpretación sean correctos. `sourceId` y `scopeIdentifier` identifican la fuente y alcance exactos; no prueban aprobación.

## Preparar en el PC

En `platform/`, con Node.js y dependencias instaladas:

```powershell
node ace release:pack --draft "J:\CHA\draft.json" --source "J:\CHA\source.txt" --output "J:\CHA\paquetes\ejemplo-sintetico-v1.json"
```

El comando crea un archivo nuevo y muestra `bundleHash`. Rechaza sobrescribir un paquete existente. Revisar el JSON y registrar ese hash por un canal bajo control del operador. SHA-256 detecta cambios accidentales o manipulación del paquete respecto del hash registrado, pero **no identifica al autor ni firma el paquete**.

## Revisión, staging y activación en la instalación de destino

Tras copiar el paquete mediante un canal bajo control del operador y configurar la conexión PostgreSQL del destino, ejecutar las migraciones con el procedimiento habitual de ese entorno. Las tres órdenes siguientes corren en `platform/` del destino y se conectan a la base configurada allí:

```powershell
node ace release:source-review --bundle "C:\ruta\recibida\ejemplo-sintetico-v1.json" --decision approved_for_pilot --reviewer "Revisor de fuente" --rights-evidence-url "https://example.invalid/terms" --rights-summary "Prueba sintética local; no es un permiso para datos reales." --source-confirmed --rights-confirmed
node ace release:stage --bundle "C:\ruta\recibida\ejemplo-sintetico-v1.json"
node ace release:approve --data-version ejemplo-sintetico-v1 --bundle-hash HASH_MOSTRADO_AL_EMPAQUETAR --reviewer "Segundo revisor" --source-confirmed --rights-confirmed
node ace release:activate --data-version ejemplo-sintetico-v1 --bundle-hash HASH_MOSTRADO_AL_EMPAQUETAR
```

`release:source-review` conserva una decisión append-only ligada al `sourceId`, `scopeIdentifier` y SHA-256 exactos del original dentro del paquete. `stage`, `approve` y `activate` requieren que esa sea la revisión vigente y aprobada. Una decisión posterior `blocked` impide nuevas activaciones. El aprobador del paquete debe registrar un nombre distinto al revisor de fuente. Los nombres y flags son declaraciones del operador, no autenticación de identidad ni prueba de derechos; la separación por nombre es un control contra errores, no contra suplantación. `activate` vuelve a validar bytes y hash, y publica fuente, artefacto, claim, enlace de evidencia y evento outbox en una transacción. El rol público no puede leer revisiones de fuente, `release_batches` ni sus bytes originales. La vista pública de claims solo muestra el claim después de activar.

La ficha Markdown sigue siendo el expediente editorial. La decisión registrada en base limita la aprobación al paquete exacto y no cambia automáticamente la ficha global de la fuente. Otra muestra, alcance o fuente exige otra revisión. El ejemplo es sintético y no debe usarse como aprobación de una fuente real.

El importador no tiene endpoint HTTP. El traslado y la ejecución remota siguen siendo pasos operativos manuales; esta fase no incluyó despliegue ni acceso a producción. Mantener el acceso a estos comandos y a la base administrativa limitado a operadores autorizados.

## Verificación local aislada

Desde `platform/`:

```powershell
.\scripts\verify-release-integration.ps1
```

El script usa un PostgreSQL 16 temporal en Docker, con puerto `127.0.0.1:55432`; se niega a arrancar si el puerto está ocupado y detiene solo el contenedor que crea. Prueba staging privado, aprobación, activación, idempotencia y rechazo de cambios. No mide disponibilidad, recuperación, rendimiento de una VPS ni validez de derechos reales.
