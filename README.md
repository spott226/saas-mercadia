# Mercadia

Aplicacion unificada de Mercadia. Un solo repositorio alimenta un solo servicio de Railway y usa Supabase para PostgreSQL y autenticacion.

## Aplicaciones

| Carpeta | Ruta publica | Funcion |
| --- | --- | --- |
| `apps/backend` | `/api` | API, pedidos, Supabase Auth y notificaciones push |
| `apps/admin` | `/admin` | Panel para administrar tiendas, productos, pedidos y pagina publica |
| `apps/storefront` | `/` y `/tienda/:slug` | Inicio de Mercadia y tiendas publicas instalables |

## Flujo SaaS

- `/`: inicio, registro, acceso y reporte de transferencia.
- `/platform.html`: panel maestro para revisar pagos y activar, suspender o reactivar cuentas.
- `/admin`: panel privado del dueño de cada tienda.
- `/tienda/:slug`: página pública aislada de cada negocio.

Las cuentas nuevas usan Supabase Auth y deben confirmar su correo. Después reportan la transferencia de activación. Cuando se aprueba el pago, Mercadia crea la tienda y habilita el panel. Los pedidos reservan existencias desde que quedan pendientes y descuentan stock al entrar al flujo de venta.

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
