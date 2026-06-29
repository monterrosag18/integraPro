# B612 · Scrum Universe

Plataforma web para acompañar el trabajo Scrum de clanes, células y coders. El proyecto mezcla gestión académica, rotación de células, proyectos, tablero tipo Trello, documentación tipo Docusaurus, evaluaciones, gamificación con Rosas y un dashboard de empleabilidad llamado **Talent Passport**.

La estética está inspirada en el universo B612/Riwi: fondo espacial, paleta mural, zorro/rosa/cohete y una experiencia visual premium para exposición.

## Estado actual

El prototipo ya incluye:

- Landing page visual con estilo espacial.
- Login real contra PostgreSQL.
- Redirección por rol: Admin, TL y Coder.
- Vista especial de Líder de célula para coders asignados como `leader`.
- Dashboard Admin.
- Talent Passport completo en Admin.
- Dashboard TL sin Talent Passport.
- Dashboard Coder.
- Dashboard Líder.
- Tablero Kanban interactivo.
- Módulos de sprint, proyectos, ceremonias, documentación, evaluaciones y perfil.
- Backend ASP.NET Core con endpoints reales para datos principales.
- PostgreSQL local con Docker Compose.
- Soporte para PostgreSQL remoto mediante variables de entorno.

## Roles y vistas

| Rol | Ruta principal | Qué ve |
|---|---|---|
| Admin | `/app/admin/talent-passport` | Talent Passport, analítica de empleabilidad, campus, cohortes, clanes, usuarios y criterios. |
| TL | `/app/tl` | Sprints, rotación, células, evaluaciones, La Rosa y documentación del clan. |
| Coder | `/app/coder` | Resumen, sprint, proyectos, tablero, ceremonias, documentación, evaluaciones y perfil. |
| Líder | `/app/leader` | Vista de liderazgo de célula, proyecto, backlog, tablero, ceremonias y evaluaciones. |

> En la base de datos, “líder” no es un rol separado. Es un `coder` con `role_in_cell = leader`.

## Cuentas demo

Estas cuentas fueron creadas para probar las vistas actuales:

| Vista | Correo | Contraseña |
|---|---|---|
| Admin | `admin.demo@b612.dev` | `B612Demo2026!` |
| TL | `tl.demo@b612.dev` | `B612Demo2026!` |
| Coder | `coder.demo@b612.dev` | `B612Demo2026!` |
| Líder | `lider.demo@b612.dev` | `B612Demo2026!` |

## Tecnologías

### Frontend

- React
- TypeScript
- Vite
- CSS custom premium
- Lucide React para iconografía

### Backend

- ASP.NET Core 8
- C#
- Npgsql
- Entity Framework Core
- Swagger
- BackgroundService para cierre automático de sprints

### Base de datos

- PostgreSQL 16
- Docker Compose para desarrollo local

## Estructura del proyecto

```text
integraPro/
├── backend/
│   ├── src/B612.Api/                 API HTTP, controllers, Swagger, background services
│   ├── src/B612.Application/         Abstracciones y contratos
│   ├── src/B612.Domain/              Modelos de dominio
│   ├── src/B612.Infrastructure/      EF Core, PostgreSQL y persistencia
│   └── tests/                        Pruebas
├── frontend/
│   ├── public/images/mural/          Imágenes visuales usadas en dashboards
│   └── src/
│       ├── app/router/               Rutas protegidas por rol
│       ├── features/                 Componentes por módulo
│       ├── pages/                    Landing, login y dashboards
│       └── shared/                   API client, auth, layout y estilos
├── docs/                             Modelo de datos y documentación funcional
├── mockups/                          Referencias visuales
├── docker-compose.yml                PostgreSQL local
├── .env.example                      Variables locales de ejemplo
└── README.md
```

## Requisitos

Instala:

- Git
- Docker Desktop en Windows o Docker Engine en Linux
- .NET SDK 8
- Node.js 22 LTS o superior
- npm

