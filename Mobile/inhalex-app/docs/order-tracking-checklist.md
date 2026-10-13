# Seguimiento del pedido — revisión de implementación

Tarjeta: **Seguimiento del pedido** (David). Rama: `mobile/david-seguimiento`.
Fecha: 2026-10-13. Pendiente de prueba autenticada en Expo Go y de integración mediante PR.

## Criterios de la tarjeta

- [x] Obtener estado del pedido desde la API mediante Adapter + Repository + DI.
- [x] Mostrar referencia, fecha de creación, cantidad e importe de productos.
- [x] Mostrar los estados reales: pendiente de revisión, confirmado, cancelado y completado.
- [x] Actualizar al abrir la pantalla, volver a ella, regresar la app a primer plano o pulsar Actualizar; también mediante gesto para refrescar.
- [x] Manejar pedidos no encontrados con acceso al historial.
- [x] Manejar errores de conexión y reintentos; conservar la última consulta identificada como tal.
- [x] Probar los cuatro estados y sus fechas con pruebas automatizadas y vistas web simuladas.
- [x] Revisar código, ciclo de vida, aislamiento entre cuentas y campos expuestos.

## Integración y contrato

- Entrada desde **Cuenta → Historial de pedidos → Detalle → Seguir mi pedido**, y desde la confirmación de un pedido. Se conservan las cinco pestañas.
- Ruta móvil: `/cuenta/seguimiento/[id]`. Proveedor independiente, asociado a la cuenta autenticada; control de movimiento reducido en la transición.
- `GET /api/orders/me/:id/tracking`: `id`, `reference`, `status`, `currency`, `totalItems`, `subtotal`, `createdAt`, `confirmedAt`, `cancelledAt`, `completedAt`.
- Las tres fechas de cambios son ISO o `null`; no se inventan fechas cuando un pedido antiguo carece de ellas. La actividad muestra “Fecha no registrada” cuando corresponde.
- La actividad refleja las transiciones del servidor. Un pedido cancelado puede haber sido confirmado antes; no se añaden estados de transporte o entrega inexistentes en el modelo.
- **Última consulta** es la hora local de la última lectura correcta de la API, no la hora de un cambio de estado.
- El importe se etiqueta **Total de productos**. No se supone pago recibido ni se calcula un envío que la API no proporciona.
- El endpoint exige JWT, filtra `customerUserId` por el `sub` firmado y excluye borradores. ID inválido, pedido ajeno, inexistente o borrador reciben el mismo 404.
- `Cache-Control: private, no-store`; proyección y respuesta explícitas excluyen contactos, dirección, claves de idempotencia, notas privadas y personal administrativo.
- Cada consulta obtiene un token fresco. Se validan identidad del pedido, estado, importes y fechas recibidas.
- Las actualizaciones simultáneas se agrupan. Las respuestas tardías tras salir, cambiar pedido o cambiar cuenta se ignoran. La carga funciona aunque el foco inicial ocurra antes de iniciar el proveedor.
- Los fallos transitorios conservan únicamente la última consulta del mismo pedido. Los errores 401/403/404 retiran los datos. Salir de la pantalla elimina la suscripción a AppState; no hay sondeo periódico en segundo plano.
- Entrar al seguimiento desde un pedido recién creado conserva su intento y el estado de actualización de la bolsa.

## Validación realizada

- Suite móvil completa: **331/331** con `node --test scripts/*.test.cjs`, incluyendo 28 pruebas nuevas del controlador y 13 de datos/contrato.
- Servidor: **56/56** en `customer-order-history.service.spec.ts`, `order-history.controller.spec.ts` y `orders.service.spec.ts`; incluye 17 casos nuevos de seguimiento.
- Pruebas HTTP con JWT real y persistencia simulada: titularidad por `sub`, autenticación requerida, token vencido, campos privados excluidos, cabeceras y rutas existentes.
- Compilación productiva del servidor (`npm run build`) y ESLint de los archivos modificados del servidor: aprobados.
- TypeScript (`npm run typecheck`) y lint (`npm run lint -- --no-cache`) móviles: aprobados. Se regeneraron los tipos ignorados de rutas con el generador instalado y un contexto nuevo de `src/app` por el defecto incremental de Metro en Windows documentado en la tarjeta anterior; no se modificó `node_modules` ni se añadieron conversiones para ocultar errores.
- Vistas y controlador reales con repositorio simulado a 390×844 y 320×700: cuatro estados, actividad y resumen, ausencia de fechas, fallo inicial, fallo de actualización conservando datos, recuperación, 404 y sesión vencida retirando los datos.
- Arranque de la aplicación web completa comprobado hasta el acceso habitual, sin errores de consola. No se inició sesión ni se crearon o modificaron pedidos reales durante estas pruebas.
- API local real: el nuevo endpoint sin autenticación responde **401**.

## Evidencias web — datos simulados

- `evidence/2026-10-13-seguimiento-pendiente-web.jpg`
- `evidence/2026-10-13-seguimiento-confirmado-web.jpg`
- `evidence/2026-10-13-seguimiento-completado-320-web.jpg`
- `evidence/2026-10-13-seguimiento-actividad-320-web.jpg`
- `evidence/2026-10-13-seguimiento-cancelado-320-web.jpg`
- `evidence/2026-10-13-seguimiento-error-320-web.jpg`
- `evidence/2026-10-13-seguimiento-no-encontrado-320-web.jpg`

## Pendiente en Expo Go — revisión aplazada por David

- [ ] Con la cuenta real, abrir seguimiento desde el historial y desde un pedido recién creado; comprobar referencia e importe.
- [ ] Verificar botón Atrás, gesto nativo, cinco pestañas y regreso al historial.
- [ ] Cambiar legítimamente el estado de un pedido de prueba y actualizar; comprobar fechas y etiquetas.
- [ ] Enviar la app a segundo plano y regresar estando en seguimiento; verificar actualización sin peticiones repetidas.
- [ ] Probar el gesto para refrescar y la recuperación cuando la API vuelve a estar disponible.
- [ ] Cerrar sesión y cambiar de cuenta; comprobar que se retiran los datos previos.
- [ ] Comprobar texto ampliado, lector de pantalla y movimiento reducido en dispositivo.

Las pruebas web simuladas no sustituyen la revisión autenticada de la API real ni las comprobaciones nativas pendientes.
