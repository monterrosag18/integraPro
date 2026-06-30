import { CheckCircle2, CircleCheck, CircleDashed, Clock3, MoreHorizontal, Plus, Rocket, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiRequest } from '../../shared/api/httpClient'
import { getCurrentUser } from '../../shared/auth/session'
import { RoleShell } from '../../shared/components/layout/RoleShell'

type Priority = 'Alta' | 'Media' | 'Baja'
type Story = { id: string; title: string; priority: Priority; avatar: string; points: number; description?: string }
type Column = { id: string; title: string; color: string; icon: typeof CircleCheck; cards: Story[] }

type ApiStory = {
  id: string
  iWant: string
  status: string
  assignee: string | null
  estimate: number
  priority: number | null
}
type ApiProjectMeta = {
  id: string; name: string; sprint: number; sprintStatus: string
  cell: string; clan: string; stories: number; doneStories: number; progress: number
}

const COLUMNS: Omit<Column, 'cards'>[] = [
  { id: 'todo', title: 'To Do', color: '#8b7fa8', icon: CircleDashed },
  { id: 'in_progress', title: 'In Progress', color: '#a78bfa', icon: Rocket },
  { id: 'review', title: 'Review', color: '#fb7185', icon: ShieldCheck },
  { id: 'done', title: 'Done', color: '#5ce1b9', icon: CircleCheck },
]

function priorityLabel(p: number | null): Priority {
  if (!p || p <= 1) return 'Baja'
  if (p === 2) return 'Media'
  return 'Alta'
}

