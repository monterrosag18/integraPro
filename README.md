# B612

Plataforma Scrum + Gamificación para células de desarrollo trainee de Riwi.

> **Working title:** B612 (asteroide de *El Principito*).
> Cambiar antes de empezar a implementar si Riwi decide otro nombre.

## Estado actual

Estrategia y documentación de diseño. **No hay código aún.**

## Contexto en una frase

Hoy las células trainee usan Jira + Docusaurus + GitHub por separado. B612 centraliza el flujo Scrum, automatiza la rotación de 24 desarrolladores entre 8 células cada sprint, evalúa desempeño en 3 dimensiones (técnica, humana, inglés) y gamifica con **La Rosa** como insignia al equipo ganador.

## Documentos

| Documento | Audiencia | Contenido |
|---|---|---|
| [docs/01-prd.md](docs/prd.md) | Dirección Riwi, producto | Problema, visión, MVP, métricas, roadmap, riesgos. |
| [docs/02-tech-design.md](docs/tech-design.md) | Equipo de desarrollo | Stack, bounded contexts, modelo de dominio, algoritmo de rotación, despliegue en VPS. |
| [docs/data-model.md](docs/data-model.md) | Equipo de desarrollo | Diagrama Entidad-Relación: entidades, relaciones e invariantes de la base de datos. |

## Decisiones validadas

- **MVP scope:** Núcleo Scrum + evaluación. wiki integrada. GitHub solo como link manual.
- **Stack:** ASP.NET Core 8 + React 18 + PostgreSQL + VPS (CI/CD con GitHub Actions).
- **Evaluación:** Bidireccional líder ↔ rotadores + autoevaluación. La profesora de inglés evalúa fuera del sistema.
- **Rotación:** 8 líderes fijos + 24 rotadores. Sistema sugiere, profesor confirma.
- **La Rosa:** Profesor decide tras Sprint Review.

## Próximos pasos

1. Validar el documento funcional con un TL real de Riwi.
2. Decidir nombre definitivo del producto.
4. Prototipar el algoritmo de rotación en aislado durante semana 1 (riesgo #1).
5. Romper el MVP en historias de usuario con estimación.
