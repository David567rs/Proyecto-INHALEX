# PWA de INHALEX

La PWA reutiliza la web de Next.js y el servidor NestJS. Incluye instalación, estructura pública compartida, lectura sin conexión, búsqueda por voz y avisos Web Push con consentimiento. La aplicación Expo no forma parte de estos cambios.

## Funciones disponibles

| Componente | Implementación |
| --- | --- |
| Manifiesto | `Client/app/manifest.ts`, identidad INHALEX, iconos 192 y 512, icono maskable, accesos a productos, catálogo guardado y contacto. |
| App Shell | `PublicAppShell` comparte encabezado y pie entre páginas públicas; autenticación y administración conservan sus layouts. |
| Service worker | `Client/pwa/service-worker.js`, compilado como `/sw.js`. La base sin conexión incluye HTML, CSS, JavaScript, contacto e iconos ligeros. |
| Instalación | `/instalar`, accesible desde el pie de página. Botón cuando el navegador lo permite e instrucciones para instalación manual. |
| Catálogo sin conexión | Búsqueda escrita, filtro por línea, detalles, precios guardados y fecha de la copia. Sin confirmación de pedidos offline. |
| Información de empresa | Misión, visión, valores, FAQ, privacidad y términos descargados de la API. Contacto procede de las mismas constantes que la web. |
| Micrófono | Buscador del encabezado, botón de voz, aviso previo y escucha de una frase en español de México. No se guardan grabaciones ni historial de transcripciones. |
| Notificaciones | Preferencias en Mi cuenta, suscripciones por dispositivo y usuario, avisos genéricos y apertura de `/cuenta`. Requiere claves VAPID en el servidor. |

## Qué se guarda

El worker solo admite lecturas anónimas de la API configurada: `/products` con paginación acotada, `/products/categories` y `/company-content`. Requiere respuesta 200, JSON y `Cache-Control: public`; rechaza `private`, `no-store`, autorización, cookies y respuestas opacas. No guarda HTML de las páginas de Next ni respuestas RSC.

Cada lectura pública intenta actualizarse por red. Si existe copia y la red falla o tarda más de 4,5 segundos, se muestra la copia con un aviso. La retención máxima de las consultas del catálogo es de 7 días y la de contenido de empresa de 30 días. La descarga conjunta explícita tiene una vigencia de 7 días y se reemplaza completa tras una descarga exitosa. El borrado invalida descargas antiguas que sigan en curso.

“Guardar catálogo y ayuda” descarga hasta 1.000 productos y hasta 40 imágenes ligeras del propio sitio; cada imagen debe pesar como máximo 512 KiB. El número guardado y el total del catálogo se muestran si difieren. Las imágenes externas, videos y recursos pesados no se precargan. La base instalable ronda 90 KiB antes de compresión; la copia de productos depende del catálogo.

Cuenta, sesión, direcciones, favoritos, pedidos, bolsa remota, administración, reportes y suscripciones push quedan fuera de Cache Storage. El único dato persistido de push en el worker es un booleano de consentimiento. El carrito local y la credencial local ya existentes conservan su mecanismo previo; esta entrega no los migra a IndexedDB ni hace a la sesión utilizable offline.

Sin red, una navegación completa abre la vista ligera. En una página Next ya abierta, el aviso permite entrar al catálogo guardado. La copia legal se identifica como tal y no reemplaza la versión vigente del servidor. No se reenvían automáticamente pedidos, pagos ni operaciones de escritura.

## Desarrollo y pruebas

El build convierte las cinco ilustraciones de líneas y el póster de uso a WebP: sus versiones servidas pasan de 35,33 MiB a 1,35 MiB. Se conservan los PNG originales como fuentes. Los recursos generados en `Client/public/pwa`, `public/offline.html` y `public/sw.js` se regeneran desde `Client/pwa` y `scripts/build-pwa.mjs`; editar esas fuentes para mantener cambios reproducibles.

Los comandos se ejecutan dentro de `Client` o `Server`, según se indica. Las pruebas unitarias del cliente usan Node.js 24.

En `Client`:

