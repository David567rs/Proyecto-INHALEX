# Perfil del usuario — revisión de implementación

Tarjeta: **Perfil del usuario** (Zenaida). Rama: `mobile/zenaida-perfil`.
Fecha: 2026-10-13. Pendiente de prueba autenticada en Expo Go y de integración mediante PR.

## Criterios de la tarjeta

- [x] Crear pantalla de perfil, accesible desde Cuenta → Datos personales.
- [x] Obtener datos del usuario desde la API mediante Adapter + Repository + DI.
- [x] Mostrar nombre, apellidos, correo y teléfono; admitir registros antiguos sin campos separados.
- [x] Permitir editar nombre, apellidos y teléfono. El correo es de consulta.
- [x] Validar campos modificados y mostrar errores junto a los campos.
- [x] Guardar cambios mediante la API autenticada.
- [x] Mostrar confirmación de actualización y sincronizar los datos personales con Mi cuenta.
- [x] Manejar errores de carga y guardado, conservando el borrador ante fallos transitorios.
- [x] Probar la funcionalidad con pruebas automatizadas y vista web simulada; revisión nativa pendiente.
- [x] Revisar código, contrato, identidad, concurrencia y foco del formulario.

## Integración y contrato

- Se conservan las cinco pestañas y la arquitectura MVVM + Repository. Ruta `/cuenta/perfil`.
- El proveedor se conserva dentro de la navegación de Cuenta para retener el borrador al salir y volver. Al cambiar de usuario se crea un proveedor nuevo; respuestas antiguas quedan invalidadas.
- `GET /api/auth/me` y `PATCH /api/auth/me` exigen JWT, verifican cuenta activa y usan el `sub` firmado. Cabecera `Cache-Control: private, no-store`.
- PATCH admite exclusivamente `firstName`, `lastName`, `phone`; no acepta ID, correo, contraseña, rol ni estado. La actualización es atómica y filtra por cuenta activa.
- Nombres: 2–50 caracteres, al menos una letra, letras españolas, espacios, apóstrofo o guion; se recortan extremos y se unifican espacios. El nombre completo derivado no supera 100 caracteres.
- Teléfono: 10–15 dígitos tras recortar extremos. No se eliminan silenciosamente espacios interiores ni signos.
- Respuesta pública explícita: `_id`, `name`, `firstName`, `lastName`, `email`, `phone`, `role`, `status` y fechas públicas opcionales. Excluye contraseña, hashes, direcciones, favoritos y bolsa. Se conserva `alexaLinkedAt` para el consumidor web existente.
- El mapper móvil valida identidad, estructura y estado. Los campos separados ausentes en cuentas antiguas quedan vacíos, sin inventarlos a partir del nombre completo.
- Cada operación obtiene un token fresco; el controlador verifica que la respuesta corresponde al usuario actual. Solo anuncia éxito cuando los campos devueltos coinciden con los enviados.
- Guardados simultáneos se agrupan. No hay reintentos automáticos de escritura. Un resultado incierto conserva el formulario para que el usuario decida reintentar o descartar.
- La actualización se bloquea mientras existe un borrador. Los errores 401/403 o respuestas de otra cuenta retiran los datos de la pantalla. Cerrar sesión o cambiar de cuenta invalida las operaciones pendientes.
- La sesión recibe únicamente los campos personales editables, con comprobación del ID y estado autenticado; no se reemplaza el token ni se alteran privilegios.
- La confirmación y los errores de guardado aparecen junto al botón Guardar. El foco se mueve al primer campo inválido solo al validar; no salta mientras se corrige.

## Validación realizada

- Suite móvil completa: **378/378**, incluyendo 29 pruebas nuevas del controlador de perfil y 18 de datos/contrato; `node --test scripts/*.test.cjs`.
- Servidor: **55/55** en `profile.controller.spec.ts`, `users-profile.service.spec.ts` y `auth.service.spec.ts`; 51 pruebas nuevas y cuatro existentes.
- Pruebas HTTP con JWT real y persistencia simulada: autenticación, cuenta activa, campos prohibidos, normalización, validación, identidad, respuesta pública y cabeceras.
- Compilación productiva del servidor aprobada. ESLint de archivos nuevos y `users.service.ts` aprobado. Persisten ocho errores de lint preexistentes fuera de los cambios en `auth.controller.ts` y `auth.service.ts`.
- TypeScript y ESLint móviles aprobados. Se regeneraron las declaraciones ignoradas de Expo Router con el generador instalado y un contexto nuevo de `src/app` por el defecto incremental conocido de Metro en Windows; no se modificó `node_modules` ni se ocultaron errores con conversiones de tipos.
- Vista y controlador reales con repositorio simulado a 390×844 y 320×700: carga, validación y foco, guardado y confirmación, descarte, fallo de guardado conservando texto, navegación conservando borrador, recuperación, error inicial y sesión vencida retirando los datos.
- Cuenta antigua con nombre separado y teléfono ausentes, y correo largo: presentación sin desbordamiento observado.
- La API local real responde **401** a GET `/api/auth/me` sin autenticación. No se modificaron cuentas reales durante las pruebas.
- Arranque de la aplicación web completa hasta la pantalla de acceso comprobado, sin errores de consola y sin iniciar sesión.

## Evidencias web — datos simulados

- `evidence/2026-10-13-perfil-consulta-web.jpg`
- `evidence/2026-10-13-perfil-validacion-web.jpg`
- `evidence/2026-10-13-perfil-guardado-web.jpg`
- `evidence/2026-10-13-perfil-error-guardado-320-web.jpg`
- `evidence/2026-10-13-perfil-error-carga-320-web.jpg`
- `evidence/2026-10-13-perfil-antiguo-320-web.jpg`

## Pendiente en Expo Go — revisión aplazada por David

- [ ] Iniciar sesión y abrir Cuenta → Datos personales con la API real.
- [ ] Editar los campos permitidos; confirmar guardado, actualización de Mi cuenta y persistencia tras volver a iniciar sesión.
- [ ] Comprobar teclado, scroll, foco, botón Atrás, gesto nativo y conservación del borrador al cambiar de pestaña.
- [ ] Interrumpir y recuperar la conexión; comprobar errores de consulta y guardado sin pérdida del texto.
- [ ] Cerrar sesión y cambiar de cuenta durante consultas o guardados; verificar que no aparecen datos de la cuenta anterior.
- [ ] Comprobar lector de pantalla, texto ampliado y movimiento reducido en dispositivo.

Las pruebas web simuladas no sustituyen la revisión autenticada ni las comprobaciones nativas pendientes.
