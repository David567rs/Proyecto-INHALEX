# Catálogo móvil

La API NestJS compartida con la web entrega productos, precios e inventario. El catálogo conserva la identidad visual de INHALEX y evita textos extensos en las tarjetas.

El recorrido de una consulta es `View → CatalogController → CatalogRepository → ProductsApiAdapter → HttpClient → API`. `HttpCatalogRepository` convierte los DTO mediante `catalogMapper`. `CatalogProvider` inyecta el repositorio y comparte el ViewModel entre Inicio y Catálogo; `useCatalogViewModel` permite que las vistas lean el estado y ejecuten acciones.

`CatalogController` es observable y se prueba sin simular hooks. `useCatalogController` conecta sus snapshots estables mediante `useSyncExternalStore`; `useMemo` conserva la instancia y `useEffect` inicia/detiene el ciclo de vida. `stop` invalida peticiones y debounce; una nueva llamada a `start` funciona también después de la limpieza de StrictMode. El proveedor admite otro `CatalogRepository` y `createCatalogRepository` admite otro transporte HTTP.

Los contratos públicos existentes son `GET /products?limit=100&page=1&search=…&category=…`, `GET /products/categories` y `GET /products/:slug`. Se mantiene el límite actual de 100 productos por consulta, sin paginación adicional. La búsqueda espera 280 ms desde la última edición y el Adapter escapa caracteres de expresión regular. Tokens independientes descartan respuestas anteriores de productos, categorías y detalle.

`CatalogScreen` utiliza `FlatList`, dos columnas o una en pantallas pequeñas/texto ampliado, y actualización mediante gesto o botón. Los estados de carga, vacío y error ofrecen acciones breves. Si falla una recarga, los productos de la misma consulta permanecen visibles con un aviso y reintento; si no había productos, el fallo muestra un estado de error. El indicador de recarga espera productos y categorías. `resetFilters` limpia búsqueda y línea en una sola actualización. El detalle conserva la información de la tarjeta mientras consulta la API y permite `retryDetail` sin cerrar la vista.

Las entradas de tarjetas, pulsaciones y skeleton de carga tienen animaciones discretas; respetan la preferencia de reducir movimiento.

La API devuelve imágenes como `/products/toronjil.jpg`, que pertenecen al frontend web. Las tarjetas usan las fotografías empaquetadas de la colección; el detalle selecciona la fotografía del frasco por identidad exacta y conserva sus proporciones. Romero tiene imagen principal para el catálogo, pero aún no tiene fotografía del frasco en `Client/public/aromas`; el detalle muestra un estado informativo sin reutilizar la foto de otro producto.

Para imágenes externas, el Mapper acepta HTTPS. `EXPO_PUBLIC_ASSET_URL`, si se configura, resuelve rutas relativas contra el host de imágenes y no contra el backend; es una variable pública.

## Validación

La auditoría local del **7 de octubre de 2026** obtuvo 16 productos y 5 líneas, comprobó filtros, paginación del servidor, respuesta vacía y detalle. Las 16 imágenes principales tienen archivo empaquetado. Este conteo es una observación de esa fecha.

La suite contiene **28 pruebas**: 19 de ciclo de vida del Controller, 6 del Adapter/Mapper/Repository y 3 de selección de fotografías del frasco, sin dependencias adicionales:

```bash
node --test scripts/catalog-controller.test.cjs scripts/catalog.test.cjs scripts/aroma-images.test.cjs
```

Se revisaron componentes reales en navegador con la API pública y fallos inyectados temporalmente: carga, búsqueda, líneas, vacío, conexión, recarga y detalle con reintento. TypeScript y lint pasaron; la exportación Android generó correctamente el bundle Hermes `.hbc`. Esa exportación verifica compilación, sin sustituir una prueba en un dispositivo Android físico.

[Evidencia de los nueve criterios de Trello](../../../docs/catalog-checklist.md).
