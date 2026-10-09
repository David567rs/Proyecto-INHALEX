# INHALEX móvil

Aplicación Android Expo + React Native escrita en TypeScript. La autenticación y el catálogo siguen MVVM + Repository y consumen la API NestJS existente. La plataforma web se conserva como soporte de desarrollo; la distribución se prepara únicamente para Android.

## Inicio y catálogo

Inicio adapta la identidad visual de la web: logo original, fotografía botánica, saludo personal, búsqueda de aromas, filtros por línea, selección horizontal de productos y panel de detalles. «Descubrir aromas» desplaza al catálogo; «Ver todos» abre la colección completa.

«La experiencia INHALEX» reproduce `Client/public/videos/Aplicar.mp4` mediante `expo-video`, de forma automática, silenciosa y en bucle. La copia móvil conserva el encuadre completo 7:4 y los 10.8 segundos, optimizada a 1260 × 720 en H.264 para Android. Puede pausarse y se detiene al salir de la app; al cerrar el panel se libera el reproductor. El archivo original de la web no se modifica.

Los productos, categorías, precios, promociones y disponibilidad se consultan en la API. Hay estados de carga, error y selección vacía, reintento y actualización al deslizar hacia abajo. Las fotografías actuales se empaquetan desde los assets originales de la web; no se construyen URLs de imagen contra el backend. Para futuras imágenes alojadas externamente puede definirse `EXPO_PUBLIC_ASSET_URL` con un origen HTTPS.

Las entradas y pulsaciones usan animaciones nativas suaves, respetan reducir movimiento y el catálogo se adapta a pantallas estrechas o texto ampliado.

Los detalles muestran las 15 fotografías originales de frascos de `Client/public/aromas`, completas y con proporción 2:3. La foto ocupa todo su contenedor redondeado, sin márgenes internos ni un fondo de otro color; en pantallas cortas, ambas dimensiones se reducen juntas. El catálogo conserva las fotos botánicas. `getAromaProductImage` selecciona cada frasco por identidad exacta de producto; Romero muestra un estado de imagen no disponible porque todavía no hay foto de ese frasco en la carpeta original.

## Arquitectura

| Técnica | Implementación |
| --- | --- |
| Cliente–Servidor | `HttpClient` consume los endpoints públicos de productos y autenticación de NestJS. |
| MVVM | Las pantallas presentan estado y acciones de `useCatalogViewModel`; el ViewModel controla búsqueda, carga y detalle. |
| Repository | `CatalogRepository` define el contrato; `HttpCatalogRepository` implementa el acceso a datos. |
| Adapter + Mapper | `ProductsApiAdapter` traduce consultas a HTTP; `catalogMapper` convierte y valida DTOs en entidades. |
| Inyección de dependencias | `createCatalogRepository` compone implementaciones; `CatalogProvider` permite inyectar otro repositorio y comparte estado entre las pestañas. |

Ver [arquitectura del catálogo](src/features/catalog/README.md) y [seguridad Android](docs/android-security.md).

## Configuración

1. Copia `.env.example` como `.env`.
2. Ajusta `EXPO_PUBLIC_API_URL` a una URL accesible desde el dispositivo.
3. Instala dependencias con `npm install`.
4. Inicia Android con `npm run android`.

Para un emulador Android con el backend local en el puerto 3200, usa normalmente:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3200/api
```

Para Expo Go en un teléfono Android y la vista web de desarrollo puedes configurar:

```env
EXPO_PUBLIC_API_URL=http://localhost:3200/api
```

En Expo Go, la app reemplaza `localhost` por la IP privada del servidor de Expo, conservando el puerto 3200 y `/api`. Así sigue la dirección de la computadora cuando cambias de red. Inicia Expo en modo LAN y conecta el teléfono y la computadora a la misma red. En la vista web se conserva `localhost`; para túneles o un backend en otra máquina, configura su dirección explícita. Reinicia Expo después de cambiar `.env`.

El backend local admite los orígenes de Expo en el puerto 8081 durante desarrollo. `Server/.env` debe tener una sola definición activa de `NODE_ENV=development`; en producción, CORS conserva exclusivamente los orígenes configurados.

## Verificación

```bash
npm run typecheck
npm run lint
npm run doctor
node --test scripts/*.test.cjs
npx expo export --platform android --output-dir dist
```

En Android, el JWT se almacena mediante `expo-secure-store`. La vista web de desarrollo utiliza una sesión temporal en memoria y vuelve al acceso al recargar la página; no persiste el token en el navegador. Al abrir Android se consulta `GET /auth/me`; un token rechazado se elimina, mientras que una falla temporal de red conserva el token y ofrece reintentar o cerrar la sesión local.
