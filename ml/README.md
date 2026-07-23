# Datos sintéticos para las propuestas de ML de INHALEX

Este directorio genera **tres datasets independientes**, uno para cada
propuesta académica. No se conecta a MongoDB, no modifica Atlas y no contiene
datos de clientes reales.

Todos los registros usan la corrida reproducible `inhalex-synthetic-v1`, la
semilla `20260717` y el periodo del 1 de enero de 2025 al 30 de junio de 2026.
Los parámetros se pueden cambiar en
[`config/synthetic-config.json`](config/synthetic-config.json).

## Generar y validar

Desde la raíz del repositorio:

```powershell
python -m pip install -r ml\requirements.txt
python ml\src\generate_synthetic_datasets.py
python ml\src\validate_synthetic_datasets.py
```

Para volver a validar las salidas sin regenerarlas:

```powershell
python ml\src\generate_synthetic_datasets.py --validate-only
```

Las salidas se escriben en `ml/exports/`. Los CSV se ignoran en Git porque son
reproducibles a partir del generador y ocupan varios megabytes.

## Pipeline desplegable de las propuestas 1 y 2

Las propuestas de recomendación y demanda ya cuentan con scripts de
entrenamiento separados de las libretas. Las libretas explican y ejecutan el
proceso, pero la lógica reutilizable vive en `ml/src/`.

### Propuesta 1: recomendación con Apriori

```powershell
python ml\src\build_apriori_dataset.py
python ml\src\train_apriori.py
```

El primer comando transforma los eventos de compra en
`ml/exports/dataset_apriori_transacciones.csv`, cuyo contrato contiene
exactamente:

- `tid`: identificador único de la compra.
- `items`: slugs únicos y ordenados, separados por `|`.

El segundo comando ejecuta una implementación propia de Apriori para reglas
singleton `A -> B`, realiza una evaluación cronológica 80/20 y genera:

- `ml/artifacts/apriori-rules.v1.json`: artefacto canónico.
- `Server/src/modules/intelligence/artifacts/apriori-rules.generated.ts`:
  constante desplegable `APRIORI_RULES_ARTIFACT`.

Los umbrales predeterminados son soporte `0.008`, confianza `0.10` y lift
`1.05`. Se pueden ajustar con argumentos de línea de comandos.

### Propuesta 2: regresión mensual Ridge

Antes de entrenar, el artefacto operativo y los CSV deben pertenecer a la misma
corrida reproducible:

```powershell
python ml\src\export_operational_seed.py
python ml\src\train_monthly_demand.py
```

El entrenamiento reserva cronológicamente los tres últimos meses para
validación, compara Ridge contra el promedio de los tres meses anteriores,
ajusta el modelo final con todo el histórico disponible y genera:

- `ml/exports/dataset_demanda_inferencia.csv`: 16 filas del siguiente mes, sin Y.
- `ml/artifacts/monthly-demand-forecast.v1.json`: pronósticos e intervalos.
- `ml/artifacts/monthly-demand-ridge.v1.joblib`: pipeline Python reproducible,
  ignorado por Git.
- `Server/src/modules/intelligence/artifacts/monthly-demand.generated.ts`:
  constante desplegable `MONTHLY_DEMAND_ARTIFACT`.

El stock no forma parte del entrenamiento. El backend lo consulta después para
convertir el pronóstico en una recomendación operativa de reabastecimiento.

### Validación y libretas

```powershell
python ml\src\validate_intelligence_artifacts.py
python ml\src\smoke_execute_notebook.py
```

Las libretas vigentes son:

- `ml/notebooks/01_apriori_inhalex.ipynb`
- `ml/notebooks/02_demanda_mensual_inhalex.ipynb`

Ambas llaman a los scripts anteriores, muestran los datasets, explican las
métricas y terminan con una puerta de calidad. Los JSON contienen
`isSynthetic: true`; sus métricas demuestran el pipeline académico y no deben
presentarse como rendimiento garantizado sobre ventas futuras reales.

## Demostración operativa en MongoDB local

Además de los tres datasets analíticos, se puede crear un artefacto técnico
para poblar la aplicación local:

```powershell
python ml\src\export_operational_seed.py
```

Esto genera `ml/exports/operational-seed.json`. No es un cuarto dataset de
entrenamiento: es el puente reproducible que conserva nombres ficticios,
favoritos, bolsa, pedidos y reseñas para las colecciones operativas de INHALEX.

Requisitos antes de cargarlo:

- MongoDB local en el puerto `27017` y base llamada exactamente `inhalex`.
- `Server/.env` apuntando a `127.0.0.1`, `localhost` o loopback IPv6.
- Los 16 productos esperados presentes y activos en el catálogo local.
- Backend detenido durante el respaldo y la carga para evitar escrituras
  concurrentes.

El seeder rechaza `mongodb+srv`, Atlas, hosts remotos, otros puertos, otra base
de datos y `NODE_ENV=production`.

### 1. Simulación sin escrituras

Desde la raíz del repositorio:

