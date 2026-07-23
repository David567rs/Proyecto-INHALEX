# Material académico de aprendizaje automático de INHALEX

> **Estado actual (23 de julio de 2026):** las propuestas 1 y 2 ya dejaron de
> ser mockups. La recomendación Apriori funciona en la bolsa y la predicción
> mensual se consulta en `/admin/ventas`. La presentación general, su PDF,
> `guion-exposicion.md`, `preview/` y `generar-presentacion.ps1` conservan la
> versión histórica producto-día/semanal y no deben usarse para demostrar la
> implementación vigente.

Este paquete contiene los materiales para la exposición de siete diapositivas:

- `INHALEX-Propuestas-ML.pptx`: presentación editable.
- `INHALEX-Propuestas-ML.pdf`: versión lista para proyectar.
- `guion-exposicion.md`: explicación oral y respuestas a preguntas probables.
- `assets/`: captura real del sistema y bases visuales de los tres mockups.
- `preview/`: imagen de cada diapositiva para revisar rápidamente el diseño.
- `generar-presentacion.ps1`: script reproducible que construye el PPTX.

## Orden de las diapositivas

1. INHALEX: descripción y captura real.
2. Propuesta 1: sistema de recomendación y dataset transaccional.
3. Implementación visual de la recomendación.
4. Propuesta 2: regresión para predecir demanda.
5. Implementación visual del pronóstico administrativo.
6. Propuesta 3: clustering para segmentar clientes.
7. Implementación visual de los segmentos en administración.

## Antes de presentar

- Escribe los nombres de los integrantes si el docente los solicita.
- Lleva tanto el archivo `.pptx` como el `.pdf`.
- No leas las diapositivas; usa el guion como apoyo.
- Llama a las fuentes **colecciones MongoDB**, no tablas relacionales.
- Aclara que las uniones son relaciones lógicas por identificadores.
- Para P1 y P2 utiliza capturas de las vistas reales; el mockup de P3 continúa
  siendo conceptual.
- Explica que los CSV son sintéticos y reproducibles: demuestran estructura y ETL, no el rendimiento definitivo con usuarios reales.

## Datos verificados

- Recomendación: 1,674 canastas, 861 multiproducto, 36 reglas y 100% de
  cobertura del catálogo. La evaluación temporal Top-1 obtuvo 14.98% sobre
  datos sintéticos.
- Demanda: 288 filas producto-mes, 240 entrenables y 16 predicciones para
  julio de 2026. Ridge obtuvo MAE 8.37 frente a 9.77 del baseline, una mejora
  de 14.38% sobre datos sintéticos.
- Segmentación: 300 fotografías de cliente a la fecha de corte.
- Calidad P1/P2: artefactos validados, dos libretas ejecutables, backend y
  frontend compilados.
