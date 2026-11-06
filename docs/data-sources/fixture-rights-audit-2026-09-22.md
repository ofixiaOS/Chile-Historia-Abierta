# Auditoría acotada de fixtures y derechos — 2026-09-22

## Alcance

Lectura de los fixtures incluidos en código y consulta puntual de las URLs originales. No es una revisión legal integral ni una comprobación de todos los hechos históricos. No se descargaron datasets ni se consultaron proveedores con credenciales.

## Hallazgos

- **COMPROBADO:** `in_memory_place_repository.ts` contiene seis atestaciones con `evidenceStatus: documented`, licencia de dataset `CC-BY-4.0` y derechos de objeto `Public Domain (Ley 17.336 Art. 8)`. No existe payload original, hash, localizador dentro del documento ni ficha `approved_for_pilot` asociados a estos registros. Por tanto, esas etiquetas no están justificadas para publicación.
- **COMPROBADO:** la URL [BCN Constituciones](https://www.bcn.cl/historiapolitica/constituciones) conduce a una colección de constituciones y actas constitucionales, no al acta del Cabildo de 1810 invocada por el fixture de Santiago. La [portada de Historia Política](https://www.bcn.cl/historiapolitica) tampoco localiza por sí sola el decreto de Antofagasta de 1879.
- **NO VERIFICADO:** las URL de Hacienda, LeyChile `idNorma=24045`, CORFO y Armada no pudieron inspeccionarse en esta consulta. Ello no demuestra que sean inválidas; sigue faltando un localizador preciso y una revisión de derechos por objeto.
- **COMPROBADO:** `in_memory_statistics_repository.ts` presenta dos vintages TPM atribuidos al Banco Central con `contentHash` de aspecto artificial (`111122...0001/0002`), sin payload recuperado ni método de cálculo documentado. El pronóstico incluido tampoco trae artefacto de entrenamiento/backtest trazable a un vintage validado. Son ejemplos técnicos.
- **COMPROBADO:** `public_assistance.ts` contiene fragmentos atribuidos a Banco Central, BCN y un estudio académico genérico. El primer `contentHash` es el SHA-256 del contenido vacío, aunque el texto del fragmento no está vacío. Los derechos `ODC-By-1.0`, `CC-BY-4.0` y `CC-BY-NC-4.0` no están respaldados por una ficha individual del material. El tercer fragmento mezcla cifras y autores sin referencia bibliográfica localizable.
- **COMPROBADO:** los [términos de la API BDE](https://si3.bcentral.cl/estadisticas/Principal1/Web_Services/terminos_condiciones.html) permiten usos con atribución bajo condiciones específicas y advierten de datos de terceros y cambios de términos. No sustentan por sí solos las etiquetas Creative Commons puestas en los fixtures.

## Resolución aplicada

Los ejemplos siguen en el repositorio como material de pruebas. Los adaptadores públicos de memoria no los cargan fuera de `NODE_ENV=test`; la interfaz normal ya no dibuja nodos ni el gráfico fijo de esas muestras. Esta cuarentena no modifica registros PostgreSQL existentes. El estado del registro de fuentes se mantiene sin entradas aprobadas.

## Reconciliación de fichas

- **COMPROBADO:** las fichas BDE y Congreso/BCN decían `approved_for_pilot`, aunque el registro declaraba que no había fuentes aprobadas. Sus hashes de muestra no correspondían a payloads conservados y no había evidencia del revisor indicado.
- **Resolución documental:** ambas fichas vuelven a `rights_review`; los hashes, fechas de recuperación y revisores no reproducibles se sustituyeron por `unknown`. Esto no determina los derechos legales de ninguna fuente; exige revisar un recurso concreto antes de cambiar el estado.
- **NO VERIFICADO:** el empaquetador/flujo de staging no lee automáticamente este registro. La activación sigue dependiendo de las declaraciones de revisión del operador y no queda bloqueada por el estado de la ficha.

## Para liberar un primer dato real

1. Identificar dataset y objeto exactos, URL estable y localizador verificable.
2. Guardar muestra original, fecha de captura, SHA-256 calculado y método de transformación.
3. Revisar por separado licencia de software, dataset y objeto, atribución y permiso de redistribución.
4. Contrastar el dato/afirmación con la fuente y registrar revisor, fecha y límites.
5. Probar API y vista con ese dato aprobado, incluidos errores, revisiones y correcciones.
