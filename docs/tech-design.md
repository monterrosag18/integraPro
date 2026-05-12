# Diseño Técnico — B612

**Audiencia:** Equipo de desarrollo.
**Estado:** Borrador para revisión.
**Versión del documento:** (12-05-206) 1.0 (Doc inicial)

---

## 1. Stack

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend | ASP.NET Core 8 (Web API) | Default del equipo, alineado con crecimiento profesional. Buen soporte para DDD y arquitectura limpia. |
| ORM | EF Core 8 | Migraciones versionadas, integración nativa con Postgres, LINQ tipado. |
| Mediador | MediatR | Desacopla controladores de handlers, facilita testing por caso de uso. |
| Validación | FluentValidation | Validación expresiva en límites de aplicación. |
| Frontend | React 18 + Vite | Decisión explícita del usuario. Vite por velocidad de build en dev. |
| Data fetching | TanStack Query | Cacheo, refetch automático, optimistic updates para el Kanban. |
| UI | Tailwind CSS + shadcn/ui | Componentes accesibles, theming consistente con metáfora El Principito. |
| Base de datos | PostgreSQL 16 (Amazon RDS) | Único motor. Relacional para dominio, JSONB para campos flexibles. |
| Auth | JWT (access + refresh) | Estándar para SPA + API. |
| Identidad | AWS Cognito **o** IdentityServer (a decidir) | Cognito ahorra trabajo; IdentityServer da más control. Decisión en sesión técnica antes de empezar. |
| Hosting | AWS (EC2, S3, RDS, Secrets Manager) | Decisión explícita del usuario. |
| CI/CD | GitHub Actions → ECR → ECS | Estándar, gratuito en repos públicos / costos bajos en privados. |
