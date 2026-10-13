# Historial de pedidos — revisión de implementación

Tarjeta: **Historial de pedidos** (Zenaida). Rama de trabajo: `mobile/zenaida-historial`.
Fecha: 2026-10-13. Pendiente de prueba con la cuenta real en Expo Go y de integración mediante PR.

## Criterios de la tarjeta

- [x] Crear pantalla de historial: Cuenta → Historial de pedidos; se mantienen las cinco pestañas.
- [x] Obtener pedidos desde la API: Repository + Adapter + DI, sesión Bearer fresca en cada consulta.
- [x] Mostrar fecha, importe de productos y estado real del pedido.
- [x] Ordenar pedidos de más recientes a más antiguos; paginación de 20 con fecha e ID como desempate.
- [x] Permitir seleccionar un pedido y consultar productos, cantidades, importes y dirección histórica.
- [x] Mostrar mensaje si no existen pedidos, con acceso al catálogo.
- [x] Manejar errores de conexión y reintentos, conservando la última lista si falla la actualización.
- [x] Probar funcionalidad mediante pruebas automatizadas y vistas web con repositorio simulado.
- [x] Revisar código, aislamiento entre cuentas, campos expuestos, navegación y estados de error.

## Contrato e integración

- `GET /api/orders/me?cursor=...`: `{ orders, nextCursor }`. Página fija de 20, orden `createdAt DESC, _id DESC`; cursor validado y acotado.
- `GET /api/orders/me/:id`: resumen, productos y copia de la dirección guardada con el pedido; dirección nula en pedidos antiguos sin ella.
- Ambas rutas requieren JWT y filtran `customerUserId` por `request.user.sub`. No se adjudican pedidos por coincidencia del correo de contacto.
- Se incluyen `pending_review`, `confirmed`, `cancelled`, `completed`; los borradores no son pedidos confirmados por el cliente y no aparecen.
- ID inválido, pedido ajeno, inexistente o borrador: 404. Cursor inválido: 400. Sesión ausente o vencida: 401.
- `Cache-Control: private, no-store`; proyección y respuesta explícitas excluyen claves de idempotencia, notas administrativas, identidad del personal e información interna de inventario.
- El importe mostrado es `subtotal`, etiquetado como **Total de productos**. No representa pago recibido ni incluye un costo de envío inventado.
- La dirección procede del pedido y no cambia al editar la libreta de direcciones. La interfaz no modifica pedidos ni estados.
- El módulo vive en `src/features/orderHistory` y usa un controlador observable con operaciones separadas para lista y detalle. El proveedor se desmonta/cambia de clave al cambiar la cuenta.
- Se ignoran respuestas tardías tras salir, cambiar selección o cambiar cuenta. Una sesión inválida elimina la información cargada. Los reintentos de paginación no duplican registros.
- Historial y detalle usan rutas anidadas dentro de Cuenta, animaciones con movimiento reducido y controles con etiquetas accesibles.

## Validación realizada

- Suite móvil completa: **290/290** (`node --test scripts/*.test.cjs`); incluye 25 pruebas nuevas del controlador y 17 del repositorio/contrato.
- Servidor: **39/39** entre `customer-order-history.service.spec.ts`, `order-history.controller.spec.ts` y `orders.service.spec.ts` (27 + 6 + 6).
- Pruebas HTTP del servidor con JWT real y persistencia simulada: sin sesión, token vencido, titularidad por `sub`, precedencia de la ruta existente de confirmaciones de recepción y cabeceras de caché.
- Compilación productiva del servidor: `npm run build`, aprobada. ESLint dirigido a los archivos nuevos del servidor, aprobado.
- Revisión web de las vistas y controlador reales con datos simulados, a 390×844 y 320×700: lista, selección/detalle, importes, dirección, vacío, error inicial con reintento, error en la siguiente página y recuperación, pedido no encontrado y sesión vencida.
- A 320 px no se detectó desbordamiento horizontal en el detalle. La vista web usa el fallback JS habitual de las animaciones nativas.
- API local en ejecución: `/api/orders/me` sin autenticación responde 401; no se crearon cuentas ni pedidos para esta revisión.
- TypeScript móvil (`npm run typecheck`) y lint (`npm run lint -- --no-cache`): **aprobados**. El proceso de Metro existente presenta un defecto de regeneración incremental de tipos en Windows: al agregar archivos introduce rutas con barras invertidas. La regeneración desde `src/app` con el generador instalado produjo los tipos correctos; no se cambió `node_modules` ni se añadieron conversiones para ocultar errores. Reiniciar Expo limpia el contexto del proceso; futuras altas de rutas podrían reproducir el fallo de esa versión.
- Arranque web de la aplicación completa comprobado: muestra el acceso autenticado habitual. La navegación autenticada con datos reales queda pendiente de la prueba de David.
- La comprobación TypeScript de **todos los tests** del servidor tiene cuatro errores anteriores fuera de pedidos (tres en intelligence y uno en reviews); la compilación productiva y las suites de pedidos sí pasan.

## Evidencias web (datos simulados)

- `evidence/2026-10-13-historial-lista-web.jpg`
- `evidence/2026-10-13-historial-lista-320-web.jpg`
- `evidence/2026-10-13-historial-detalle-web.jpg`
- `evidence/2026-10-13-historial-detalle-320-web.jpg`
- `evidence/2026-10-13-historial-error-320-web.jpg`
- `evidence/2026-10-13-historial-no-encontrado-320-web.jpg`
- `evidence/2026-10-13-historial-vacio-320-web.jpg`

## Comprobaciones pendientes en Expo Go

- [ ] Entrar con la cuenta que creó el pedido anterior y abrir Cuenta → Historial de pedidos.
- [ ] Comprobar referencia, fecha, estado e importe con el pedido real; abrir su detalle y comprobar productos y dirección.
- [ ] Volver con el botón de la pantalla y con el botón/gesto nativo; verificar navegación entre las cinco pestañas.
- [ ] Deslizar para actualizar y comprobar que el historial sigue ordenado. Si hay más de 20 pedidos, usar Ver más pedidos.
- [ ] Con la API temporalmente sin conexión, comprobar mensaje y recuperación sin perder la lista.
- [ ] Cerrar sesión y entrar con otra cuenta; verificar que no aparecen los pedidos de la cuenta anterior.
- [ ] Revisar texto ampliado, lector de pantalla y movimiento reducido en el dispositivo.

La prueba visual simulada no sustituye la prueba autenticada con la API real ni estas comprobaciones nativas.