```powershell
$env:NODE_ENV = 'development'
npm.cmd --prefix Server run seed:synthetic
```

El modo predeterminado es `dry-run`: valida el destino efectivo, catálogo,
esquemas, cronología, referencias, colisiones, ratings y agregados de ventas,
pero no escribe documentos.

### 2. Respaldo previo

Con MongoDB Database Tools y `mongodump` disponible en `PATH`:

```powershell
$line = Get-Content -LiteralPath 'Server\.env' |
  Where-Object { $_ -match '^\s*MONGODB_URI=' } |
  Select-Object -First 1

if (-not $line) {
  throw 'No se encontró MONGODB_URI en Server/.env'
}

$mongoUri = ($line -replace '^\s*MONGODB_URI=', '').Trim().Trim('"').Trim("'")
$backupDir = Join-Path 'Server\backups' (
  'pre-synthetic-{0}' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
)

mongodump --uri $mongoUri --db inhalex --out $backupDir
if ($LASTEXITCODE -ne 0) {
  throw 'mongodump no pudo completar el respaldo'
}

Remove-Variable mongoUri
```

`Server/backups/` está ignorado por Git y no debe publicarse. Si
`mongodump` no está en `PATH`, se puede invocar mediante la ruta de instalación
de MongoDB Database Tools.

### 3. Aplicación confirmada

Usa exactamente el destino mostrado por el `dry-run`. Para la configuración
local estándar:

```powershell
$env:NODE_ENV = 'development'
$env:SYNTHETIC_SEED_CONFIRM = 'inhalex@127.0.0.1:27017'

try {
  npm.cmd --prefix Server run seed:synthetic -- --apply
}
finally {
  Remove-Item Env:\SYNTHETIC_SEED_CONFIRM -ErrorAction SilentlyContinue
}
```

La carga usa identificadores deterministas y puede repetirse sin duplicados.
No vacía colecciones ni altera existencias o reservas de inventario. Conserva
los registros ajenos a la corrida, actualiza ratings desde todas las reseñas
publicadas y hace `upsert` de ventas agregadas desde todos los pedidos
completados. El estado queda en `corridas_datos_sinteticos` para permitir
reintentos seguros.

Cuenta local de demostración:

- Nombre: Sebastián Gutiérrez Gómez
- Correo: `sebastian.gutierrez.0001@demo.inhalex.invalid`
- Contraseña: `InhalexDemo2026!`

Las identidades y opiniones son completamente ficticias. El dominio
`.invalid` no recibe correo y estas credenciales nunca deben usarse en
producción.

### Actualizar únicamente el texto de las reseñas sintéticas

Si cambian las plantillas de opinión, no es necesario volver a sembrar
usuarios, pedidos ni las demás colecciones. Primero regenera el artefacto y
simula la sincronización selectiva:

```powershell
python ml\src\export_operational_seed.py
$env:NODE_ENV = 'development'
npm.cmd --prefix Server run sync:synthetic-review-copy
```

Para aplicarla sobre la base local estándar:

```powershell
$env:SYNTHETIC_REVIEW_COPY_CONFIRM = 'inhalex@127.0.0.1:27017'

try {
  npm.cmd --prefix Server run sync:synthetic-review-copy -- --apply
}
finally {
  Remove-Item Env:\SYNTHETIC_REVIEW_COPY_CONFIRM -ErrorAction SilentlyContinue
}
```

El sincronizador toma exclusivamente los identificadores registrados en
`corridas_datos_sinteticos`, modifica solo `comment` y verifica que ratings,
clientes, productos, pedidos, estados y fechas permanezcan iguales. Rechaza
Atlas, otros hosts, otros puertos y `NODE_ENV=production`.

La libreta reproducible está en
[`notebooks/01_generacion_y_validacion_sintetica.ipynb`](notebooks/01_generacion_y_validacion_sintetica.ipynb).
Regenera los CSV, ejecuta la auditoría, presenta estadísticas de calidad y
compara valores de `k` para K-Means. Se conserva porque actualmente contiene
el análisis reproducible de la propuesta 3. El smoke test automatizado ejecuta
solamente las dos libretas desplegables de Apriori y demanda mensual indicadas
en la sección anterior.

## Los tres datasets

### 1. `dataset_recomendacion_aromas.csv`

Granularidad: una fila por interacción cliente-producto.

Sirve para:

- TF-IDF y similitud de contenido usando `content_text`.
- Perfil implícito con `event_type` e `interaction_strength`.
- Evaluación temporal usando `occurred_at`.
- Reglas de asociación usando únicamente eventos `purchase` agrupados por
  `order_id`.
- Medición de impresiones y clics mediante `recommendation_id`.

Columnas de contenido: `product_id`, `product_name`, `category`, `aromas`,
`benefits`, `content_text`.

Columnas de interacción: `customer_key`, `event_type`,
`interaction_strength`, `occurred_at`, `channel`, `quantity`,
`review_rating`, `review_sentiment`.

