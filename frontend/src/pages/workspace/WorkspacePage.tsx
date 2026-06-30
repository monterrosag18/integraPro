import { Flame, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiRequest } from '../../shared/api/httpClient'
import { CoderResourceCards } from '../../features/workspace/components/CoderResourceCards'
import { getCurrentUser } from '../../shared/auth/session'
import { RoleShell } from '../../shared/components/layout/RoleShell'

type ProjectSummary = {
  sprint: number; sprintStatus: string; stories: number
  doneStories: number; progress: number; cell: string
}

type EvalCriteria = { name: string; average: number }
type EvalSummary = { anonymous: boolean; criteria: EvalCriteria[] }
type CoderMetrics = { roses: number; leaderRuns: number; assignedStories: number; doneStories: number; donePoints: number; averageEvaluation: number }

export function WorkspacePage() {
  const user = getCurrentUser()
  const firstName = user?.fullName.split(' ')[0] ?? 'Coder'
  const context = [user?.cell, user?.clan].filter(Boolean).join(' · ') || 'Tu célula · Tu clan'
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [evalAvg, setEvalAvg] = useState<number | null>(null)
  const [profileMetrics, setProfileMetrics] = useState<CoderMetrics | null>(null)

  useEffect(() => {
    if (!user?.id) return
    apiRequest<{ projects: ProjectSummary[] }>(`/projects?coderId=${user.id}`)
      .then(({ projects }) => {
        const active = projects.find(p => p.sprintStatus === 'active') ?? projects[0]
        if (active) setProject(active)
      })
      .catch(() => undefined)

    apiRequest<EvalSummary>(`/evaluations/summary?coderId=${user.id}`)
      .then(data => {
        if (data.criteria.length > 0) {
          const avg = data.criteria.reduce((sum, c) => sum + c.average, 0) / data.criteria.length
          setEvalAvg(Math.round(avg * 20))
        }
      })
      .catch(() => undefined)

    apiRequest<{ coder: object; metrics: CoderMetrics; history: object[] }>(`/coders/${user.id}/profile`)
      .then(data => setProfileMetrics(data.metrics))
      .catch(() => undefined)
  }, [user?.id])

  const progress = project?.progress ?? 0
  const sprintLabel = project ? `Sprint ${project.sprint}` : 'Sprint activo'
  const storyLabel = project ? `${project.doneStories}/${project.stories} HU` : 'DB'

  return <RoleShell role="Coder" name={user?.fullName ?? 'Coder B612'}>
    <header className="coder-welcome">
      <div>
        <p className="eyebrow">{context}</p>
        <h1>Bienvenida/o, {firstName} <span>✦</span></h1>
        <p>Continúa aprendiendo, construyendo y creciendo con tu tripulación.</p>
      </div>
      <div className="coder-welcome__status">
        <span><Flame /> Sesión real</span>
        <div>
          <small>Progreso del sprint</small>
          <strong>{storyLabel}</strong>
          <i><b style={{ width: `${progress}%` }} /></i>
        </div>
      </div>
    </header>
    <CoderResourceCards sprintLabel={sprintLabel} project={project} evalAvg={evalAvg} profileMetrics={profileMetrics} />
    <footer className="coder-quote">
      <Sparkles />
      <blockquote>"Lo esencial también vive en lo que construimos juntos."</blockquote>
    </footer>
  </RoleShell>
}
