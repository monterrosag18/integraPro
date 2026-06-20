# Diseño Técnico — B612

**Audiencia:** Equipo de desarrollo.
**Estado:** Borrador para revisión.
**Versión del documento:** (12-05-206) 1.0 (Doc inicial)

---

## 1. Stack

| Capa          | Tecnología               | Justificación                                                                                          |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Backend       | ASP.NET Core 8 (Web API) | Default del equipo, alineado con crecimiento profesional. Buen soporte para DDD y arquitectura limpia. |
| ORM           | EF Core 8                | Migraciones versionadas, integración nativa con Postgres, LINQ tipado.                                 |
| Validación    | FluentValidation         | Validación expresiva en límites de aplicación.                                                         |
| Frontend      | React 18 + Vite          | Decisión explícita del usuario. Vite por velocidad de build en dev.                                    |
| UI            | Tailwind CSS + shadcn/ui | Componentes accesibles, theming consistente con metáfora El Principito.                                |
| Base de datos | PostgreSQL               |
| Auth          | JWT (access + refresh)   | Estándar para SPA + API.                                                                               |
| Hosting       | VPS                      |
| CI/CD         | GitHub Actions           |

## 2. Persistencia

El modelo de datos (diagrama Entidad-Relación, entidades, relaciones e invariantes) vive en
[`data-model.md`](./data-model.md).
