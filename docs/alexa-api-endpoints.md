# Endpoints para Skill de Alexa - INHALEX

## Base URL

Local actual:

```txt
http://localhost:3200/api
```

Produccion / Vercel:

```txt
https://TU-DOMINIO-PUBLICO-DEL-BACKEND/api
```

Si el backend esta desplegado como proyecto/servicio separado en Vercel, usar el dominio del backend, no el dominio visual del frontend.

Ejemplo:

```txt
https://inhalex-api.vercel.app/api
```

Si el frontend esta en Vercel y consume una API externa, revisar en Vercel:

```txt
Project Settings > Environment Variables > NEXT_PUBLIC_API_URL
```

El valor de `NEXT_PUBLIC_API_URL` es la URL que debe usar la skill.

Importante para Alexa:

```txt
Alexa no puede consumir localhost desde la nube.
```

Para integrar la skill se necesita una URL publica con HTTPS. El deployment de Vercel sirve siempre que apunte al backend real y responda los endpoints `/api/...`.

```txt
https://api.inhalex.com/api
```

o un tunel temporal para pruebas:

```txt
https://xxxxx.ngrok-free.app/api
```

## Autenticacion

### Login

```txt
POST /api/auth/login
```

Headers:

```txt
Content-Type: application/json
```

Body:

```json
{
  "email": "usuario@correo.com",
  "password": "password123"
}
```

Respuesta:

```json
{
  "accessToken": "jwt_token",
  "user": {
    "_id": "id_usuario",
    "name": "Nombre Usuario",
    "firstName": "Nombre",
    "lastName": "Apellido",
    "email": "usuario@correo.com",
    "phone": "7713222972",
    "role": "user",
    "status": "active"
  }
}
```

### Usuario actual / perfil

```txt
GET /api/auth/me
```

Headers:

```txt
Authorization: Bearer <accessToken>
```

Respuesta:

```json
{
  "_id": "id_usuario",
  "name": "Nombre Usuario",
  "email": "usuario@correo.com",
  "phone": "7713222972",
  "role": "user",
  "status": "active"
}
```

### Generar codigo temporal para Alexa

Este endpoint lo usa el frontend cuando el cliente ya inicio sesion en INHALEX.
No recibe correo ni contrasena.

```txt
POST /api/auth/alexa/link-code
```

Headers:

```txt
Authorization: Bearer <accessToken>
```

Body:

```txt
No requiere body.
```

Respuesta:

```json
{
  "code": "ABCD-2345",
  "expiresAt": "2026-07-08T18:00:00.000Z",
  "expiresInSeconds": 600
}
```

Notas:

```txt
El codigo expira en 10 minutos.
El codigo es de un solo uso.
En base de datos solo se guarda hasheado.
```

### Cancelar codigo temporal de Alexa

```txt
DELETE /api/auth/alexa/link-code
```

Headers:

```txt
Authorization: Bearer <accessToken>
```

Respuesta:

```json
{
  "revoked": true
}
```

### Intercambiar codigo de Alexa por accessToken

Este endpoint lo consume la skill. La skill pide al usuario el codigo temporal mostrado en INHALEX y lo manda al backend.

```txt
POST /api/auth/alexa/exchange
```

Headers:

```txt
Content-Type: application/json
```

Body:

```json
{
  "code": "ABCD-2345"
}
```

Respuesta:

```json
{
  "accessToken": "jwt_token",
  "user": {
    "_id": "id_usuario",
    "name": "Nombre Usuario",
    "email": "usuario@correo.com",
    "phone": "7713222972",
    "role": "user",
    "status": "active"
  }
}
```

Despues de esta respuesta, Alexa debe guardar `accessToken` de forma segura y enviarlo asi:

```txt
Authorization: Bearer <accessToken>
```

Ejemplo inmediato para favoritos:

```txt
GET /api/favorites
Authorization: Bearer <accessToken>
```

### Refresh token

```txt
No existe endpoint de refresh token actualmente.
```

El backend actual emite un JWT en login. Si Alexa necesita account linking formal con OAuth2, se tendria que implementar un flujo OAuth o endpoints compatibles con Alexa Account Linking.

### Cerrar sesion

```txt
No existe endpoint de logout actualmente.
```

El frontend solo elimina el token localmente.

## Token

El token se manda siempre en header:

```txt
Authorization: Bearer <accessToken>
```

No se usa cookie para la API actual.

## Productos / catalogo publico

Estos endpoints no requieren login.

### Listar productos

```txt
GET /api/products?limit=100&page=1
```

Respuesta:

```json
{
  "items": [
    {
      "_id": "id_producto",
      "name": "Rosas de Castilla",
      "slug": "rosas-de-castilla",
      "description": "Descripcion corta",
      "price": 60,
      "currency": "MXN",
      "image": "/products/rosas-castilla.jpg",
      "category": "linea-ansiedad-estres",
      "presentation": "10ml",
      "origin": "100% Natural",
      "inStock": true,
      "stockAvailable": 10,
      "allowBackorder": false,
      "rating": 4.5,
      "reviews": 2
    }
  ],
  "total": 16,
  "page": 1,
  "limit": 100,
  "totalPages": 1
}
```

### Obtener producto por slug o id

```txt
GET /api/products/:idOrSlug
```

Ejemplo:

```txt
GET /api/products/rosas-de-castilla
```

## Favoritos

Todos requieren token.

### Listar favoritos

```txt
GET /api/favorites
```

Headers:

```txt
Authorization: Bearer <accessToken>
```

Respuesta:

