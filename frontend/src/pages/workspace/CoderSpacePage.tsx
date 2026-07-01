import { ArrowLeft, BookOpenText, CalendarClock, Columns3, FolderGit2, MessageSquareText, Sparkles, Trophy, UserRound } from 'lucide-react'
import type { CSSProperties, ElementType } from 'react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CoderSpaceModule } from '../../features/workspace/components/CoderSpaceModules'
import { apiRequest } from '../../shared/api/httpClient'
import { getCurrentUser } from '../../shared/auth/session'
import { RoleShell } from '../../shared/components/layout/RoleShell'

type ProjectMeta = {
  id: string; name: string; sprint: number; sprintStatus: string; boardId?: string | null; clanId?: string
  cell: string; stories: number; doneStories: number; progress: number
  githubLinks: number; ceremonies: number
}
type ProjectDetails = { stories: Array<{ status?: string; kanbanStatus?: string }> }
type CoderProfile = { metrics: { roses: number; leaderRuns: number; assignedStories: number; doneStories: number; averageEvaluation: number } }
type EvalSummary = { criteria: Array<{ average: number }> }
type CeremoniesData = { ceremonies: Array<{ status: string; date: string }> }
type ApiEvaluationCriterion = { id: number; name: string; scope: string; active: boolean }

type SpaceBase = { icon: ElementType; art: string; color: string }

const BASE: Record<string, SpaceBase> = {
  sprint:        { icon: CalendarClock,    art: '/images/coder-sprint-v1.png',       color: '#9d72ff' },
  proyectos:     { icon: FolderGit2,       art: '/images/coder-projects-v1.png',     color: '#55d7c3' },
  tablero:       { icon: Columns3,         art: '/images/coder-board-v1.png',        color: '#7e8fff' },
  ceremonias:    { icon: MessageSquareText, art: '/images/coder-sprint-v1.png',      color: '#f18a79' },
  documentacion: { icon: BookOpenText,     art: '/images/coder-docs-v1.png',         color: '#4ed9c3' },
  evaluaciones:  { icon: Trophy,           art: '/images/coder-evaluations-v1.png',  color: '#ff9c62' },
  perfil:        { icon: UserRound,        art: '/images/coder-profile-v1.png',      color: '#65b9ff' },
}

function daysUntil(endDate?: string): string {
  if (!endDate) return '—'
  try {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)
    if (diff < 0) return 'Cerrado'
    if (diff === 0) return 'Hoy'
    return `${diff} día${diff !== 1 ? 's' : ''}`
  } catch { return '—' }
}

