# Proyecto INHALEX

Repositorio organizado por aplicaciones para separar con claridad el frontend, el backend y la documentacion operativa.

## Estructura

```text
Proyecto-INHALEX/
|- Client/                     # Frontend Next.js
|- Server/                     # Backend NestJS + MongoDB
|- ml/                         # Datasets, entrenamiento y artefactos ML
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
npm run ml:validate
npm run ml:smoke
```

## Inteligencia aplicada

Las propuestas 1 y 2 ya están conectadas al sistema:

- **Recomendación Apriori:** transforma pedidos en canastas `tid,items`,
  genera reglas de asociación y recomienda un aroma disponible dentro de la
  bolsa. El administrador puede auditar reglas, soporte, confianza y lift en
  `/admin/ventas`.
- **Demanda mensual:** entrena una regresión Ridge con una fila por
  producto-mes, estima las unidades del siguiente mes y combina el resultado
  con el inventario actual para sugerir reabastecimiento en `/admin/ventas`.

Los artefactos canónicos viven en `ml/artifacts/` y sus equivalentes
desplegables se generan en
`Server/src/modules/intelligence/artifacts/`. Los datos actuales son
sintéticos y están identificados como prototipo académico tanto en los JSON
como en la interfaz.

Para reconstruir y validar ambas propuestas:

```bash
npm run ml:rebuild:intelligence
npm run ml:smoke
```

## Notas de organizacion

- `Client/` contiene la interfaz, componentes, hooks y recursos publicos del frontend.
- `Server/` contiene la API, modulos de negocio, DTOs, esquemas y scripts del backend.
- `ml/` contiene las tuberias reproducibles, libretas vigentes y artefactos
  versionados de las propuestas de inteligencia.
- `docs/` concentra archivos de apoyo, reportes y documentacion que no deben quedar mezclados con el codigo fuente.
- Los archivos generados (`.next`, `node_modules`, `coverage`, `dist`) deben seguir fuera del control de versiones.