```json
[
  {
    "_id": "id_producto",
    "name": "Rosas de Castilla",
    "slug": "rosas-de-castilla",
    "price": 60,
    "currency": "MXN",
    "image": "/products/rosas-castilla.jpg",
    "category": "linea-ansiedad-estres",
    "presentation": "10ml",
    "origin": "100% Natural",
    "inStock": true,
    "rating": 4.5,
    "reviews": 2
  }
]
```

### Agregar favorito

```txt
PUT /api/favorites/:productId
```

Headers:

```txt
Authorization: Bearer <accessToken>
```

Body:

```txt
No requiere body.
```

Respuesta:

```json
{
  "productId": "id_producto"
}
```

### Eliminar favorito

```txt
DELETE /api/favorites/:productId
```

Headers:

```txt
Authorization: Bearer <accessToken>
```

Respuesta:

```json
{
  "productId": "id_producto"
}
```

## Bolsa / carrito

Importante:

```txt
Actualmente no existe un carrito persistido en backend tipo /api/cart/items.
```

La bolsa del frontend se guarda en `localStorage`. El backend solo recibe una lista de productos y cantidades para:

1. Validar inventario.
2. Calcular subtotal.
3. Generar firma de previsualizacion.
4. Confirmar pedido.

Para Alexa hay dos opciones:

1. La skill guarda la bolsa en su propia sesion/base de datos y llama a los endpoints de pedidos.
2. Se implementa un modulo nuevo en el backend: `/api/cart`, `/api/cart/items`, etc.

### Ver / validar bolsa

```txt
POST /api/orders/draft/preview
```

No requiere token.

Headers:

```txt
Content-Type: application/json
```

Body:

```json
{
  "items": [
    {
      "productId": "id_producto",
      "quantity": 1
    }
  ]
}
```

Respuesta:

```json
{
  "items": [
    {
      "productId": "id_producto",
      "productName": "Rosas de Castilla",
      "productSlug": "rosas-de-castilla",
      "image": "/products/rosas-castilla.jpg",
      "category": "linea-ansiedad-estres",
      "presentation": "10ml",
      "origin": "100% Natural",
      "unitPrice": 60,
      "currency": "MXN",
      "requestedQuantity": 1,
      "quantity": 1,
      "subtotal": 60,
      "fulfillment": "reserved",
      "stockAvailable": 10,
      "reservedQuantity": 1,
      "backorderQuantity": 0,
      "inventoryTracked": true,
      "allowBackorder": false
    }
  ],
  "issues": [],
  "subtotal": 60,
  "totalItems": 1,
  "currency": "MXN",
  "canCreateDraft": true,
  "canConfirmOrder": true,
  "needsManualReview": false,
  "signature": "preview_signature"
}
```

### Agregar producto a bolsa

```txt
No existe endpoint directo.
```

Forma actual:

La skill debe agregar el producto a su arreglo local y despues llamar:

```txt
POST /api/orders/draft/preview
```

Ejemplo de bolsa interna de la skill:

```json
{
  "items": [
    {
      "productId": "id_producto",
      "quantity": 1
    }
  ]
}
```

### Actualizar cantidad

```txt
No existe endpoint directo.
```

Forma actual:

La skill modifica `quantity` en su bolsa interna y vuelve a llamar:

```txt
POST /api/orders/draft/preview
```

### Eliminar producto

```txt
No existe endpoint directo.
```

Forma actual:

La skill elimina el item de su bolsa interna y vuelve a llamar:

```txt
POST /api/orders/draft/preview
```

### Confirmar pedido

```txt
POST /api/orders/confirm
```

Headers:

```txt
Content-Type: application/json
Authorization: Bearer <accessToken>
Idempotency-Key: <uuid_unico_por_intento>
```

El token es opcional en backend, pero recomendado para que el pedido quede vinculado al usuario.

Body:

```json
{
  "items": [
    {
      "productId": "id_producto",
      "quantity": 1
    }
  ],
  "customerName": "Nombre Usuario",
  "customerEmail": "usuario@correo.com",
  "customerPhone": "7713222972",
  "notes": "Pedido creado desde Alexa",
  "previewSignature": "signature_devuelta_por_preview"
}
```

Respuesta:

```json
{
  "orderId": "id_pedido",
  "reference": "PED-20260704-XXXXXX",
  "status": "pending_review",
  "items": [],
  "issues": [],
  "subtotal": 60,
  "totalItems": 1,
  "currency": "MXN",
  "canCreateDraft": true,
  "canConfirmOrder": true,
  "needsManualReview": false,
  "signature": "nueva_signature",
  "createdAt": "2026-07-04T00:00:00.000Z"
}
```

## Resumen rapido para flujo Alexa

1. Usuario explora productos:

```txt
GET /api/products
```

2. Si quiere favoritos:

```txt
Si no hay accessToken, pedir vincular/iniciar sesion.
```

3. Login:

```txt
POST /api/auth/login
```

4. Favoritos:

```txt
GET /api/favorites
PUT /api/favorites/:productId
DELETE /api/favorites/:productId
```

5. Bolsa:

```txt
La skill mantiene items en sesion y valida con POST /api/orders/draft/preview
```

6. Confirmar:

```txt
POST /api/orders/confirm
```

## Nota tecnica importante

Si tu compañera necesita endpoints exactamente como:

```txt
POST /api/cart/items
PATCH /api/cart/items/:productId
DELETE /api/cart/items/:productId
GET /api/cart
```

entonces hay que implementar un modulo de carrito persistente en el backend, porque actualmente esa parte solo existe del lado del frontend.
