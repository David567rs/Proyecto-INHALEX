# Artefactos de modelos

Este directorio contiene las salidas canónicas y versionadas que conectan el
pipeline Python con la aplicación INHALEX:

- `apriori-rules.v1.json`: reglas de asociación, métricas, umbrales y
  fallbacks de popularidad.
- `monthly-demand-forecast.v1.json`: pronóstico del siguiente mes, variables,
  histórico, intervalos residuales y métricas temporales.

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
