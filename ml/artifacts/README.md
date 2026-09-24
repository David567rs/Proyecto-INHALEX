# Artefactos de modelos

Este directorio contiene las salidas canónicas y versionadas que conectan el
pipeline Python con la aplicación INHALEX:

- `apriori-rules.v1.json`: reglas de asociación, métricas, umbrales y
  fallbacks de popularidad.
- `monthly-demand-forecast.v1.json`: pronóstico del siguiente mes, variables,
  histórico, intervalos residuales y métricas temporales.

Las libretas académicas también generan artefactos independientes para la
futura integración Flask + MongoDB, sin modificar por ahora el backend NestJS:

- `apriori-rules.flask.v1.json`: reglas de Apriori con antecedentes de uno a
  cuatro aromas, Top-N, fallback y contrato de consulta sobre la bolsa.
- `monthly-demand-flask-pipeline.v1.joblib`: paquete Ridge serializado con el
  modelo, escalador, columnas codificadas y medianas necesarios para la
  inferencia controlada por Flask.
- `monthly-demand-flask-manifest.v1.json`: esquema, trazabilidad MongoDB,
  elegibilidad y métricas del pipeline anterior.

Flask deberá cargar esos artefactos sólo desde una ruta local confiable y
reconstruir las entradas a partir de MongoDB; los CSV de `ml/exports` no son
una dependencia de producción.

Los archivos JSON se pueden inspeccionar y auditar sin cargar objetos Python.
Los equivalentes TypeScript se generan en
`Server/src/modules/intelligence/artifacts/` para que el backend desplegado no
dependa de rutas externas a `Server`.

El modelo serializado `monthly-demand-ridge.v1.joblib` se genera para
reproducibilidad local, pero se ignora en Git y nunca debe cargarse desde una
fuente no confiable.

Regeneración completa:

```powershell
python ml\src\build_apriori_dataset.py
python ml\src\train_apriori.py
python ml\src\export_operational_seed.py
python ml\src\train_monthly_demand.py
python ml\src\validate_intelligence_artifacts.py
```