`review_text` se conserva para comprobar variedad lingüística o experimentar
con NLP. Sus plantillas describen el atomizador y el uso personal del
inhalador; la validación rechaza lenguaje propio de goteros o difusores. Si el
modelo solo utiliza calificación, debe excluirse de `X`.

No deben usarse como variables numéricas: `interaction_id`, `customer_key`,
`session_id`, `order_id`, `recommendation_id`, `generation_run_id` ni
`is_synthetic`. Los identificadores de cliente y producto se usan como llaves
en la parte colaborativa, no como números ordinales.

Para evitar fuga temporal, los eventos previos a la compra no contienen el
`order_id` futuro. Solo `purchase` y `review` conservan esa relación.

### 2. `dataset_prediccion_demanda.csv`

Granularidad: una fila por producto y mes objetivo. Incluye los meses con
demanda cero. Con 16 productos y 18 meses contiene exactamente 288 filas
base; 240 tienen los tres meses de historia requeridos para entrenamiento.

Objetivo principal:

```text
Y_unidades_solicitadas_mes
```

Este objetivo suma `pedidos.items[].requestedQuantity` del producto durante el
mes objetivo. Solo se consideran pedidos `pending_review`, `confirmed` y
`completed`; se excluyen `draft` y `cancelled`. En el generador sintético, el
campo interno `quantity` se mapea a `requestedQuantity` al sembrar MongoDB.

Columnas de control y trazabilidad:

- `fecha_corte`: último día permitido para formar X.
- `mes_objetivo`: mes cuya demanda representa Y.
- `product_id`: llave sintética compartida entre los tres datasets.
- `producto`: nombre legible.
- `generation_run_id` e `is_synthetic`: metadatos, no variables del modelo.

En estos artefactos `SYN-PROD-006` es una llave analítica sintética, no el
`ObjectId` hexadecimal de MongoDB. El seeder la relaciona por `slug` con el
producto local. En una extracción productiva, `productos._id` se convertiría
a texto y se usaría para unirlo con `pedidos.items[].productId` y
`reseñas_producto.productId`.

Variables X conocidas antes de iniciar el mes objetivo:

- `categoria`, proveniente del catálogo.
- `demanda_lag_1m`, `demanda_lag_2m` y `demanda_lag_3m`.
- `promedio_demanda_3m`, calculado únicamente con esos tres rezagos.
- `pedidos_lag_1m`, conteo de pedidos distintos del mes anterior.
- `precio_promedio_lag_1m`, promedio efectivo ponderado por unidades del mes
  anterior.
- `rating_promedio_al_corte` y `cantidad_resenas_al_corte`, reconstruidos con
  reseñas anteriores al mes objetivo.
- `numero_mes`, extraído de `mes_objetivo`.

Los meses sin solicitudes se conservan con Y igual a cero. Si el mes anterior
no tuvo pedidos, `precio_promedio_lag_1m` queda ausente; no se reemplaza por
cero porque cero significaría que el producto fue gratuito. El precio y el
rating ausentes se tratan después con un imputador ajustado solo en train.

El stock actual no entra como supuesto historial. Se consulta después de
predecir para convertir la demanda estimada en una sugerencia de
reabastecimiento. De igual forma, `promoActive`, `promoPrice` y el rating
actual de `productos` no se aplican retrospectivamente.

La división de entrenamiento/prueba debe ser cronológica o walk-forward;
nunca aleatoria.

### 3. `dataset_segmentacion_clientes.csv`

Granularidad: una fila por cliente comprador a la fecha de corte.

Variables RFM principales:

- `recency_days`
- `frequency_orders`
- `monetary_value`

Variables extendidas de comportamiento:

- Ticket medio, unidades, antigüedad y meses activos.
- Intervalo medio entre compras.
- Diversidad de productos y categorías.
- Favoritos, reseñas y calificación media.
- Vistas, altas de carrito y clics en recomendaciones.
- Participación de pedidos con descuento y tasa de cancelación.
- Afinidad por cada una de las cinco categorías.

No contiene nombre, correo, teléfono ni domicilio. `customer_key` es una llave
sintética y debe excluirse de K-Means. Tampoco incluye una etiqueta de segmento:
el segmento es el resultado del análisis, no una variable de entrada.

Para RFM tradicional se usan solo recencia, frecuencia y monto. Para K-Means
extendido se puede aplicar `log1p`, imputación de calificación, escalado y las
variables conductuales.

## Integridad y uso responsable

- Los nombres mexicanos verosímiles se generan internamente para una futura
  base operativa de demostración, pero se excluyen correctamente de los CSV
  analíticos.
- Correos internos usan el dominio no enrutable `demo.inhalex.invalid`.
- Toda reseña proviene de una compra completada anterior.
- Existe como máximo una reseña por cliente-producto.
- Los comentarios son ficticios y no deben mostrarse como testimonios reales.
- Los pedidos Alexa no se inventan: Alexa genera interacciones, mientras la
  compra final usa el canal web que existe hoy en el sistema.
- Los resultados entrenados y evaluados con estos datos demuestran el pipeline,
  no el rendimiento futuro sobre clientes reales.
