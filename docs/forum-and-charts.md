# Foro y gráficos reproducibles

## Decisión de producto

La comunidad se construye como módulo del dominio AdonisJS. Discourse y NodeBB son software maduro, pero introducirlos ahora duplicaría identidad, permisos, revisiones y moderación sin resolver el vínculo central entre claim, evidencia y gráfico. Ver ADR 0007.

## Flujo de publicación

1. La persona parte de una búsqueda, acontecimiento, serie, gráfico o publicación existente.
2. Selecciona evidencia/series y, si corresponde, crea un `ChartSpec`.
3. Elige explícitamente `dato`, `interpretación`, `hipótesis` o `predicción`.
4. El servidor valida requisitos y conflictos de interés según tipo.
5. Una vista previa muestra citas, vintage, derechos, transformaciones, limitaciones y advertencias.
6. Publicar crea una revisión inmutable y un snapshot reproducible.
7. Terceros comentan con evidencia, replican o hacen fork; no editan el original.
8. Corregir crea una revisión enlazada con motivo y diff; retractar no borra historial.

## Requisitos por tipo

- **Dato:** observación/artefacto localizable, unidad, periodo, vintage y fuente.
- **Interpretación:** claims documentados, razonamiento y límites; no puede etiquetarse causal sin método.
- **Hipótesis:** predicción falsable o pregunta, evidencia conocida y qué la refutaría/apoyaría.
- **Predicción:** dataset/vintage, horizonte, baseline, split temporal, backtesting, intervalos, supuestos y limitaciones.

Cuando faltan requisitos se guarda borrador o se publica claramente como `unknown`/hipótesis; el sistema no eleva la categoría por popularidad.

## ChartSpec

El contrato propio se basa inicialmente en una versión fijada de Vega-Lite, con metadatos de dominio adicionales:

```json
{
  "schemaVersion": "1",
  "renderer": { "name": "vega-lite", "version": "..." },
  "series": [
    { "seriesId": "gdp_real", "vintageId": "...", "unit": "..." }
  ],
  "events": [{ "eventId": "crisis_1982", "claimRevisionId": "..." }],
  "range": { "from": "1970", "to": "2025" },
  "filters": {},
  "transformations": [
    { "name": "index_base_100", "parameters": { "basePeriod": "1970" } }
  ],
  "method": "descriptive_comparison",
  "queryHash": "...",
  "dataSnapshotId": "...",
  "sources": ["..."],
  "limitations": []
}
```

La spec, consulta normalizada, datos/vintages, transformaciones y hashes son canónicos. SVG/PNG son derivados. Un fork copia referencias y registra su padre.

## Validaciones anti-manipulación

- ejes y unidades explícitos; advertir eje truncado o doble eje;
- frecuencia y deflactor comparables;
- transformaciones permitidas y parámetros completos;
- datos ausentes/provisionales visibles;
- cambio metodológico o vintage marcado;
- no conectar intervalos discontinuos sin indicarlo;
- colores/patrones y tabla alternativa accesibles;
- correlación no se rotula como causalidad;
- renderer y schema fijados para reproducibilidad.

Las advertencias no reemplazan revisión editorial en publicaciones destacadas.

## Comentarios, reputación y ranking

Comentarios pueden enlazar fuentes, claims o una reproducción. La reputación es contextual —por ejemplo, aportes validados o correcciones aceptadas— y nunca un puntaje de verdad universal.

Votos/likes pueden ordenar relevancia comunitaria con transparencia. No cambian `evidenceStatus`, no silencian una corrección y no otorgan permisos de moderación por sí solos. Mostrar separadamente calidad de evidencia, estado editorial y atención comunitaria.

## Moderación

Categorías mínimas: spam, automatización abusiva, doxxing/PII, amenazas/odio, difamación, cita falsa, suplantación, manipulación gráfica, plagio/licencia, conflicto no declarado y acoso coordinado.

- Rate limits, verificación progresiva y cuarentena para cuentas/adjuntos riesgosos.
- Reporte con categoría, contexto y evidencia; protección contra brigading.
- Decisión con regla, actor, fecha y alcance; notificación y apelación.
- Contenido removido conserva registro interno y hash según política/ley; la interfaz pública explica la acción sin republicar daño.
- Automatización prioriza o bloquea casos claros reversibles; decisiones sensibles requieren humano.

## Conflictos de interés y sponsors

Autores declaran empleo, financiamiento o participación material relevante. Los claims sobre un patrocinador muestran el conflicto y requieren revisión independiente para destacarse. Patrocinadores no editan, moderan ni compran ranking o estado de evidencia.

## Privacidad, derechos y seguridad

- Minimización de PII; testimonios y datos personales requieren base y redacción.
- Adjuntos se validan por contenido, tamaño y tipo; sin SVG/HTML activo no saneado ni ejecutables.
- Contenido de posts/documentos se trata como no confiable para IA.
- Citas respetan derechos y límites; cuando no hay redistribución se muestra referencia/localizador permitido.

## Accesibilidad y rendimiento

- Todo gráfico tiene título, unidades, fuente, rango, método, texto alternativo y datos tabulares descargables cuando derechos lo permitan.
- Navegación por teclado, foco visible y no depender solo de color.
- En móvil, constructor por pasos y una visualización principal a la vez.
- Specs y snapshots se cargan bajo demanda; la página no descarga series completas por defecto.

## Pendientes verificables

- **NO VERIFICADO:** qué renderer cumple mejor accesibilidad/rendimiento con el corpus real.
- **NO VERIFICADO:** volumen y coste humano de moderación.
- **NO VERIFICADO:** reglas de reputación resistentes a abuso; requieren simulación y piloto.
