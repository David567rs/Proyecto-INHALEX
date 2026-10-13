# Creación de pedido — verificación

Fecha: 2026-10-13. Rama de trabajo: `mobile/david-pedido`.

## Alcance implementado

- [x] Acceso desde Bolsa, manteniendo las cinco pestañas.
- [x] Verificar productos y cantidades con una lectura actual de la bolsa.
- [x] Consultar precios, disponibilidad, ajustes e incidencias mediante `POST /orders/draft/preview`.
- [x] Mostrar productos, cantidades, precio unitario y subtotal autoritativo.
- [x] Seleccionar una dirección guardada y acceder a su administración.
- [x] Validar nombre, correo y teléfono de contacto antes de enviar.
- [x] Confirmar mediante `POST /orders/confirm`, con Bearer e `Idempotency-Key`.
- [x] Bloquear doble toque y cambios de bolsa mientras se revisa/confirma.
- [x] Conservar clave y cuerpo originales ante timeout, 5xx o confirmación inválida.
- [x] Persistir el intento antes del envío; recuperar intentos pendientes por usuario.
- [x] Renovar resumen tras un 409 conocido y solicitar una nueva confirmación explícita.
- [x] Mostrar referencia y estado real (`pending_review`, o estado posterior al recuperar).
- [x] Limpiar la bolsa solo después de confirmar y guardar el resultado.
- [x] Reintentar limpieza sin repetir la creación del pedido.
- [x] Conservar la bolsa si cambió remotamente, se omitieron productos o se ajustaron cantidades.
- [x] Revisar código, pruebas de regresión y errores de conexión.

El importe mostrado corresponde a productos. La API no devuelve una tarifa de envío ni procesa el pago en este flujo. La pantalla informa que el pedido será revisado y que pago/entrega se coordinarán posteriormente.

## Arquitectura y recuperación

`features/orders` mantiene dominio, Repository, Adapter y controller inyectable. El provider se monta dentro de la sesión del usuario y sobre las rutas, de modo que salir de la pantalla no pierda una confirmación pendiente.

Se añadió `expo-crypto ~57.0.4` mediante `npx expo install expo-crypto` para generar UUID aleatorios. El intento se guarda en SecureStore nativo, en fragmentos Unicode de hasta 1800 bytes, publicando el manifiesto al final. En web se usa sessionStorage por usuario y pestaña; los tokens siguen en el repositorio de sesión existente y nunca se copian al almacenamiento del pedido. Si no se puede leer el intento pendiente, no se permite comenzar otro hasta recuperarlo.

Una confirmación incierta conserva la clave incluso si un reintento recibe 400/409, porque la primera petición podría seguir procesándose. La app no reenvía automáticamente al iniciar: ofrece “Verificar confirmación”. Un pedido recibido conserva su estado de éxito aunque falle la actualización de la bolsa.

Limitación del contrato actual: comparar la bolsa y `DELETE /cart` son dos peticiones independientes. Se detectan cambios antes de eliminar, pero impedir una modificación desde otro dispositivo entre ambas operaciones requiere una operación condicional/atómica en el backend. No se modificó el servidor para esta tarjeta.

## Validación realizada

- Suite completa: **248 pruebas aprobadas** (`node --test scripts/*.test.cjs`).
- Nuevas pruebas: 34 controller de pedidos, 15 dominio/repositorio/transporte, 13 almacenamiento y 10 controller de bolsa. Cobertura del repositorio de bolsa ampliada para DELETE y respuesta inválida.
- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado.
- `npx expo-doctor`: **20/21**; persisten las diferencias de parche anteriores: Expo 57.0.27 → 57.0.28, Router 57.0.25 → 57.0.26 y Splash Screen 57.0.9 → 57.0.10.
- API local real: lectura pública de productos y resumen de un producto disponible, 60 MXN, validado por el mapper. No se creó un pedido real durante esta comprobación.
- Aplicación completa web: inició en `/sign-in` sin errores de carga.
- Interacción web con vista/controller reales y repositorios simulados: validación/foco de teléfono, elección de otra dirección, confirmación, timeout y recuperación usando una sola clave, nuevo resumen de 120 a 140 MXN tras 409, limpieza fallida y reintento sin nuevo POST, dirección faltante y error de carga.
- Vista revisada a **390 × 844** y **320 × 700 píxeles CSS**; sin desbordamiento de la página. No hubo errores de consola. La barra superior de escenarios pertenece únicamente al fixture temporal.

## Evidencias visuales

Las capturas usan **datos simulados**; no prueban la creación de un pedido contra la API real. El fixture temporal fue eliminado después de la revisión.

- [Resumen móvil](evidence/2026-10-13-pedido-resumen-web.jpg)
- [Resumen a 320 px](evidence/2026-10-13-pedido-resumen-320-web.jpg)
- [Contacto obligatorio](evidence/2026-10-13-pedido-validacion-web.jpg)
- [Dirección faltante](evidence/2026-10-13-pedido-sin-direccion-320-web.jpg)
- [Cambio de disponibilidad/precio](evidence/2026-10-13-pedido-cambio-web.jpg)
- [Confirmación incierta](evidence/2026-10-13-pedido-incierto-web.jpg)
- [Pedido recibido](evidence/2026-10-13-pedido-confirmado-web.jpg)
- [Limpieza pendiente](evidence/2026-10-13-pedido-bolsa-pendiente-web.jpg)
- [Error de carga](evidence/2026-10-13-pedido-error-320-web.jpg)

## Confirmación del usuario y comprobaciones pendientes

David confirmó el 2026-10-13: «sí funciona bien», después de solicitarle probar el flujo completo en Expo Go con la API real. Esta confirmación acredita el funcionamiento general reportado por el usuario; las comprobaciones específicas siguientes no se dan por realizadas individualmente.

- [x] Funcionamiento general del flujo de creación de pedido confirmado por David.
- [ ] Registrar evidencia específica de la prueba en Expo Go: Bolsa, dirección y confirmación.
- [ ] Verificar referencia y pedido persistido en el sistema, con la bolsa actualizada.
- [ ] Comprobar teclado, botón Atrás de Android y lector de pantalla.
- [ ] Comprobar recuperación de SecureStore tras cerrar/reabrir la app durante una confirmación incierta.
- [ ] Comprobar cambio de cuenta sin exponer contacto/dirección/pedido de otra sesión.

Estas comprobaciones permanecen pendientes hasta contar con evidencia del dispositivo. No marcar la tarjeta como terminada únicamente por las capturas simuladas.
