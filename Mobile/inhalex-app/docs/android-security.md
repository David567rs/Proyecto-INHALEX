# Seguridad de INHALEX para Android

El destino de distribución es Android. La plataforma `web` se conserva exclusivamente para revisión visual durante el desarrollo; no existe un perfil de distribución iOS. Las medidas nativas se aplican al generar un APK o AAB, no dentro de Expo Go.

## Configurado en el proyecto

| Medida | Implementación | Alcance |
| --- | --- | --- |
| R8 | `expo-build-properties`: `enableMinifyInReleaseBuilds: true` | Reduce y ofusca el código Java/Kotlin en compilaciones release. |
| Android Resource Shrinker | `enableShrinkResourcesInReleaseBuilds: true` | Elimina recursos nativos no utilizados junto con R8. |
| Hermes V1 | `useHermesV1: true` | Compila JavaScript a bytecode en la distribución Android. El bytecode sigue siendo susceptible de análisis. |
| Almacenamiento de sesión | `SecureSessionRepository` utiliza `expo-secure-store` | El JWT se guarda mediante almacenamiento protegido por Android Keystore; no se persiste en almacenamiento simple. |
| Exclusión de copias de seguridad | `configureAndroidBackup: true` | Evita restaurar entradas SecureStore cuya clave ya no esté disponible. |
| HTTPS | `usesCleartextTraffic: false` y validación de `__DEV__` en `environment.ts` | El manifiesto principal bloquea HTTP y la aplicación rechaza una API HTTP en release. Los perfiles EAS incluyen una URL HTTPS. |
| Artefacto de tienda | Perfil EAS `production`, `buildType: app-bundle` | Prepara un AAB release. El perfil `preview` produce un APK release para probar las mismas medidas. |

La API sigue en el servidor NestJS existente. Los permisos, autorización, validación y cualquier secreto permanecen en el servidor. `EXPO_PUBLIC_*` y el código incluido en la app son públicos: no deben contener claves privadas, contraseñas del backend ni credenciales de servicio. La ofuscación dificulta el análisis, pero no garantiza impedirlo.

## Desarrollo local

Expo Go permite trabajar con una API local. Con `EXPO_PUBLIC_API_URL=http://localhost:3200/api`, la app Android usa la IP privada del servidor de Expo en modo LAN, conservando el puerto y la ruta de la API. El teléfono y la computadora deben estar en la misma red. Las direcciones explícitas, como `http://10.0.2.2:3200/api` para un emulador o una API en otra máquina, se conservan. Un túnel de Expo no expone automáticamente el backend.

`__DEV__` permite HTTP exclusivamente durante desarrollo. El manifiesto de depuración generado por Expo admite HTTP para Metro y la API local; el manifiesto principal de release lo bloquea. La resolución de IP local se limita a Expo Go Android durante desarrollo y nunca modifica la dirección de una compilación de distribución.

Android conserva la sesión en SecureStore. La vista web de desarrollo usa un repositorio en memoria, sin importar el módulo nativo ni persistir tokens en el navegador; la sesión termina al recargar. El backend permite los orígenes locales de Expo en el puerto 8081 durante desarrollo y conserva la lista configurada de CORS en producción.

Los APK de `preview` son release y requieren HTTPS. Cambia la URL pública de `eas.json` si el backend de pruebas tiene otro dominio con TLS válido.

La verificación reproducible se ejecuta con `node --test scripts/security.test.cjs`. Comprueba la política HTTPS de release y las propiedades generadas por los plugins. La introspección de Expo no genera carpetas nativas ni compila un APK/AAB.

## Antes de la entrega a Play Store

1. Vincula el proyecto a tu cuenta Expo/EAS y confirma que `com.inhalex.app` sea el identificador definitivo de la aplicación.
2. Genera y conserva la clave de carga mediante EAS; configura Play App Signing en Play Console. La firma y la publicación no se han ejecutado en esta etapa.
3. Compila un APK de prueba con `npx eas-cli@latest build --platform android --profile preview` y revisa inicio, acceso, cierre de sesión y navegación en un dispositivo Android real. Verifica también el AAB final de `production` antes de subirlo.
4. Comprueba en el artefacto release el manifiesto, los permisos, el bytecode Hermes y los resultados de R8/Resource Shrinker. Conserva los archivos de mapping y símbolos que correspondan a cada versión para diagnosticar errores.
5. Analiza el APK/AAB con APK Analyzer y, si está disponible, MobSF. Esta revisión necesita el artefacto compilado y todavía está pendiente.
6. Integra Play Integrity cuando estén disponibles el proyecto Google Cloud, la configuración de Play Console y un endpoint NestJS que valide los tokens y vincule el veredicto a cada solicitud protegida. No debe confiarse en un resultado decidido únicamente por el cliente.
7. Revisa las dependencias antes de la publicación. La revisión de `npm audit --omit=dev` del 5 de octubre de 2026 detectó avisos en `braces`, `decode-uri-component`, `node-forge` y `uuid`, propagados a sus dependientes. No se aplicaron actualizaciones automáticas que alteren la compatibilidad con Expo SDK 57; esta revisión permanece pendiente.

DexGuard no se incorpora: requiere una licencia y evaluación aparte. No es necesario para las medidas configuradas aquí.

## Referencias oficiales

- [Expo BuildProperties, SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/)
- [Expo SecureStore, SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/)
- [Motor Hermes en Expo](https://docs.expo.dev/guides/using-hermes/)
- [Configuración de EAS](https://docs.expo.dev/eas/json/)
- [Firma de aplicaciones Android y Play App Signing](https://developer.android.com/studio/publish/app-signing)
- [Play Integrity API](https://developer.android.com/google/play/integrity/overview)
