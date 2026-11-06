# Entorno Python del worker

`worker/requirements.in` y `worker/requirements-dev.in` contienen las dependencias directas. `worker/requirements.txt` y `worker/requirements-dev.txt` son locks generados con dependencias transitivas, versiones exactas y hashes. Los locks se generaron con Python 3.12 en Windows; validar también en el sistema operativo real de despliegue.

Comprobaciones locales:

```powershell
python -m pip install --require-hashes -r worker/requirements-dev.txt
python -m pytest worker/tests -q
python -m pip_audit -r worker/requirements.txt
python -m pip_audit -r worker/requirements-dev.txt
```

Reverificación en el checkout el 2026-09-23: `python -m pytest worker/tests -q` pasa 42 pruebas y `python -m compileall -q worker` pasa. El intérprete disponible no tiene instalado `pip-audit`; por tanto, el resultado histórico de auditoría que sigue abajo no cuenta como una auditoría actual de este checkout. No se intentó instalar la herramienta porque la instalación temporal fue rechazada por el host.

Para actualizar versiones directas, edita los archivos `.in` y recompila ambos locks con pip-tools 7.6.1:

```powershell
python -m piptools compile --resolver=backtracking --generate-hashes --allow-unsafe --upgrade --output-file worker/requirements.txt worker/requirements.in
python -m piptools compile --resolver=backtracking --generate-hashes --allow-unsafe --upgrade --output-file worker/requirements-dev.txt worker/requirements-dev.in
```

Ejecuta las pruebas y ambas auditorías antes de aceptar el lock. El 2026-09-23, una instalación limpia con hashes pasó, ambas auditorías no encontraron vulnerabilidades conocidas y las 40 pruebas pasaron en Windows/Python 3.12. Los hashes prueban la integridad del artefacto, no la legitimidad del mantenedor ni la seguridad funcional del paquete.