```powershell
npm ci
npm run test:pwa
npm run typecheck
npm run build
npm run start -- -p 3001
```

La API local predeterminada es `http://localhost:3200/api`. Copiar `Client/.env.example` a `.env.local` si se necesita otro servidor. `npm run build` genera los recursos y el worker antes de compilar Next. No ejecutar solamente `next build`, porque omitiría esa generación. El worker está desactivado en `npm run dev`, salvo activación explícita mediante `NEXT_PUBLIC_PWA_DEV_ENABLED=true`.

Pruebas de navegador con API ficticia aislada, sin MongoDB ni datos de clientes:

```powershell
npx playwright install chromium
$env:NEXT_PUBLIC_API_URL = 'http://localhost:43200/api'
$env:NODE_ENV = 'production'
npm run build
npm run test:pwa:browser
Remove-Item Env:NEXT_PUBLIC_API_URL
Remove-Item Env:NODE_ENV
npm run build
```

La suite levanta y cierra sus servidores en 43001 y 43200. Comprueba manifiesto, iconos, navegación offline, catálogo, páginas legales, contacto, exclusión de datos privados, borrado, búsqueda por voz simulada y actualización aceptada por el usuario. Guarda capturas en `Client/test-results`. La última compilación restaura la configuración normal tras la prueba.

En `Server`:

```powershell
npm ci
npm test -- --runInBand
npm run build
```

El cliente ahora cuenta con configuración ESLint. El análisis completo también descubre deuda previa en componentes ajenos a PWA; no se desactivaron globalmente sus reglas. Las funciones nuevas de PWA, voz y push cuentan con comprobación focalizada.

## Publicación en Vercel y Render

1. Publicar primero la nueva versión de `Server`. Sus respuestas públicas deben incluir el DTO filtrado y los encabezados que permiten la caché. El frontend se niega a guardar respuestas de versiones anteriores que no los incluyan.
2. En Render, conservar las variables existentes y configurar `CORS_ORIGIN` para incluir `https://proyecto-inhalex.vercel.app`. Si se necesitan varios orígenes, usar una sola variable con valores separados por comas; no duplicar la misma clave.
3. En `Server`, ejecutar `npm run push:keys` una sola vez. Crea `.env.web-push`, ignorado por Git, sin imprimir la clave privada. Copiar `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` a las variables de Render. La clave privada nunca debe ir en variables `NEXT_PUBLIC_*`, código ni chats. Conservar el par de claves entre despliegues.
4. Publicar `Client` en Vercel con `NEXT_PUBLIC_API_URL=https://inhalex-backend.onrender.com/api` y comando de build `npm run build`. Tanto el cliente como el worker deben generarse con la misma URL.
5. Abrir `/instalar` con HTTPS, guardar el catálogo, instalar y comprobar el arranque sin conexión. Al desplegar otra versión, comprobar que aparece “Actualizar ahora” y que no hay recargas forzadas de formularios.
6. En Mi cuenta, activar notificaciones mediante el botón, aceptar el permiso y provocar un evento real de cuenta en un entorno de prueba. Verificar el aviso genérico, su apertura en la cuenta y la baja al cerrar sesión o cambiar de cuenta. Si no hay claves válidas, la interfaz indica que los avisos aún no están disponibles.
7. Probar el micrófono real con “busca lavanda”, permiso denegado y navegador sin reconocimiento de voz. El reconocimiento puede usar un servicio en línea del navegador; la búsqueda escrita siempre queda disponible.

Esta entrega no cambia el sitio publicado ni configura las cuentas de Vercel o Render. La recepción de push real y la captura física del micrófono requieren la prueba final en el dispositivo y entorno de destino. En iOS, Web Push requiere una aplicación agregada a la pantalla de inicio y una versión compatible del sistema.

## Fuentes técnicas

- [Next.js y aplicaciones web progresivas](https://nextjs.org/docs/app/guides/progressive-web-apps).
- [MDN sobre service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
- [MDN sobre reconocimiento de voz y compatibilidad](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).
- [Biblioteca oficial web-push](https://github.com/web-push-libs/web-push).
- [WebKit sobre Web Push en iOS e iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
