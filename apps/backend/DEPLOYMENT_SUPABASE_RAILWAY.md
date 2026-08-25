# Mercadia: Railway + Supabase

La arquitectura objetivo usa tres servicios de Railway y ningun PostgreSQL en Railway:

- `mercadia-backend`: API Node/Express.
- `mercadia-front`: tienda publica.
- `mercadia-admin`: panel administrativo.
- Supabase: PostgreSQL y Auth.
- Cloudinary: imagenes subidas por el panel.

## 1. Mover la base de datos

1. Crea el proyecto de Supabase.
2. Exporta la base PostgreSQL actual de Railway con `pg_dump`.
3. Importa ese respaldo en Supabase con `pg_restore` o `psql`.
4. Ejecuta `sql/005_supabase_customer_auth.sql` si el arranque del backend aun no lo hizo.
5. Compara conteos de `stores`, `products`, `orders`, `customers` y `customer_accounts` antes de eliminar la base anterior.

El backend tambien aplica de forma idempotente las columnas nuevas de cuentas al iniciar. No elimina datos ni contrasenas antiguas.

## 2. Configurar Supabase Auth

En Supabase, abre Authentication:

1. Activa Email/Password y `Confirm Email`.
2. Define como Site URL la URL publica del servicio `mercadia-front`.
3. Agrega como Redirect URL `https://TU-TIENDA/mi-cuenta.html*` y los dominios personalizados que usen las tiendas.
4. Para produccion configura SMTP propio; el correo de prueba de Supabase tiene limites bajos.

## 3. Variables del backend en Railway

Usa `.env.example` como lista. Las indispensables son:

- `DATABASE_URL`: cadena del pooler de Supabase, no una variable de PostgreSQL de Railway.
- `SUPABASE_URL`.
- `SUPABASE_ANON_KEY` o `SUPABASE_PUBLISHABLE_KEY`.
- `JWT_SECRET`: sigue protegiendo el panel administrativo.
- `CORS_ORIGINS`: URLs publicas de tienda y panel, separadas por coma.
- Variables de Cloudinary.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` para notificaciones. Genera el par una sola vez con `npx web-push generate-vapid-keys` y conserva la llave privada solamente en Railway.

No hace falta `SUPABASE_SERVICE_ROLE_KEY`; el flujo implementado no expone ni necesita esa llave privilegiada.

## 4. Variables de tienda y panel

En los servicios `mercadia-front` y `mercadia-admin` agrega:

- `API_URL=https://URL-DEL-BACKEND/api`

Ambos servicios generan `/config.js` al arrancar, por lo que ya no hay que editar archivos al cambiar el dominio del backend.

## 5. Orden de despliegue

1. Importar y validar los datos en Supabase.
2. Desplegar backend y comprobar `/healthz`.
3. Desplegar tienda y panel con `API_URL`.
4. Probar registro, confirmacion, login, recuperacion y cambio de contrasena.
5. Probar guardar una plantilla e imagen en admin y verla en la tienda.
6. Instalar la tienda desde Chrome/Android o Safari/iPhone, activar notificaciones y cambiar el estado de un pedido desde admin.
7. Solo despues, retirar PostgreSQL de Railway y los despliegues anteriores de Vercel.

Las cuentas antiguas basadas solamente en telefono no tienen correo que pueda migrarse automaticamente a Supabase Auth. Deben asociarse a un correo mediante un flujo de migracion o volver a registrarse; sus clientes y pedidos permanecen en PostgreSQL.