function nextCeremonyDate(ceremonies: CeremoniesData['ceremonies']): string {
  const upcoming = ceremonies
    .filter(c => new Date(c.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
  if (!upcoming) return 'Sin próxima'
  try { return new Date(upcoming.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) }
  catch { return '—' }
}

export function CoderSpacePage() {
  const { space: slug } = useParams()
  const user = getCurrentUser()
  const base = slug ? BASE[slug] : null

  const [project, setProject] = useState<ProjectMeta | null>(null)
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null)
  const [profile, setProfile] = useState<CoderProfile | null>(null)
  const [evalSummary, setEvalSummary] = useState<EvalSummary | null>(null)
  const [ceremonies, setCeremonies] = useState<CeremoniesData | null>(null)
  const [sprintEndDate, setSprintEndDate] = useState<string>()

  useEffect(() => {
    if (!user?.id || !slug) return
    apiRequest<{ projects: ProjectMeta[] }>(`/projects?coderId=${user.id}`)
      .then(({ projects }) => {
        const active = projects.find(p => p.sprintStatus === 'active') ?? projects[0]
        if (!active) return
        setProject(active)
        if ((slug === 'sprints' || slug === 'tablero') && active.boardId) {
          apiRequest<Array<{ status?: string; kanbanStatus?: string }>>(`/boards/${active.boardId}/stories`)
            .then(stories => setProjectDetails({ stories }))
            .catch(() => undefined)
        }
        if (slug === 'ceremonias') {
          apiRequest<CeremoniesData>(`/projects/${active.id}/ceremonies`)
            .then(d => setCeremonies(d))
            .catch(() => undefined)
        }
        if (active.clanId) {
          apiRequest<Array<{ endDate: string }>>(`/sprints?clanId=${active.clanId}`)
            .then(sprints => { if (sprints[0]) setSprintEndDate(sprints[0].endDate) })
            .catch(() => undefined)
        }
      })
      .catch(() => undefined)

    if (slug === 'perfil' || slug === 'evaluaciones') {
      apiRequest<CoderProfile>(`/coders/${user.id}/profile`)
        .then(d => setProfile(d))
        .catch(() => undefined)
      apiRequest<ApiEvaluationCriterion[]>('/evaluation-criteria?scope=person')
        .then(criteria => setEvalSummary({ criteria: criteria.filter(c => c.active).map(() => ({ average: 0 })) }))
        .catch(() => undefined)
    }
  }, [slug, user?.id])

  if (!base) return <Navigate to="/app/coder" replace />

  const cell = user?.cell ?? project?.cell ?? 'Tu célula'
  const sprintLabel = project ? `Sprint ${project.sprint}` : 'Sprint activo'
  const firstName = user?.fullName.split(' ')[0] ?? 'Coder'

  const todoCount = projectDetails?.stories.filter(s => (s.kanbanStatus ?? s.status) === 'todo').length
  const inProgressCount = projectDetails?.stories.filter(s => (s.kanbanStatus ?? s.status) === 'in_progress').length
  const doneCount = projectDetails?.stories.filter(s => (s.kanbanStatus ?? s.status) === 'done').length ?? project?.doneStories
  const avgEval = evalSummary?.criteria.length
    ? (evalSummary.criteria.reduce((s, c) => s + Number(c.average), 0) / evalSummary.criteria.length).toFixed(1)
    : '—'
  const completedEvals = evalSummary?.criteria.filter(c => c.average > 0).length ?? 0
  const pendingEvals = (evalSummary?.criteria.length ?? 0) - completedEvals
  const roses = profile?.metrics.roses ?? 0
  const doneStories = profile?.metrics.doneStories ?? project?.doneStories ?? 0

  const spaceConfig: Record<string, { title: string; subtitle: string; stats: [string, string][] }> = {
    sprint: {
      title: project ? `Sprint ${project.sprint}` : 'Sprint activo',
      subtitle: `Historias, alcance y ritmo de ${cell}.`,
      stats: [
        [String(project?.doneStories ?? '—'), 'Historias listas'],
        [String(project ? project.stories - project.doneStories : '—'), 'En progreso'],
        [daysUntil(sprintEndDate), 'Tiempo restante'],
      ],
    },
    proyectos: {
      title: project?.name ?? 'Proyectos',
      subtitle: `Repositorios y entregables de ${cell}.`,
      stats: [
        [String(project?.githubLinks ?? '—'), 'Repositorios'],
        [String(project?.stories ?? '—'), 'Historias'],
        [project ? `${Math.round(project.progress)}%` : '—', 'Avance'],
      ],
    },
    tablero: {
      title: 'Tablero de la célula',
      subtitle: `El flujo propio de trabajo de ${cell} este sprint.`,
      stats: [
        [String(todoCount ?? project ? project!.stories - project!.doneStories : '—'), 'Por hacer'],
        [String(inProgressCount ?? '—'), 'En curso'],
        [String(doneCount ?? '—'), 'Finalizadas'],
      ],
    },
    ceremonias: {
      title: 'Ceremonias Scrum',
      subtitle: 'Planning, checkpoints, review y retrospectiva.',
      stats: [
        [String(ceremonies?.ceremonies.length ?? project?.ceremonies ?? '—'), 'Ceremonias'],
        [String(ceremonies?.ceremonies.filter(c => c.status === 'closed' || c.status === 'Cerrada').length ?? '—'), 'Completadas'],
        [nextCeremonyDate(ceremonies?.ceremonies ?? []), 'Próxima'],
      ],
    },
    documentacion: {
      title: 'Documentación',
      subtitle: 'README, arquitectura y acuerdos vivos.',
      stats: [
        ['—', 'Secciones'],
        ['—', 'Editores'],
        ['Hoy', 'Actualizado'],
      ],
    },
    evaluaciones: {
      title: 'Evaluaciones',
      subtitle: `Retos, evidencia y crecimiento técnico.`,
      stats: [
        [String(completedEvals), 'Completadas'],
        [String(pendingEvals), 'Pendientes'],
        [avgEval, 'Promedio eval.'],
      ],
    },
    perfil: {
      title: `Perfil de ${firstName}`,
      subtitle: 'Tu recorrido dentro de B612.',
      stats: [
        [String(roses), 'Rosas ganadas'],
        [String(doneStories), 'Historias hechas'],
        [profile ? `${Number(profile.metrics.averageEvaluation).toFixed(1)} / 5` : '—', 'Promedio eval.'],
      ],
    },
  }

  const space = spaceConfig[slug ?? '']
  const Icon = base.icon

  return (
    <RoleShell role="Coder" name={user?.fullName ?? 'Coder B612'}>
      {slug !== 'tablero' && <Link className="coder-space-back" to="/app/coder/tablero"><ArrowLeft size={16} /> Volver al tablero</Link>}
      {slug !== 'perfil' && <>
        <header className="coder-space-hero coder-space-hero--vip" style={{ '--space-color': base.color, '--space-art': `url(${base.art})` } as CSSProperties}>
          <div>
            <span><Icon /> Espacio de trabajo</span>
            <h1>{space?.title ?? slug}</h1>
            <p>{space?.subtitle ?? ''}</p>
          </div>
          <b>{project ? `${sprintLabel} · ${cell}` : 'Sin sprint activo'}</b>
        </header>
        <div className="coder-space-stats coder-space-stats--vip">
          {(space?.stats ?? []).map(([value, label]) => (
            <article key={label}><Sparkles /><strong>{value}</strong><span>{label}</span></article>
          ))}
        </div>
      </>}
      <CoderSpaceModule slug={slug ?? ''} />
    </RoleShell>
  )
}
