# Railway: un repositorio, tres servicios

Conecta este unico repositorio a un proyecto de Railway y crea tres servicios.

## Servicio 1: backend

- Root Directory: `/apps/backend`
- Start Command: `npm start`
- Healthcheck: `/healthz`
- Variables: se configuraran despues usando `apps/backend/.env.example`.

## Servicio 2: admin

- Root Directory: `/apps/admin`
- Start Command: `npm start`
- Healthcheck: `/healthz`
- Variable posterior: `API_URL=https://DOMINIO-BACKEND/api`

## Servicio 3: storefront

- Root Directory: `/apps/storefront`
- Start Command: `npm start`
- Healthcheck: `/healthz`
- Variable posterior: `API_URL=https://DOMINIO-BACKEND/api`

Cada carpeta contiene su propio `railway.toml`. Railway debe desplegar las tres desde el mismo commit.

## Orden recomendado

1. Publicar este monorepo en GitHub.
2. Crear el proyecto y los tres servicios de Railway sin borrar los despliegues actuales.
3. Configurar variables del backend, admin y storefront.
4. Crear Supabase e importar PostgreSQL.
5. Probar el flujo completo.
6. Retirar los servicios viejos solamente despues de validar produccion.
