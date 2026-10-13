# Direcciones de envío — David

Implementación móvil preparada con asistencia de Codex. Rama: `mobile/david-direcciones`.

## Alcance

- Acceso desde Cuenta; navegación anidada que conserva las cinco pestañas.
- Lista de hasta cinco direcciones, estado vacío, carga, actualización y errores con reintento.
- Formulario para registrar y editar todos los campos del contrato existente.
- Validación de campos obligatorios, límites de longitud, teléfono de 10–15 dígitos y código postal de cinco dígitos conservando ceros iniciales.
- Selección local para envío separada de la dirección principal guardada en la API.
- Primera dirección principal; cambio de principal y eliminación con confirmación explícita.
- MVVM + Repository: controlador observable, repositorio HTTP, adapter, mapper y dependencias inyectables.
- Operaciones autenticadas y serializadas; respuestas anteriores al cierre de sesión no cambian la cuenta siguiente.
- Un resultado de guardado incierto bloquea nuevos envíos hasta actualizar la lista. No se reenvía POST automáticamente.

## Contrato verificado

`GET/POST /api/addresses` y `PATCH/DELETE /api/addresses/:addressId`, con Bearer token del usuario. Las mutaciones devuelven la lista completa. No se modificó el servidor.

Campos: `label`, `recipientName`, `phone`, `street`, `exteriorNumber`, `interiorNumber?`, `neighborhood`, `municipality`, `state`, `postalCode`, `references?`, `isDefault`. Respuesta incluye `id`.

La selección se conserva durante la sesión y se recupera hacia principal/primera si se elimina la seleccionada. No se almacena una selección de checkout en la API: la futura tarjeta Creación de pedido consumirá `selectedId` y enviará `shippingAddressId`.

El servidor solo permite reemplazar una principal marcando otra como principal; la app no ofrece desmarcarla sin reemplazo. Al eliminar la principal, usa la lista actualizada por el servidor.

## Verificación del 13 de octubre de 2026

- [x] 41 pruebas nuevas: 27 de controlador y 14 de adapter/repositorio/validación.
- [x] Suite completa: `node --test scripts/*.test.cjs` — 176 aprobadas, cero fallos.
- [x] `npm run typecheck`.
- [x] `npm run lint`.
- [x] La app completa vuelve a cargar en `/sign-in` tras integrar la ruta protegida.
- [ ] Expo Doctor: 20/21. Una comprobación detecta parches pendientes en las dependencias existentes: `expo` 57.0.27 → ~57.0.28, `expo-router` 57.0.25 → ~57.0.26 y `expo-splash-screen` 57.0.9 → ~57.0.10. Esta tarjeta no cambió `package.json` ni el lockfile.
- [x] Revisión independiente de contratos, navegación y recuperación de errores.
- [x] Pruebas visuales web con repositorio inyectado y datos simulados: vacío, campos obligatorios, alta, edición, selección, principal, cancelar eliminación, eliminar principal y seleccionar la restante.
- [x] Simulación de POST guardado con respuesta perdida: segundo guardado deshabilitado; actualización muestra una sola dirección nueva.
- [x] Error al actualizar conserva la lista confirmada y permite recuperar la conexión.
- [x] Revisión de lista a 320 y 390 píxeles CSS sin desbordamiento horizontal. El formulario se desplaza y enfoca el primer campo inválido.
- [x] Prueba funcional autenticada contra API real desde Expo Go, confirmada por David en la conversación el 13 de octubre de 2026. La confirmación no detalla cada caso del recorrido ampliado.
- [ ] Teclado, botón Atrás, lector de pantalla y cambio de sesión en dispositivo físico.

La revisión visual usó la vista y controlador de producción con un repositorio simulado temporal. No se guardaron direcciones reales ni se crearon cuentas. El fixture temporal se retiró después de verificar. La consola web solo mostró el fallback conocido de Animated a JavaScript.

## Evidencias web (datos simulados)

- [Lista](evidence/2026-10-13-direcciones-lista-web.jpg)
- [Lista a 320 px](evidence/2026-10-13-direcciones-lista-320-web.jpg)
- [Vacío](evidence/2026-10-13-direcciones-vacio-web.jpg)
- [Validación](evidence/2026-10-13-direcciones-validacion-web.jpg)
- [Respuesta de guardado incierta](evidence/2026-10-13-direcciones-guardado-incierto-web.jpg)
- [Error a 320 px](evidence/2026-10-13-direcciones-error-320-web.jpg)

## Recorrido de verificación ampliada en Expo Go

1. Iniciar sesión y abrir Cuenta → Direcciones de envío.
2. Registrar una dirección de prueba propia; comprobar confirmación y conservación al volver a entrar.
3. Agregar otra, seleccionar una y hacer principal la otra; comprobar que son estados distintos.
4. Editar campos y borrar referencias opcionales; guardar y volver a consultar.
5. Cancelar una eliminación; después confirmar una eliminación de prueba y comprobar principal/selección.
6. Comprobar el límite de cinco, errores con la API desconectada y recuperación al encenderla.
7. Cerrar sesión y entrar con otra cuenta: las direcciones anteriores no deben aparecer.

La prueba funcional real fue confirmada por David. Los casos específicos de dispositivo señalados arriba siguen pendientes de confirmación. Adjuntar PR y evidencias a Trello al entregar y mover la tarjeta a En revisión / pruebas.
