# Salidas analiticas vigentes

Este directorio contiene exclusivamente los conjuntos y reportes necesarios
para las dos soluciones analiticas activas de INHALEX.

## Conjuntos de desarrollo

- `dataset_recomendacion_aromas.csv`: fuente granular de eventos
  cliente-producto. Se conserva porque `build_apriori_dataset.py` extrae de
  aqui las compras y construye las canastas de Apriori.
- `dataset_apriori_transacciones.csv`: dataset transaccional final para la
  propuesta 1; una fila por compra valida con las columnas `tid,items`.
- `dataset_prediccion_demanda.csv`: dataset producto-mes con la variable
  objetivo `Y_unidades_solicitadas_mes` para la propuesta 2.
- `dataset_demanda_inferencia.csv`: una fila por producto para el mes futuro;
  no contiene la variable objetivo y se usa para generar pronosticos.
- `operational-seed.json`: semilla reproducible para poblar una demostracion
  local de MongoDB. No es un dataset de entrenamiento.

## Reportes

- `validation-report.json`: validacion estructural de los datasets generados.
- `quality-report.csv` y `quality-summary.json`: controles de calidad de
  recomendacion y demanda.

La propuesta de segmentacion de clientes fue descartada del alcance actual.
Por ello `dataset_segmentacion_clientes.csv` ya no se publica ni se valida.

Desde la raiz del repositorio:

```powershell
python ml\src\generate_synthetic_datasets.py
python ml\src\validate_synthetic_datasets.py
python ml\src\export_operational_seed.py
python ml\src\build_apriori_dataset.py
python ml\src\train_apriori.py
python ml\src\train_monthly_demand.py
python ml\src\validate_intelligence_artifacts.py
```