function initials(name: string | null): string {
  if (!name) return 'NA'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function storiesToColumns(stories: ApiStory[]): Record<string, Story[]> {
  const groups: Record<string, Story[]> = { todo: [], in_progress: [], review: [], done: [] }
  for (const s of stories) {
    const status = s.status.toLowerCase().replace(' ', '_')
    const key = status in groups ? status : 'todo'
    groups[key].push({
      id: s.id,
      title: s.iWant,
      priority: priorityLabel(s.priority),
      avatar: initials(s.assignee),
      points: s.estimate ?? 1,
    })
  }
  return groups
}

export function LeaderDashboardPage() {
  const user = getCurrentUser()
  const [columns, setColumns] = useState<Column[]>(COLUMNS.map(c => ({ ...c, cards: [] })))
  const [dragged, setDragged] = useState<{ story: Story; from: string } | null>(null)
  const [selected, setSelected] = useState<{ story: Story; column: string } | null>(null)
  const [notice, setNotice] = useState('')
  const [projectMeta, setProjectMeta] = useState<ApiProjectMeta | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    apiRequest<{ projects: ApiProjectMeta[] }>(`/projects?coderId=${user.id}`)
      .then(({ projects }) => {
        const active = projects.find(p => p.sprintStatus === 'active') ?? projects[0]
        if (!active) { setLoading(false); return }
        setProjectMeta(active)
        return apiRequest<{ project: ApiProjectMeta; stories: ApiStory[] }>(`/projects/${active.id}`)
      })
      .then(details => {
        if (!details) return
        const groups = storiesToColumns(details.stories)
        setColumns(COLUMNS.map(c => ({ ...c, cards: groups[c.id] ?? [] })))
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [user?.id])

  const toast = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const move = (target: string) => {
    if (!dragged || dragged.from === target) return
    setColumns(current => current.map(column =>
      column.id === dragged.from
        ? { ...column, cards: column.cards.filter(card => card.id !== dragged.story.id) }
        : column.id === target
          ? { ...column, cards: [...column.cards, dragged.story] }
          : column
    ))
    toast(`${dragged.story.id.slice(0, 8)} movida a ${COLUMNS.find(c => c.id === target)?.title}`)
    setDragged(null)
  }

  const addStory = () => {
    const id = `local-${Date.now()}`
    const story: Story = { id, title: 'Nueva historia de usuario', priority: 'Media', avatar: initials(user?.fullName ?? null), points: 3 }
    setColumns(current => current.map((column, index) => index === 0 ? { ...column, cards: [...column.cards, story] } : column))
    setSelected({ story, column: COLUMNS[0].id })
    toast('Historia local agregada al backlog')
  }

  const updateSelected = (patch: Partial<Story>) => {
    if (!selected) return
    const updated = { ...selected.story, ...patch }
    setSelected({ ...selected, story: updated })
    setColumns(current => current.map(column =>
      column.id === selected.column ? { ...column, cards: column.cards.map(card => card.id === updated.id ? updated : card) } : column
    ))
  }

  const total = columns.reduce((sum, c) => sum + c.cards.length, 0)
  const done = columns.find(c => c.id === 'done')?.cards.length ?? 0
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const sprintLabel = projectMeta ? `${projectMeta.cell} · Sprint ${projectMeta.sprint}` : loading ? 'Cargando…' : 'Sin sprint activo'

  return <RoleShell role="Líder" name={user?.fullName ?? 'Líder B612'}>
    <header className="page-header page-header--premium">
      <div><div className="hero-kicker"><Sparkles size={14} /> {sprintLabel}</div><h1>Tablero de misión</h1><p>Arrastra las historias para actualizar su estado o abre cada card para editar su detalle.</p></div>
      <button className="primary-button" onClick={addStory}><Plus size={17} /> Nueva historia</button>
    </header>
    <div className="sprint-pulse">
      <div><span>Progreso del sprint</span><strong>{projectMeta ? `${projectMeta.progress}%` : `${progress}%`}</strong></div>
      <div className="pulse-progress"><i style={{ width: `${projectMeta?.progress ?? progress}%` }} /></div>
      <div className="pulse-team">
        <span>{total} historias · {done} finalizadas</span>
      </div>
    </div>
    <div className="kanban kanban--premium">{columns.map(({ icon: Icon, ...column }) => <section className="kanban-column" key={column.id} style={{ '--column-color': column.color } as React.CSSProperties} onDragOver={event => event.preventDefault()} onDrop={() => move(column.id)}>
      <header><div><Icon size={17} /><h3>{column.title}</h3></div><span>{column.cards.length}</span></header>
      {column.cards.map(card => <article draggable onDragStart={() => setDragged({ story: card, from: column.id })} className="story-card story-card--premium" key={card.id}>
        <div className="story-top"><small>{card.id.length > 20 ? 'Historia' : card.id}</small><button aria-label={`Abrir historia`} onClick={() => setSelected({ story: card, column: column.id })}><MoreHorizontal size={16} /></button></div>
        <strong>{card.title}</strong>
        <span className={`priority priority--${card.priority.toLowerCase()}`}>{card.priority}</span>
        <div className="story-footer"><span className="avatar-mini"><UserRound size={13} />{card.avatar}</span><span><Clock3 size={13} />{card.points} pts</span></div>
      </article>)}
    </section>)}</div>
    {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}>
      <form className="modal-card" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); setSelected(null); toast('Historia actualizada') }}>
        <button type="button" className="prototype-modal-close" onClick={() => setSelected(null)}><X /></button>
        <p className="eyebrow">{COLUMNS.find(c => c.id === selected.column)?.title}</p>
        <h2>{selected.story.id.length > 20 ? 'Historia' : selected.story.id}</h2>
        <label>Título<input value={selected.story.title} onChange={event => updateSelected({ title: event.target.value })} /></label>
        <label>Prioridad<select value={selected.story.priority} onChange={event => updateSelected({ priority: event.target.value as Priority })}><option>Alta</option><option>Media</option><option>Baja</option></select></label>
        <label>Puntos<input type="number" min={1} max={13} value={selected.story.points} onChange={event => updateSelected({ points: Number(event.target.value) })} /></label>
        <label>Descripción<textarea value={selected.story.description ?? ''} onChange={event => updateSelected({ description: event.target.value })} placeholder="Criterios de aceptación, notas o bloqueos..." /></label>
        <div><button type="button" className="ghost-small" onClick={() => setSelected(null)}>Cerrar</button><button className="primary-button"><CheckCircle2 /> Guardar historia</button></div>
      </form>
    </div>}
    {notice && <div className="prototype-toast"><CheckCircle2 />{notice}</div>}
  </RoleShell>
}
