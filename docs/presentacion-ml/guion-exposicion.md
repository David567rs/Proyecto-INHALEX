# Guion de exposición — INHALEX

Duración sugerida: entre 6 y 8 minutos. Habla aproximadamente 45–60 segundos
por diapositiva.

## Diapositiva 1 — INHALEX: aromaterapia inteligente

### Idea que debe quedar clara

INHALEX ya es un sistema funcional y sus operaciones generan datos que pueden
convertirse en aplicaciones de aprendizaje automático.

### Guion

> Nuestro proyecto se llama INHALEX. Es una tienda y sistema web especializado
> en productos de aromaterapia. El cliente puede explorar aromas según
> necesidades como relajación, insomnio o vías respiratorias, guardar favoritos,
> administrar su bolsa, realizar pedidos, publicar reseñas y confirmar la
> recepción. También existe un panel administrativo para productos, inventario,
> pedidos, ventas e incidencias, además de una skill de Alexa. A partir de los
> datos que ya genera el sistema proponemos tres aplicaciones: recomendaciones
> personalizadas, predicción de demanda y segmentación de clientes.

### Transición

> La primera propuesta utiliza el historial de interacción para ayudar al
> cliente a descubrir el aroma más relevante para él.

## Diapositiva 2 — Propuesta 1: recomendación personalizada

### Tipo

Sistema de recomendación híbrido con dataset transaccional.

### Guion

> Esta propuesta corresponde a un sistema de recomendación. De `pedidos`
> obtenemos compras y canastas; de `usuarios`, favoritos y productos en bolsa;
> de `reseñas_producto`, la calificación; y de `productos`, categoría, aromas y
> beneficios. Como MongoDB almacena arreglos embebidos, primero desanidamos los
> artículos para producir una fila por interacción cliente-producto. Cada señal
> recibe un peso: un favorito aporta menos que una compra, por ejemplo. Para las
> reglas de asociación filtramos únicamente `event_type = purchase`: la tabla
> de la diapositiva muestra una fila por producto comprado y el mismo `order_id`
> une Toronjil con Jengibre dentro de una canasta. Al agrupar por pedido formamos
> el dataset transaccional. No existe una Y clásica: la
> salida es un Top-N de productos o una regla como “quien compra Lavanda también
> suele comprar Manzanilla”.

### Conceptos para señalar en la diapositiva

- 22,274 interacciones cliente-producto.
- 3,003 renglones de compra agrupados en 1,674 canastas.
- Modelo híbrido: contenido + señales implícitas + reglas de asociación.
- Métricas futuras: Precision@K, Recall@K, NDCG y cobertura.

### Aclaración si preguntan por vistas y clics

> El CSV académico completo es sintético, verosímil y reproducible. En
> producción, compras, favoritos y reseñas se extraerían de las colecciones
> actuales. Favoritos y bolsa son una fotografía del estado presente; para
> historizar vistas y clics agregaríamos una colección
> `interacciones_producto` con usuario, producto, evento, sesión y fecha.

## Diapositiva 3 — ¿Dónde se implementaría la recomendación?

### Guion

> La recomendación aparecería en el catálogo como una sección llamada “Aromas
> para ti”. Cada tarjeta explicaría por qué se muestra, por ejemplo porque el
> usuario guardó productos relajantes o porque otros clientes compraron Lavanda
> junto con Manzanilla. Esa explicación evita que el resultado parezca
> aleatorio. El cliente podría abrir el producto o agregarlo a la bolsa y esas
> nuevas acciones retroalimentarían el modelo. Para un usuario nuevo usaríamos
> productos populares por categoría como estrategia de arranque. La misma lista
> también podría ser consultada mediante Alexa.

### Frase clave

> No solo recomendamos un producto: explicamos la razón de la recomendación.

## Diapositiva 4 — Propuesta 2: predicción de demanda

### Tipo y objetivo

Regresión supervisada con estructura temporal.

`target_requested_units_next_7d` = suma de unidades solicitadas durante los
siete días posteriores.

### Guion

> La segunda propuesta es una regresión de demanda. La unidad de análisis es un
> producto en un día. De `pedidos` extraemos las cantidades solicitadas, incluso
> cuando después existe cancelación, porque demanda no es lo mismo que venta
> satisfecha. `productos` aporta categoría, precio y existencias;
> `producto_inventario_movimientos` permite reconstruir el inventario; y las
> reseñas aportan reputación acumulada. Después agrupamos por producto y fecha,
> completamos los días sin pedidos y calculamos rezagos de 1, 7, 14 y 28 días y
> medias móviles usando solo el pasado. La variable Y es la demanda total de la
> siguiente semana. El modelo puede producir 17.6 unidades y el sistema lo
> convertiría operativamente en una recomendación de 18.

### Conceptos para señalar

- 8,736 filas = 16 productos × 546 días.
- 8,624 filas tienen Y; las últimas 112 no tienen siete días futuros.
- Separación de entrenamiento y prueba por fecha, nunca aleatoria.
- Métricas sugeridas: MAE y RMSE; WAPE como indicador de negocio.

