# Mercadia

Aplicacion unificada de Mercadia. Un solo repositorio alimenta un solo servicio de Railway y usa Supabase para PostgreSQL y autenticacion.

## Aplicaciones

| Carpeta | Ruta publica | Funcion |
| --- | --- | --- |
| `apps/backend` | `/api` | API, pedidos, Supabase Auth y notificaciones push |
| `apps/admin` | `/admin` | Panel para administrar tiendas, productos, pedidos y pagina publica |
| `apps/storefront` | `/` | Tienda publica instalable como aplicacion movil |

## Verificacion local

```bash
npm run verify
npm --prefix apps/backend install
npm start
```

El mismo proceso sirve la tienda, el panel y la API.

## Despliegue

Consulta [RAILWAY.md](./RAILWAY.md). La configuracion detallada de Supabase y la migracion de datos esta en [apps/backend/DEPLOYMENT_SUPABASE_RAILWAY.md](./apps/backend/DEPLOYMENT_SUPABASE_RAILWAY.md).

Los repositorios anteriores se conservaron fuera de esta aplicacion como respaldo. No se copiaron sus carpetas `.git`, archivos `.env` ni `node_modules`.
