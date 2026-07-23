# Salidas generadas

Este directorio recibe tres datasets analíticos base reproducibles:

- `dataset_recomendacion_aromas.csv`
- `dataset_prediccion_demanda.csv`
- `dataset_segmentacion_clientes.csv`

También contiene datasets derivados, artefactos técnicos y reportes de calidad:

- `operational-seed.json`: puente sintético para MongoDB local; no es un
  cuarto dataset de entrenamiento.
- `dataset_apriori_transacciones.csv`: una canasta por fila con contrato
  exacto `tid,items`.
- `dataset_demanda_inferencia.csv`: una fila por producto para el siguiente
  mes calendario; no contiene la variable Y.
- `validation-report.json`: validaciones estructurales.
- `quality-report.csv`: detalle de controles de calidad.
- `quality-summary.json`: resumen de controles aprobados y fallidos.

Desde la raíz del repositorio:

```powershell
python ml\src\generate_synthetic_datasets.py
python ml\src\validate_synthetic_datasets.py
python ml\src\export_operational_seed.py
python ml\src\build_apriori_dataset.py
python ml\src\train_apriori.py
python ml\src\train_monthly_demand.py
python ml\src\validate_intelligence_artifacts.py
```

Los archivos generados se ignoran en Git porque son reproducibles. El
artefacto operativo contiene identidades ficticias, correos `.invalid` y debe
usarse únicamente en entornos locales.
