# Mercadia

Monorepo de la plataforma Mercadia. Un solo repositorio alimenta tres servicios de Railway y usa Supabase para PostgreSQL y autenticacion.

## Aplicaciones

| Carpeta | Servicio | Funcion |
| --- | --- | --- |
| `apps/backend` | `mercadia-backend` | API, pedidos, panel, Supabase Auth y notificaciones push |
| `apps/admin` | `mercadia-admin` | Panel para administrar tiendas, productos, pedidos y pagina publica |
| `apps/storefront` | `mercadia-storefront` | Tienda publica instalable como aplicacion movil |

## Verificacion local

```bash
npm run verify
npm --prefix apps/backend install
npm run start:backend
```

El panel y la tienda pueden arrancarse en terminales separadas:

```bash
npm run start:admin
npm run start:storefront
```

## Despliegue

Consulta [RAILWAY.md](./RAILWAY.md). La configuracion detallada de Supabase y la migracion de datos esta en [apps/backend/DEPLOYMENT_SUPABASE_RAILWAY.md](./apps/backend/DEPLOYMENT_SUPABASE_RAILWAY.md).

Los tres repositorios anteriores se conservaron fuera de este monorepo como respaldo. No se copiaron sus carpetas `.git`, archivos `.env` ni `node_modules`.
