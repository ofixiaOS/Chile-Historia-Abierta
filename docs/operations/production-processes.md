# Separación de procesos de producción

La aplicación requiere `NODE_ENV=production` y `CHA_PROCESS_ROLE` explícito.

## Proxy y dirección del cliente

- El servidor no confía en `X-Forwarded-For` por defecto. Si recibe tráfico detrás de un proxy, configurar `TRUSTED_PROXY` con la IP exacta del peer proxy que conecta directamente al servidor. CIDR y listas no se aceptan.
- El proxy debe sobrescribir `X-Forwarded-For` con la dirección del cliente o añadirla de forma que los intermediarios confiables queden al final de la cadena. No aceptar esa cabecera tal como llega del cliente.
- No configurar `TRUSTED_PROXY` con `*`, `0.0.0.0/0`, `::/0` ni redes compartidas con clientes. El arranque rechazará formatos IP/CIDR inválidos.
- Si el servidor recibe conexiones directas sin proxy, dejar `TRUSTED_PROXY` sin definir; `request.ip()` usará el peer TCP.
- La cuota HTTP actual permanece local a cada proceso. Un gateway compartido y su configuración de IP deben comprobarse en staging antes de tráfico público.

## Proceso web

- Configurar `CHA_PROCESS_ROLE=web`.
- Proveer credenciales del rol PostgreSQL de lectura (`DB_PUBLIC_USER` y `DB_PUBLIC_PASSWORD`).
- PostgreSQL requiere TLS con certificado y hostname verificados. `DB_SSL_CA` puede contener la CA raíz PEM aprobada si no está en el almacén de confianza del sistema. No desactivar la verificación para resolver errores de certificado.
- No proveer `DB_ADMIN_USER` ni `DB_ADMIN_PASSWORD`; el arranque falla si alguna está presente.
- El pool del proceso web contiene únicamente la conexión `public`.
- Las escrituras editoriales HTTP devuelven 503 hasta que exista un proceso escritor aislado.

## Proceso de migración

- Ejecutar como trabajo separado y de corta duración con `CHA_PROCESS_ROLE=migration`.
- Inyectar `DB_ADMIN_USER` y `DB_ADMIN_PASSWORD` desde el gestor de secretos de la plataforma solo a ese trabajo.
- La conexión administrativa también requiere TLS y validación del servidor; usar el mismo `DB_SSL_CA` aprobado cuando corresponda.
- No inyectar `DB_PUBLIC_USER` ni `DB_PUBLIC_PASSWORD`; el arranque de producción rechaza esos secretos en rol `migration`.
- Su pool registra `admin` y no registra `public`; el entrypoint HTTP rechaza el rol `migration` antes de abrir un puerto.
- Los comandos `release:stage`, `release:source-review`, `release:approve` y `release:activate` también rechazan `NODE_ENV=production`, incluso cuando el proceso dispone de este pool administrativo. La migración no se debe usar para registrar revisión editorial ni activar datos.
- La migración `202609230003_revoke_public_schema_create` quita `CREATE` del esquema `public` para `PUBLIC` y `cha_public`, conservando `USAGE` de lectura. Verificar la migración aplicada antes de habilitar el proceso web.
- No guardar las credenciales administrativas en el `.env` del proceso web ni en el repositorio.
- En este checkout, `node ace migration:run --force` se verificó en rol `migration` sobre un PostgreSQL temporal. Ese ensayo no autoriza ejecutarlo contra producción.

Este checkout no incluye un pipeline de despliegue ni un procedimiento de aprobación, respaldo y rollback para migraciones reales. No desplegar ni ejecutar una migración real hasta probar ese procedimiento en un entorno aislado equivalente.

Las escrituras editoriales de producción permanecen deshabilitadas hasta implementar un writer aislado que autentique la identidad individual y conserve la autorización y auditoría de cada cambio.

El proceso emite `Strict-Transport-Security: max-age=15552000` solo en `NODE_ENV=production`. HSTS solo es aceptado por navegadores sobre HTTPS; el proxy público debe terminar TLS y conservar este encabezado. No se activa `includeSubDomains` ni `preload` hasta verificar todos los hosts del dominio.

## Preflight de la migración de vintages

Antes de aplicar `202609230005_bind_statistical_vintages_to_series` a una base con datos, revisar las relaciones existentes en una copia aislada y con las credenciales del trabajo de migración. Ambas consultas deben devolver cero filas:

```sql
SELECT s.id, s.current_vintage_id
FROM statistical_series AS s
LEFT JOIN series_vintages AS v ON v.id = s.current_vintage_id
WHERE s.current_vintage_id IS NOT NULL
  AND (v.id IS NULL OR v.series_id <> s.id);

SELECT f.id, f.series_id, f.target_vintage_id
FROM forecast_runs AS f
LEFT JOIN series_vintages AS v ON v.id = f.target_vintage_id
WHERE v.id IS NULL OR v.series_id <> f.series_id;
```

Si hay filas, detener la migración y resolver cada relación mediante el proceso editorial versionado. La FK nueva debe fallar ante datos incongruentes; la prueba PostgreSQL local con tablas recién creadas no demuestra compatibilidad con una base existente.
