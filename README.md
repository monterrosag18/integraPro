# B612 · Scrum Universe

Plataforma Scrum y de gamificación para células de desarrollo trainee. Integra organización académica, rotaciones, proyectos, Kanban, ceremonias, documentación, evaluaciones, rankings y perfiles de empleabilidad.

## Tecnologías

- Frontend: React 18, TypeScript y Vite.
- Backend: ASP.NET Core 8, Entity Framework Core y Swagger.
- Base de datos: PostgreSQL 16 mediante Docker Compose.
- Pruebas: xUnit.

## Requisitos

Instala antes de comenzar:

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) en Windows, o Docker Engine + Compose en Linux.
- [.NET SDK 8](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 22 LTS](https://nodejs.org/) y npm.

Comprueba las instalaciones:

```bash
git --version
docker --version
docker compose version
dotnet --version
node --version
npm --version
```

## Instalación en Windows

Abre PowerShell:

```powershell
git clone https://github.com/monterrosag18/integraPro.git
Set-Location integraPro
Copy-Item .env.example .env
docker compose up -d postgres
dotnet tool restore
dotnet restore backend/B612.sln
```

En una primera terminal ejecuta la API:

```powershell
dotnet run --project backend/src/B612.Api
```

En una segunda terminal ejecuta el frontend:

```powershell
Set-Location frontend
npm install
npm run dev
```

## Instalación en Linux

```bash
git clone https://github.com/monterrosag18/integraPro.git
cd integraPro
cp .env.example .env
docker compose up -d postgres
dotnet tool restore
dotnet restore backend/B612.sln
```

En una primera terminal ejecuta la API:

```bash
dotnet run --project backend/src/B612.Api
```

En una segunda terminal ejecuta el frontend:

```bash
cd frontend
npm install
npm run dev
```

## Direcciones locales

| Servicio | Dirección |
|---|---|
| Landing | http://localhost:5173 |
| Selección de roles | http://localhost:5173/login |
| API | http://localhost:5080 |
| Swagger | http://localhost:5080/swagger |
| Health check | http://localhost:5080/api/health |
| PostgreSQL | localhost:5432 |

## Credenciales locales de PostgreSQL

Los valores de desarrollo están en `.env.example`:

```env
POSTGRES_DB=b612
POSTGRES_USER=b612
POSTGRES_PASSWORD=b612_dev
POSTGRES_PORT=5432
```

Puedes modificarlos en `.env`. No publiques ese archivo.

## Migraciones

El backend inicializa el esquema al arrancar. Para aplicar migraciones manualmente:

```bash
dotnet tool restore
dotnet tool run dotnet-ef database update --project backend/src/B612.Infrastructure --startup-project backend/src/B612.Api
```

## Comandos útiles

Compilar y comprobar el frontend:

```bash
cd frontend
npm run build
npm run lint
```

Compilar y probar el backend:

```bash
dotnet build backend/B612.sln
dotnet test backend/B612.sln
```

Consultar PostgreSQL:

```bash
docker compose ps
docker compose logs -f postgres
```

Detener los servicios:

```bash
docker compose down
```

Eliminar también los datos locales y comenzar desde cero:

```bash
docker compose down -v
```

> `down -v` elimina permanentemente el volumen local de PostgreSQL.

## Estructura

```text
integraPro/
├── frontend/                  React, rutas, vistas y componentes
├── backend/
│   ├── src/B612.Api/          API HTTP y Swagger
│   ├── src/B612.Application/  Casos de uso y contratos
│   ├── src/B612.Domain/       Entidades y reglas de negocio
│   ├── src/B612.Infrastructure/EF Core y PostgreSQL
│   └── tests/                 Pruebas automatizadas
├── docs/                      PRD y modelo entidad–relación
├── mockups/                   Referencias visuales
├── .env.example               Configuración local de ejemplo
└── docker-compose.yml         PostgreSQL local
```

## Estado del prototipo

- Vistas navegables para Admin, TL, Líder y Coder.
- Rotación de coders y cambio excepcional de líder.
- Kanban arrastrable para líder y coder.
- Documentación Markdown y experiencia de lectura tipo Docusaurus.
- Evaluaciones semanales de 1 a 5 estrellas.
- Perfil editable, logros, Rosas y rankings.
- Datos demostrativos en frontend: algunas interacciones aún se reinician al recargar.

La definición funcional y el modelo de datos se encuentran en [`docs/`](docs/).

## Solución de problemas

- Si Docker no responde en Windows, abre Docker Desktop y espera a que el motor indique que está activo.
- Si el puerto `5432` está ocupado, cambia `POSTGRES_PORT` en `.env` y actualiza la cadena de conexión del backend.
- Si Vite rechaza la versión de Node, instala Node.js 22 LTS.
- Si la API no conecta con PostgreSQL, comprueba `docker compose ps` y espera a que el contenedor aparezca como `healthy`.
