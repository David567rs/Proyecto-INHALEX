# Proyecto INHALEX

Repositorio organizado por aplicaciones para separar con claridad el frontend, el backend y la documentacion operativa.

## Estructura

```text
Proyecto-INHALEX/
|- Client/                     # Frontend Next.js
|- Server/                     # Backend NestJS + MongoDB
|- docs/
|  |- reports/
|     |- security/
|        |- wapiti/            # Reportes de seguridad
|- package.json                # Scripts raiz para trabajar mas facil
|- .gitignore
```

## Como trabajar en el repo

### Frontend

```bash
npm run dev:client
```

### Backend

```bash
npm run dev:server
```

### Comandos utiles desde la raiz

```bash
npm run build:client
npm run build:server
npm run lint:client
npm run lint:server
npm run test:server
```

## Notas de organizacion

- `Client/` contiene la interfaz, componentes, hooks y recursos publicos del frontend.
- `Server/` contiene la API, modulos de negocio, DTOs, esquemas y scripts del backend.
- `docs/` concentra archivos de apoyo, reportes y documentacion que no deben quedar mezclados con el codigo fuente.
- Los archivos generados (`.next`, `node_modules`, `coverage`, `dist`) deben seguir fuera del control de versiones.
