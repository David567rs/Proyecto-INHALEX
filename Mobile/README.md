# INHALEX Móvil

Base estructural y documental de la aplicación móvil Android de la **Plataforma Digital de Comercio Electrónico para INHALEX**.

> Estado actual: preparación del repositorio. El proyecto ejecutable de Expo se incorporará posteriormente mediante la rama `feature/mobile-bootstrap`. Esta carpeta no pretende simular una aplicación terminada ni contiene dependencias instaladas.

## Alcance

La aplicación móvil estará dirigida a clientes y reutilizará la API REST existente de INHALEX. Incluirá:

- registro, inicio de sesión y persistencia segura de sesión;
- catálogo, líneas, búsqueda y detalle de aromas;
- favoritos y bolsa de compras;
- direcciones, confirmación y creación de pedidos;
- historial y seguimiento de pedidos;
- avisos, confirmación de recepción y reseñas;
- perfil y configuración de cuenta.

No forman parte del alcance móvil:

- el panel administrativo;
- la Skill de Alexa;
- una versión para iOS durante este cuatrimestre.

## Tecnología prevista

- React Native con Expo;
- TypeScript;
- Expo Router;
- API REST NestJS existente;
- MongoDB a través del backend (la app nunca se conecta directamente a la base de datos);
- compilación Android y publicación en Google Play.

## Estructura preparada

```text
Mobile/
|-- assets/                    # Imágenes, fuentes e iconos de la app
|-- src/
|   |-- app/                   # Rutas y composición de pantallas
|   |-- core/                  # API, configuración, almacenamiento y tema
|   |-- features/              # Módulos funcionales por dominio
|   |   |-- auth/
|   |   |-- catalog/
|   |   |-- favorites/
|   |   |-- cart/
|   |   |-- orders/
|   |   `-- account/
|   `-- shared/                # Componentes, hooks, tipos y utilidades comunes
|-- tests/                     # Pruebas compartidas e integración
|-- .env.example
|-- .gitignore
|-- ARCHITECTURE.md
`-- README.md
```

Cada módulo de `features` se divide en:

- `presentation`: pantallas, componentes y estado de interfaz;
- `domain`: entidades, contratos y casos de uso;
- `data`: repositorios, fuentes remotas y mapeadores de DTO.

## Configuración prevista

Cuando se integre el scaffold de Expo:

```bash
cd Mobile
npm install
copy .env.example .env
npx expo-doctor
npx expo start
```

La URL pública de la API se define mediante:

```env
EXPO_PUBLIC_API_URL=https://inhalex-backend.onrender.com/api
```

En desarrollo local podrá cambiarse por la dirección IP accesible de la computadora, por ejemplo `http://192.168.x.x:3200/api`. En un dispositivo físico no debe utilizarse `localhost`, porque apuntaría al propio teléfono.

## Flujo de incorporación inicial

1. Crear `feature/mobile-bootstrap` desde `develop`.
2. Generar el proyecto Expo con plantilla TypeScript dentro de esta carpeta.
3. Conservar la organización descrita en `ARCHITECTURE.md`.
4. Ejecutar `npx expo-doctor` y las pruebas disponibles.
5. Abrir un Pull Request hacia `develop`.
6. Solicitar revisión del otro integrante antes de fusionar.

## Seguridad

- No se versionarán archivos `.env`, tokens, contraseñas ni llaves de firma.
- Los tokens de sesión se almacenarán con una solución segura como `expo-secure-store`.
- La aplicación consumirá la API por HTTPS.
- Toda autorización sensible se validará nuevamente en el backend.
- MongoDB solo será accedido por NestJS; nunca desde React Native.

Consulta las reglas completas de colaboración en [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
