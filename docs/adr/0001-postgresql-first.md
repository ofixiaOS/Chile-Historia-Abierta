# ADR 0001 — PostgreSQL primero

## Decisión

Usar PostgreSQL/PostGIS como fuente canónica local y `pgvector` para el MVP. Evaluar Jena/Fuseki, Wikibase, Qdrant u otra infraestructura solo después de medir necesidad real.

## Motivo

Reduce complejidad operacional y permite mantener en un mismo sistema eventos, fuentes, series, foro, versiones y auditoría.

## Consecuencia

La interoperabilidad RDF/SPARQL no será el primer objetivo. El modelo debe conservar IDs externos y permitir exportar datos después.

Los criterios medidos para evaluar motores especializados quedan definidos en [ADR 0005](0005-measured-evolution-gates.md).
