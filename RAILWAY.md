# Railway: un repositorio, un servicio

Conecta este unico repositorio a un proyecto de Railway y crea un solo servicio.

## Servicio Mercadia

- Root Directory: `/`
- Railway Config File: `/railway.toml`
- Start Command: `npm start`
- Healthcheck: `/healthz`
- Tienda: `/`
- Panel administrativo: `/admin`
- API: `/api`
- Variables: usa `apps/backend/.env.example` como referencia.

El `Dockerfile` instala el backend y el mismo proceso sirve tambien el panel y la tienda.

## Orden recomendado

1. Publicar este monorepo en GitHub.
2. Crear un servicio de Railway.
3. Configurar las variables del backend.
4. Crear Supabase e importar PostgreSQL.
5. Probar el flujo completo.
6. Retirar los servicios viejos solamente despues de validar produccion.