### Frase clave

> Predecimos demanda solicitada, no solamente ventas que el inventario logró
> satisfacer.

## Diapositiva 5 — ¿Dónde se implementaría la predicción?

### Guion

> El pronóstico se integraría en el módulo administrativo de ventas e
> inventario. Para cada producto se mostrarían la demanda esperada de los
> próximos siete días, las existencias actuales y una sugerencia de reabasto.
> La gráfica separaría claramente los datos históricos de la línea pronosticada
> y podría incluir una banda de incertidumbre. Si la demanda estimada supera el
> stock más un margen de seguridad, se genera una alerta. El administrador
> conserva la decisión final: el modelo funciona como apoyo para reducir
> faltantes y también evitar sobreinventario.

### Ejemplo oral

> “Para Lavanda se esperan 18 unidades, hay 7 disponibles y el sistema sugiere
> reabastecer al menos 11 más un margen de seguridad”.

## Diapositiva 6 — Propuesta 3: segmentación de clientes

### Tipo

Clustering no supervisado con variables RFM y conductuales.

### Guion

> La tercera propuesta es clustering; por eso no existe una variable Y ni
> clases conocidas. Construimos una fotografía por cliente en una fecha de
> corte. De `pedidos` calculamos recencia, frecuencia, monto, unidades y
> diversidad; de `usuarios`, favoritos y antigüedad; de las reseñas, actividad
> y calificación; y de `productos`, afinidad por cada línea. No utilizamos
> nombre, correo, teléfono ni dirección. Antes de aplicar K-Means usamos log1p
> en variables sesgadas, imputamos faltantes y estandarizamos las escalas. El
> número de grupos se compara con silhouette y estabilidad; posteriormente se
> interpretan los centroides y se asignan nombres comerciales.

### Grupos esperados

1. Leales y de alto valor.
2. Nuevos o prometedores.
3. Ocasionales o sensibles a promociones.
4. Inactivos o en riesgo de abandono.

### Matiz académico

> Esos grupos son hipótesis de negocio, no etiquetas verdaderas. En la libreta,
> K=2 obtiene el silhouette mayor; K=4 ofrece una lectura comercial más
> detallada, por lo que debe validarse antes de adoptarlo.

## Diapositiva 7 — ¿Dónde se implementaría la segmentación?

### Guion

> Los segmentos aparecerían únicamente en el panel administrativo, dentro de
> usuarios y promociones. El administrador vería el tamaño y características
> de cada grupo, podría filtrar por línea preferida y preparar una acción
> apropiada: bienvenida para nuevos, acceso anticipado para leales o una campaña
> de reactivación para clientes en riesgo. La segmentación se recalcularía de
> forma periódica porque una persona puede cambiar de grupo. Usamos únicamente
> comportamiento dentro del sistema y no datos sensibles; el propósito es
> evitar promociones genéricas, no excluir clientes.

### Cierre sugerido

> Las tres propuestas aprovechan el mismo sistema desde perspectivas distintas:
> personalizar la experiencia del cliente, anticipar decisiones de inventario y
> comprender patrones de comportamiento.

## Preguntas probables del docente

### “¿Por qué muestran colecciones y no tablas?”

> INHALEX usa MongoDB. Los documentos contienen arreglos embebidos, como los
> artículos de un pedido. El ETL usa `$unwind`, agrupaciones y relaciones
> lógicas por identificadores para convertirlos en DataFrames tabulares.

### “¿Los datos son reales?”

> Son datos sintéticos verosímiles y reproducibles, generados respetando los
> esquemas del sistema y cargados solo en MongoDB local. Sirven para demostrar
> la estructura, el ETL y la libreta sin exponer clientes reales. No prueban aún
> el rendimiento que tendrá el modelo con tráfico real.

### “¿Por qué regresión si las unidades son enteras?”

> El modelo estima un valor esperado continuo. Después se redondea y se combina
> con inventario y margen de seguridad para tomar una decisión operativa.

### “¿Cuáles son las clases del clustering?”

> No existen clases previas. El clustering descubre grupos; los nombres se
> asignan después de interpretar sus centroides. Si hubiera clases conocidas,
> sería clasificación y no clustering.

### “¿Dónde está el dataset transaccional del recomendador?”

> En el subconjunto `event_type = purchase`: cada fila enlaza un `order_id` con
> un `product_id`. Al agrupar por pedido obtenemos 1,674 canastas para Apriori;
> el dataset completo agrega favoritos, bolsa, reseñas y contenido para el
> recomendador híbrido.

### “¿Cómo evitan fuga de información en demanda?”

> Los lags y medias móviles usan solamente días anteriores; la evaluación se
> divide cronológicamente. La Y se construye con los siete días posteriores y
> nunca se incluye entre las X.

### “¿Qué modelo usarían?”

- Recomendación: TF-IDF + perfil implícito + Apriori; después un híbrido.
- Demanda: baseline ingenuo y regresión; luego Random Forest o XGBoost con
  validación temporal.
- Segmentación: RFM + K-Means; comparar K con silhouette y estabilidad.
