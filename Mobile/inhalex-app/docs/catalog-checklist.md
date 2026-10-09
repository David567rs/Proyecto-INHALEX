# Catálogo de productos: criterios de Trello

Revisión del **7 de octubre de 2026** en `Mobile/inhalex-app`. Esta evidencia corresponde a la tarjeta «Catálogo de productos» de la captura; no modifica el tablero.

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Diseñar pantalla del catálogo | Implementado | [CatalogScreen](../src/features/catalog/presentation/screens/CatalogScreen.tsx): `FlatList`, márgenes y columnas adaptables, búsqueda y filtros. Tarjetas redondeadas, entradas suaves, pulsaciones y skeleton que respetan movimiento reducido. |
| Obtener productos desde la API | Verificado | [ProductsApiAdapter](../src/features/catalog/data/adapters/ProductsApiAdapter.ts), [HttpCatalogRepository](../src/features/catalog/data/repositories/HttpCatalogRepository.ts) y [catalogDependencies](../src/features/catalog/data/catalogDependencies.ts): GET públicos e inyección de dependencias. API local: 16 productos y 5 líneas. |
| Mostrar nombre, imagen, precio y datos principales | Implementado | [ProductCard](../src/features/catalog/presentation/components/ProductCard.tsx): nombre, imagen principal, línea, notas y precio de la API; promoción/disponibilidad cuando corresponden. [catalogMapper](../src/features/catalog/data/mappers/catalogMapper.ts) valida y normaliza datos. |
| Manejar estado de carga | Verificado | [CatalogState](../src/features/catalog/presentation/components/CatalogState.tsx) muestra skeleton. [CatalogController](../src/features/catalog/presentation/viewModels/CatalogController.ts) separa carga de productos, categorías, recarga y detalle. |
| Mostrar mensaje cuando no existan productos | Verificado | Estado vacío distingue «Sin coincidencias» de catálogo sin productos; ofrece «Ver todos» o «Actualizar catálogo». `resetFilters` limpia búsqueda y línea de forma atómica. |
| Manejar errores de conexión | Verificado | Error inicial con «Reintentar»; recarga fallida conserva productos vigentes con aviso. Sin productos, un fallo de recarga pasa a error. Las categorías pueden fallar sin bloquear productos. |
| Verificar navegación al detalle del producto | Verificado | Tarjeta abre [ProductDetails](../src/features/catalog/presentation/components/ProductDetails.tsx) y consulta GET `/products/:slug`. El detalle conserva datos al fallar, permite reintentar y no reaparece por respuestas tardías tras cerrarlo. |
| Probar la funcionalidad | Verificado en pruebas y navegador | 28 casos automatizados: 19 Controller + 6 datos + 3 fotografías. Navegador con componentes reales/API pública y fallos temporales; exportación Android Hermes correcta. Pendiente confirmar interacción en teléfono Android físico. |
| Revisar el código | Revisado | MVVM con controlador observable, hook de suscripción, Repository, Adapter, Mapper y composición de dependencias. TypeScript y lint sin errores; pruebas de carreras de requests y stop/restart. |

## Verificación reproducible

```bash
node --test scripts/catalog-controller.test.cjs scripts/catalog.test.cjs scripts/aroma-images.test.cjs
npm run typecheck
npm run lint
```

El Controller prueba estados, debounce de 280 ms, cambios de filtro, respuestas fuera de orden, recargas simultáneas, detalle y desmontaje/reinicio. Las pruebas de datos comprueban promociones, transporte inyectado, mapeo, búsqueda literal y propagación de errores. Las de imágenes evitan seleccionar un frasco incorrecto por notas aromáticas compartidas.

## Alcance y pendientes

El cliente conserva el límite existente de **100 productos por consulta**, en la primera página; no incorpora paginación nueva. Los 16 productos actuales caben en ese límite. La API también respondió correctamente a una búsqueda sin resultados, al filtro de línea verde, a una página posterior de prueba y a un detalle inexistente con HTTP 404.

**Romero tiene imagen principal de catálogo, pero falta la fotografía de su frasco** en `Client/public/aromas`. El detalle comunica esa ausencia sin reemplazarla con otro producto. Las otras fotografías del frasco mantienen proporción y producto completo.

La validación visual se hizo en navegador, con tamaños móviles y componentes de producción; los fallos se inyectaron temporalmente para revisar recuperación. La exportación del bundle Android con Expo Router y Hermes `.hbc` finalizó correctamente. No se ejecutó una prueba física en Android ni se publicó la app en Play Store.