Verifica:

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
cd integraPro
Copy-Item .env.example .env
docker compose up -d postgres
dotnet restore backend/B612.sln
cd frontend
npm install
```

Levantar backend:

```powershell
cd ..
dotnet run --project backend/src/B612.Api --urls http://localhost:5080
```

Levantar frontend en otra terminal:

```powershell
cd frontend
npm run dev
```

Abre:

```text
http://127.0.0.1:5173
```

## Instalación en Linux

```bash
git clone https://github.com/monterrosag18/integraPro.git
cd integraPro
cp .env.example .env
docker compose up -d postgres
dotnet restore backend/B612.sln
cd frontend
npm install
```

Levantar backend:

```bash
cd ..
dotnet run --project backend/src/B612.Api --urls http://localhost:5080
```

Levantar frontend en otra terminal:

```bash
cd frontend
npm run dev
```

Abre:

```text
http://127.0.0.1:5173
```

## Variables de entorno

`.env.example` configura PostgreSQL local para Docker:

```env
POSTGRES_DB=b612
POSTGRES_USER=b612
POSTGRES_PASSWORD=b612_dev
POSTGRES_PORT=5432
```

El backend lee la cadena de conexión `ConnectionStrings__Database`.

Para usar PostgreSQL local:

```powershell
$env:ConnectionStrings__Database="Host=localhost;Port=5432;Database=b612;Username=b612;Password=b612_dev"
$env:Database__AutoMigrate="true"
dotnet run --project backend/src/B612.Api --urls http://localhost:5080
```

En Linux/macOS:

```bash
export ConnectionStrings__Database="Host=localhost;Port=5432;Database=b612;Username=b612;Password=b612_dev"
export Database__AutoMigrate="true"
dotnet run --project backend/src/B612.Api --urls http://localhost:5080
```

Para conectarse a una base remota, usa la misma variable con los datos del servidor. No subas credenciales reales al repositorio.

## Direcciones locales

| Servicio | URL |
|---|---|
| Frontend | `http://127.0.0.1:5173` |
| Login | `http://127.0.0.1:5173/login` |
| API | `http://localhost:5080` |
| Swagger | `http://localhost:5080/swagger` |
| Health check | `http://localhost:5080/api/health` |
| PostgreSQL local | `localhost:5432` |

## Endpoints principales

| Módulo | Endpoint |
|---|---|
| Login | `POST /api/auth/login` |
| Dashboard general | `GET /api/dashboard/summary` |
| Admin overview | `GET /api/dashboard/admin-overview` |
| Talent Passport | `GET /api/dashboard/talent-passport` |
| Sprints | `GET /api/sprints` |
| Crear sprint | `POST /api/sprints` |
| Editar/cerrar sprint | `PATCH /api/sprints/{id}` |
| Extender sprint cerrado | `PATCH /api/sprints/{id}/extend` |
| Proyectos | `GET /api/projects` |
| Detalle proyecto | `GET /api/projects/{projectId}` |
| Ceremonias | `GET /api/projects/{projectId}/ceremonies` |
| GitHub links | `GET /api/projects/{projectId}/github-links` |
| Evaluaciones | `GET /api/evaluations/criteria` |
| Rosas/ranking | `GET /api/roses/leaderboard` |
| Perfil coder | `GET /api/coders/{coderId}/profile` |
| Notificaciones | `GET /api/notifications?userId={id}` |
| Rotación | `GET /api/rotation/health` |

## Sprints y cierre automático

La Épica 3 quedó integrada con estas reglas:

- Un clan no debe tener más de un sprint activo.
- No se permiten fechas solapadas entre sprints del mismo clan.
- La duración válida de un sprint es de 1 a 4 semanas.
- Un sprint cerrado no se puede reabrir desde el update normal.
- Si un TL necesita extender un sprint cerrado por una excepción, puede hacerlo con máximo 7 días.
- Un `BackgroundService` revisa sprints vencidos al arrancar y cada medianoche.
- Si el sistema cierra el sprint, guarda `closed_by = system`.
- Si lo cierra el TL, guarda el valor enviado en `closed_by`.

## Talent Passport

Talent Passport pertenece al Admin. Incluye:

- Vista General
- Comparador de coders
- Perfil individual de coder
- Vista por célula
- Heatmap de dimensiones
- Ranking de empleabilidad
- Ranking de células
- Distribución por score
- Gap analysis
- Insights preparados para IA

La data se consume desde:

```text
GET /api/dashboard/talent-passport
```

## Comandos útiles

Compilar frontend:

```bash
npm run build --prefix frontend
```

Compilar backend:

```bash
dotnet build backend/B612.sln
```

Ejecutar tests:

```bash
dotnet test backend/B612.sln
```

Ver contenedor PostgreSQL:

```bash
docker compose ps
docker compose logs -f postgres
```

Detener servicios:

```bash
docker compose down
```

Eliminar datos locales:

```bash
docker compose down -v
```

## Notas actuales

- Algunas vistas siguen siendo prototipo funcional visual, pero ya tienen rutas y botones activos.
- Talent Passport ya está ubicado en Admin, no en TL.
- La base remota puede usarse para datos reales mediante `ConnectionStrings__Database`.
- El frontend usa proxy de Vite para `/api` hacia `http://127.0.0.1:5080`.
- No subir `.env`, logs ni credenciales reales.

## Próximos pasos sugeridos

- Conectar la vista TL de Sprints al CRUD real.
- Persistir los movimientos del Kanban.
- Conectar documentación tipo Docusaurus a documentos reales.
- Completar creación/edición visual de proyectos y ceremonias.
- Agregar tests específicos para endpoints nuevos.
- Preparar despliegue del frontend y API.
