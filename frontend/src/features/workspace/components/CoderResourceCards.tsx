import { ArrowUpRight, BookOpenText, CalendarClock, Columns3, FolderGit2, MessageSquareText, Trophy, UserRound } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

type ProjectSummary = {
  sprint: number; stories: number; doneStories: number
  progress: number; ceremonies?: number; githubLinks?: number
}

type CoderMetrics = {
  roses: number; leaderRuns: number; assignedStories: number
  doneStories: number; donePoints: number; averageEvaluation: number
}

type Props = {
  sprintLabel?: string
  project?: ProjectSummary | null
  evalAvg?: number | null
  profileMetrics?: CoderMetrics | null
}

export function CoderResourceCards({ sprintLabel, project, evalAvg, profileMetrics }: Props) {
  const sprintMetric = project
    ? `${project.doneStories} de ${project.stories} historias`
    : '— historias'
  const sprintProgress = project ? Math.round(project.progress) : 0
  const projectMetric = project?.githubLinks
    ? `${project.githubLinks} repositorio(s) activo(s)`
    : '— repositorios'
  const ceremoniesMetric = project?.ceremonies != null
    ? `${project.ceremonies} ceremonias registradas`
    : '— ceremonias'
  const ceremoniesProgress = project?.ceremonies != null
    ? Math.min(100, Math.round((project.ceremonies / 4) * 100))
    : 0
  const evalProgress = evalAvg ?? 0
  const evalMetric = evalAvg != null
    ? `Promedio: ${(evalAvg / 20).toFixed(1)} / 5`
    : '— evaluaciones'
  const profileRoses = profileMetrics?.roses ?? null
  const profileProgress = profileRoses != null ? Math.min(100, Math.round((profileRoses / 10) * 100)) : 0
  const profileMetric = profileMetrics
    ? `${profileMetrics.doneStories} HU · ${profileMetrics.roses} pétalos`
    : '— perfil'

  const resources = [
    { slug: 'sprint', title: 'Sprint', description: 'Consulta historias, fechas y el ritmo actual de la célula.', metric: sprintMetric, progress: sprintProgress, icon: CalendarClock, art: '/images/coder-sprint-v1.png', color: '#9d72ff' },
    { slug: 'proyectos', title: 'Proyectos', description: 'Código, repositorios y entregables reunidos en una sola órbita.', metric: projectMetric, progress: sprintProgress, icon: FolderGit2, art: '/images/coder-projects-v1.png', color: '#55d7c3' },
    { slug: 'tablero', title: 'Tablero', description: 'Mueve tareas y sigue el flujo de trabajo de tu célula.', metric: `${project ? project.stories - project.doneStories : '—'} tareas en curso`, progress: sprintProgress, icon: Columns3, art: '/images/coder-board-v1.png', color: '#7e8fff' },
    { slug: 'ceremonias', title: 'Ceremonias', description: 'Participa en planning, checkpoints, review y retrospectiva.', metric: ceremoniesMetric, progress: ceremoniesProgress, icon: MessageSquareText, art: '/images/coder-sprint-v1.png', color: '#f18a79' },
    { slug: 'documentacion', title: 'Documentación', description: 'Lee el README, acuerdos y decisiones técnicas del proyecto.', metric: 'README y acuerdos del clan', progress: sprintProgress, icon: BookOpenText, art: '/images/coder-docs-v1.png', color: '#4ed9c3' },
    { slug: 'evaluaciones', title: 'Evaluaciones', description: 'Completa retos y convierte tu aprendizaje en evidencia.', metric: evalMetric, progress: evalProgress, icon: Trophy, art: '/images/coder-evaluations-v1.png', color: '#ff9c62' },
    { slug: 'perfil', title: 'Mi perfil', description: 'Revisa tu progreso, logros y recorrido dentro del clan.', metric: profileMetric, progress: profileProgress, icon: UserRound, art: '/images/coder-profile-v1.png', color: '#65b9ff' },
  ]

  return <section className="coder-resources" aria-labelledby="coder-resources-title">
    <div className="coder-section-heading">
      <div>
        <p className="eyebrow">Centro de navegación</p>
        <h2 id="coder-resources-title">Tus espacios de trabajo</h2>
        <p>Todo lo que necesitas para avanzar con tu célula.</p>
      </div>
      <span><i /> {sprintLabel ?? 'Sprint activo'}</span>
    </div>
    <div className="coder-resource-grid">{resources.map(({ icon: Icon, ...resource }) => <Link className="coder-resource-card" to={`/app/coder/${resource.slug}`} key={resource.slug} style={{ '--resource-color': resource.color, '--resource-art': `url(${resource.art})` } as CSSProperties}>
      <div className="coder-resource-card__glow" />
      <div className="coder-resource-card__content">
        <div className="coder-resource-card__icon"><Icon /></div>
        <h3>{resource.title}</h3>
        <p>{resource.description}</p>
        <span className="coder-resource-card__action">Ingresar <ArrowUpRight size={15} /></span>
      </div>
      <div className="coder-resource-card__footer"><div><span>{resource.metric}</span><strong>{resource.progress}%</strong></div><i><b style={{ width: `${resource.progress}%` }} /></i></div>
    </Link>)}</div>
  </section>
}
