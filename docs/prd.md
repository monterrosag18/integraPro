# PRD — B612

**Producto:** B612 — Plataforma Scrum + Gamificación para células de desarrollo trainee de Riwi.
**Versión del documento:** (12-05-206) 1.0 (Doc inicial)
**Estado:** Borrador para aprobación
**Audiencia:** Dirección Riwi, líderes técnicos, equipo de producto.

---

## 1. Problema

Las células trainee de Riwi operan hoy con tres herramientas externas desacopladas:

- **Jira** para Kanban y sprints.
- **Docusaurus** para documentación.
- **GitHub** para organizaciones y código.

Consecuencias medibles:

1. **Fragmentación cognitiva.** El trainee abre 3 apps para una sola unidad de trabajo. Esto erosiona el hábito Scrum que se quiere instalar.
2. **Sin observabilidad pedagógica.** TLs no tienen una vista unificada de desempeño cruzado (técnico + humano + inglés).
3. **Rotación inviable a mano.** Cada sprint Riwi rota 24 desarrolladores entre 8 células manteniendo 8 líderes fijos. Hacerlo manualmente es tedioso y propenso a errores.
4. **Sin trazabilidad de progreso individual.** No hay un perfil persistente que muestre con quién trabajó cada trainee, qué entregó y cómo fue evaluado.

## 2. Visión

B612 es el **hub único** donde un trainee de Riwi vive su ciclo Scrum completo:

- Ve su célula, su líder, sus compañeros del sprint.
- Trabaja sobre un tablero Kanban interno.
- Participa de planning, review y retrospectiva dentro de la plataforma.
- Es evaluado y evalúa (líder, autoevaluación).
- Acumula **Rosas** (insignias) que conforman su perfil público.

El nombre y la metáfora visual provienen de *El Principito*: cada célula es un asteroide, cada sprint es un viaje, La Rosa es el reconocimiento al equipo destacado.

## 3. Usuarios y roles

| Rol | Descripción | Permisos clave |
|---|---|---|
| **Admin** | Equipo Riwi que administra academias y cohortes. | Crear academia, crear cohorte, definir líderes fijos, asignar TL. |
| **TL** | Quien acompaña pedagógicamente a un clan. | Configurar sprint, confirmar/editar rotación, otorgar La Rosa, ver dashboards agregados. |
| **Líder** | Estudiante con rol fijo de líder de célula durante toda la ruta. | Gestionar Kanban de su célula, registrar ceremonias, evaluar a sus 3 rotadores. |
| **Estudiante (rotador)** | Trainee que rota entre células cada sprint. | Mover tareas, participar en ceremonias, evaluar al líder, autoevaluarse. |

## 4. Métricas de éxito (v1)

| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Adopción de ceremonias | 100% de sprints con planning + review + retro registrados | Conteo de ceremonias cerradas / sprints activos |
| Adopción de rotación automática | 100% de rotaciones generadas por el sistema y aceptadas (con o sin edición) | Conteo de rotaciones confirmadas / sprints iniciados |
| Completitud de evaluaciones | ≥ 90% de evaluaciones bidireccionales + autoevaluaciones completadas al cierre | Conteo de evaluaciones enviadas / esperadas |
| Tiempo de cierre de sprint | ≤ 2 días hábiles desde fin de sprint hasta cierre de retro | Diferencia de timestamps `sprint_end` → `retro_closed` |
| Satisfacción de profesores | ≥ 4/5 en encuesta post-sprint | Encuesta interna trimestral |

## 5. MVP — scope explícito

### Dentro (v1)

- Gestión cohortes, clanes, células y líderes fijos.
- Creación de sprints con duración configurable (default 2 semanas).
- **Rotación sugerida por el sistema** y editable por el profesor.
- **Tablero Kanban propio** por célula y por sprint (estados: To Do, In Progress, Review, Done).
- **Ceremonias Scrum** registradas en la plataforma:
  - Planning (definir sprint backlog).
  - Review (presentación del entregable).
  - Retrospectiva (evaluaciones).
- **Evaluación bidireccional líder ↔ rotadores + autoevaluación.** Resultados anónimos para el evaluado, agregados para el profesor.
- **La Rosa:** insignia otorgada por el profesor al equipo ganador del sprint.
- **Perfil público** de estudiante con: historial de células, líderes con los que trabajó, Rosas ganadas, métricas agregadas.
- **Vinculación manual a GitHub:** el profesor pega la URL de la org/repo ya creada.
- Plataforma en inglés (UI + plantillas de tickets + plantillas de ceremonias).

### Fuera (v2+)

- Creación automática de organizaciones GitHub vía GitHub App.
- Wiki integrada (reemplazo de Docusaurus).
- Canje de Rosas por premios físicos / digitales.
- Integración Discord.
- Analítica avanzada (tendencias, predicción de deserción).
- Realtime en el Kanban (WebSockets / SignalR).

## 6. Roadmap

| Versión | Duración estimada | Foco |
|---|---|---|
| **v1 — MVP** | ~4 semanas | Núcleo Scrum + analítica avanzada + evaluación + rotación + La Rosa. GitHub manual. |
| **v2** | ~2 semanas | GitHub App con creación automática de orgs. Wiki Markdown integrada. Canje de Rosas. Realtime Kanban.|

## 7. Suposiciones y restricciones

- Cada cohorte tiene exactamente 32 estudiantes (8 líderes + 24 rotadores). Si en el futuro varía, el algoritmo de rotación debe parametrizarse.
- Sprints de 2 semanas por defecto. Configurable por cohorte.
- La plataforma vive en AWS (RDS Postgres, EC2, S3).
- El equipo que construye B612 son trainees + 1 líder .

## 8. Riesgos de producto

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El algoritmo de rotación produce asignaciones imposibles después del sprint 8 | Alto — bloquea operación | Relajación progresiva de restricciones + override manual del profesor |
| Carga del Kanban con muchas células abiertas degrada UX | Bajo | Paginación + pull cada 30s vía TanStack Query |

## 9. Criterios de aceptación del MVP

El MVP se considera entregable cuando:

1. Un admin puede crear cohorte, cargar 32 estudiantes y asignar 8 líderes en < 10 minutos.
2. El sistema genera rotación válida para sprints 1 a 8 sin intervención manual.
3. Una célula puede completar el ciclo: planning → tablero activo → review → retro → Rosa otorgada → perfiles actualizados.
4. Profesor puede ver dashboard agregado de su cohorte en una sola pantalla.
5. Plataforma desplegada en AWS con HTTPS, autenticación funcional y backup automático de DB.
