import { Award, BookOpenText, CalendarDays, CheckCircle2, ChevronRight, Circle, Clock3, ExternalLink, GitBranch, GripVertical, Medal, MessageSquareText, Pencil, Plus, Rocket, ShieldCheck, Star, Trash2, Trophy, Upload, UserRound, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { apiRequest } from '../../../shared/api/httpClient'
import { getCurrentUser } from '../../../shared/auth/session'
import { fetchGithubMeta, timeAgo, type GithubGist, type GithubMeta, type GithubOrg, type GithubRepo } from '../../../shared/lib/github'

// ---- shared types ----
type Story = { id: string; title: string; asA: string; soThat: string; assignee: string; assigneeName: string | null; points: number; priority: 'Alta' | 'Media' | 'Baja' }
type BoardColumn = { id: string; title: string; color: string; stories: Story[] }
type ProjectCard = { id?: string; name: string; owner: string; source: string; progress: number; status: string; repo: string; stories?: number; doneStories?: number; githubLinks?: number; ceremonies?: number }
type ApiProjectMeta = { id: string; name: string; sprint: number; sprintStatus: string; cell: string; clan: string; stories: number; doneStories: number; progress: number; githubLinks: number; ceremonies: number }
type ApiStory = { id: string; asA: string; iWant: string; soThat: string; status: string; assignee: string | null; estimate: number; priority: number | null }
type ApiCeremony = { id: string; type: string; date: string; status: string }
type CoderProfile = {
  coder: { id: string; name: string; email: string; campus: string; cohort: string; clan: string }
  metrics: { roses: number; leaderRuns: number; assignedStories: number; doneStories: number; donePoints: number; averageEvaluation: number }
  history: Array<{ sprint: number; cell: string; role: string; startDate: string; endDate: string; status: string }>
}
type EvalCriterion = { criterionId: number; criterion: string; scope: string; average: number; responses: number }

function priorityLabel(p: number | null): 'Alta' | 'Media' | 'Baja' {
  if (!p || p <= 1) return 'Baja'
  if (p === 2) return 'Media'
  return 'Alta'
}
function initials(name: string | null): string {
  if (!name) return 'NA'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function apiStoriesToBoard(stories: ApiStory[]): BoardColumn[] {
  const cols: BoardColumn[] = [
    { id: 'todo', title: 'Por hacer', color: '#8b7fa8', stories: [] },
    { id: 'in_progress', title: 'En progreso', color: '#9d72ff', stories: [] },
    { id: 'review', title: 'En revisión', color: '#ff7d91', stories: [] },
    { id: 'done', title: 'Finalizado', color: '#55d7a8', stories: [] },
  ]
  const map: Record<string, number> = { todo: 0, in_progress: 1, review: 2, done: 3 }
  for (const s of stories) {
    const idx = map[s.status.toLowerCase()] ?? 0
    cols[idx].stories.push({ id: s.id, title: s.iWant, asA: s.asA ?? '', soThat: s.soThat ?? '', assignee: initials(s.assignee), assigneeName: s.assignee, points: s.estimate ?? 1, priority: priorityLabel(s.priority) })
  }
  return cols
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="vip-section-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div></div>
}

// ---- SprintModule ----
function SprintModule() {
  const user = getCurrentUser()
  const [project, setProject] = useState<ApiProjectMeta | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    apiRequest<{ projects: ApiProjectMeta[] }>(`/projects?coderId=${user.id}`)
      .then(({ projects }) => {
        const active = projects.find(p => p.sprintStatus === 'active') ?? projects[0]
        if (active) setProject(active)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [user?.id])

  const sprintLabel = project ? `Sprint ${project.sprint} · ${project.cell}` : loading ? 'Cargando…' : 'Sin sprint activo'
  const donePercent = project && project.stories > 0 ? Math.round((project.doneStories / project.stories) * 100) : 0

  return <div className="vip-module">
    <SectionTitle eyebrow={sprintLabel} title="Ruta de la misión" description="Fechas, objetivos y entregables visibles para toda la célula." />
    <div className="sprint-vip-grid">
      <section className="sprint-timeline">
        {project ? <>
          <article className="sprint-milestone sprint-milestone--done">
            <div><span><CheckCircle2 /></span></div>
            <time>{project.sprintStatus === 'active' ? 'En curso' : 'Cerrado'}</time>
            <div><strong>Sprint {project.sprint}</strong><p>Proyecto: {project.name}</p></div>
          </article>
          <article className={`sprint-milestone sprint-milestone--${project.sprintStatus === 'active' ? 'active' : 'done'}`}>
            <div><span><Rocket /></span></div>
            <time>{project.doneStories}/{project.stories} HU</time>
            <div><strong>Avance</strong><p>{donePercent}% completado</p></div>
            {project.sprintStatus === 'active' && <b>EN CURSO</b>}
          </article>
        </> : <article className="sprint-milestone sprint-milestone--next">
          <div><span><Circle /></span></div>
          <time>—</time>
          <div><strong>Sin sprint activo</strong><p>{loading ? 'Consultando base de datos…' : 'No hay proyectos asignados.'}</p></div>
        </article>}
      </section>
      <aside className="sprint-objective">
        <span><Rocket /> Objetivo del sprint</span>
        <h3>{project ? project.name : 'Sin proyecto asignado'}</h3>
        <p>{project ? `Clan ${project.clan} · Célula ${project.cell}` : 'Espera la asignación de tu TL.'}</p>
        <div><span>Avance global</span><strong>{project ? `${project.progress}%` : '0%'}</strong></div>
        <i><b style={{ width: `${project?.progress ?? 0}%` }} /></i>
        {project && <ul>
          <li><CheckCircle2 />{project.doneStories} historias completadas</li>
          <li><Clock3 />{project.stories - project.doneStories} historias en progreso</li>
          {project.ceremonies > 0 && <li><Users />{project.ceremonies} ceremonias registradas</li>}
        </ul>}
      </aside>
    </div>
  </div>
}

// ---- GitHub preview cards ----
function RepoCard({ meta, url }: { meta: GithubRepo; url: string }) {
  return <a className="gh-card gh-card--repo" href={url} target="_blank" rel="noreferrer">
    <div className="gh-card__header">
      <GitBranch size={15} />
      <strong>{meta.fullName}</strong>
      {meta.language && <span className="gh-lang">{meta.language}</span>}
      {meta.stars > 0 && <span className="gh-stars">★ {meta.stars}</span>}
    </div>
    {meta.description && <p className="gh-card__desc">{meta.description}</p>}
    <small className="gh-card__foot">Actualizado {timeAgo(meta.updatedAt)} · {meta.owner}</small>
  </a>
}

function OrgCard({ meta, url }: { meta: GithubOrg; url: string }) {
  return <a className="gh-card gh-card--org" href={url} target="_blank" rel="noreferrer">
    <div className="gh-card__header">
      {meta.avatarUrl && <img src={meta.avatarUrl} alt={meta.login} width={22} height={22} style={{ borderRadius: '50%' }} />}
      <strong>{meta.name ?? meta.login}</strong>
      <span className="gh-stars">{meta.publicRepos} repos</span>
    </div>
    {meta.description && <p className="gh-card__desc">{meta.description}</p>}
    <small className="gh-card__foot">@{meta.login}</small>
  </a>
}

function GistPanel({ meta }: { meta: GithubGist }) {
  const preview = meta.firstFile.content.slice(0, 1200)
  return <div className="gh-gist-panel">
    <div className="gh-gist-panel__header">
      <div>
        <span className="eyebrow">Del TL · Gist</span>
        <h3>{meta.description || meta.firstFile.filename}</h3>
        <small>@{meta.owner} · {timeAgo(meta.updatedAt)}</small>
      </div>
      <a href={meta.htmlUrl} target="_blank" rel="noreferrer" className="ghost-small"><ExternalLink size={14} /> Ver en GitHub</a>
    </div>
    <article className="markdown-preview gh-gist-panel__content">
      <ReactMarkdown>{preview}</ReactMarkdown>
    </article>
  </div>
}

function GithubMetaCard({ meta, url }: { meta: GithubMeta; url: string }) {
  if (meta.type === 'repo') return <RepoCard meta={meta} url={url} />
  if (meta.type === 'org') return <OrgCard meta={meta} url={url} />
  return null
}

// ---- ProjectsModule ----
type GhLink = { id: string; url: string; addedBy: string | null; addedByUserId: string }

function ProjectsModule() {
  const user = getCurrentUser()
  const fallback: ProjectCard[] = [
    { name: 'API de seguimiento', owner: 'Juan López · Líder', source: 'Creado por el líder', progress: 76, status: 'En desarrollo', repo: 'b612-tracking-api' },
    { name: 'Dashboard del clan', owner: 'Alex Rivera · TL', source: 'Asignado por el TL', progress: 58, status: 'Checkpoint semanal', repo: 'clan-dashboard' },
  ]
  const [projects, setProjects] = useState<ProjectCard[]>(fallback)
  const [active, setActive] = useState<ProjectCard | null>(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [ghLinks, setGhLinks] = useState<GhLink[]>([])
  const [ghMetas, setGhMetas] = useState<Record<string, GithubMeta | null>>({})
  const [tlGist, setTlGist] = useState<GithubGist | null>(null)
  const [addUrl, setAddUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const fetching = useRef(false)

  const fetchLinks = (projectId: string) => {
    apiRequest<{ links: GhLink[] }>(`/projects/${projectId}/github-links`)
      .then(({ links }) => {
        setGhLinks(links)
        links.forEach(link => {
          fetchGithubMeta(link.url).then(meta => {
            setGhMetas(prev => ({ ...prev, [link.url]: meta }))
          })
        })
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    if (fetching.current) return
    fetching.current = true
    const query = user?.role === 'coder' ? `?coderId=${user.id}` : ''
    apiRequest<{ projects: ApiProjectMeta[] }>(`/projects${query}`)
      .then(payload => {
        if (payload.projects.length) {
          const mapped = payload.projects.slice(0, 6).map(project => ({
            id: project.id, name: project.name,
            owner: `Célula ${project.cell} · Clan ${project.clan}`,
            source: `Sprint ${project.sprint} · Base real`,
            progress: Number(project.progress),
            status: project.sprintStatus,
            repo: project.githubLinks ? `${project.githubLinks} link(s) GitHub` : 'Repositorio pendiente',
            stories: project.stories, doneStories: project.doneStories,
            githubLinks: project.githubLinks, ceremonies: project.ceremonies,
          }))
          setProjects(mapped)
          const first = mapped[0]
          if (first?.id) {
            setActiveProjectId(first.id)
            fetchLinks(first.id)
          }
        }
      })
      .catch(() => setProjects(fallback))
      .finally(() => setLoading(false))

    if (user?.clan) {
      apiRequest<{ resources: Array<{ id: string; type: string; url: string }> }>(`/clan-resources?clanName=${encodeURIComponent(user.clan)}`)
        .then(({ resources }) => {
          const gistResource = resources.find(r => r.type === 'gist')
          if (gistResource) {
            fetchGithubMeta(gistResource.url).then(meta => {
              if (meta?.type === 'gist') setTlGist(meta)
            })
          }
        })
        .catch(() => undefined)
    }
  }, [])

  const toast = (message: string) => { setNotice(message); setTimeout(() => setNotice(''), 2200) }

  const handleAddLink = async (e: FormEvent) => {
    e.preventDefault()
    if (!addUrl.trim() || !activeProjectId || !user?.id) return
    setAdding(true)
    try {
      await apiRequest(`/projects/${activeProjectId}/github-links`, {
        method: 'POST',
        body: JSON.stringify({ url: addUrl.trim(), addedByUserId: user.id }),
      })
      setAddUrl('')
      fetchLinks(activeProjectId)
      toast('Enlace agregado')
    } catch {
      toast('URL inválida o no se pudo guardar')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!activeProjectId) return
    setGhLinks(prev => prev.filter(l => l.id !== linkId))
    await apiRequest(`/projects/${activeProjectId}/github-links/${linkId}`, { method: 'DELETE' }).catch(() => undefined)
    toast('Enlace eliminado')
  }

  return <div className="vip-module">
    <SectionTitle eyebrow={loading ? 'Sincronizando proyectos…' : 'Proyectos asignados'} title="Trabajo de la célula" description="Proyectos creados por el líder o el TL, con repositorio, ceremonias y avance desde la base real." />
    <div className="vip-project-list">{projects.map((project, index) => <article key={project.id ?? project.name} style={{ '--project-accent': ['#9d72ff', '#55d7c3', '#ff8d6b', '#ffd166', '#3dd6d0', '#ff6b8a'][index % 6] } as React.CSSProperties}>
      <div className="vip-project-number">0{index + 1}</div>
      <div className="vip-project-main"><span>{project.source}</span><h3>{project.name}</h3><p><UserRound /> {project.owner}</p></div>
      <button className="vip-project-repo" onClick={() => toast(project.githubLinks ? `${project.githubLinks} enlace(s) GitHub disponibles` : `${project.repo} pendiente por cargar`)}><GitBranch /><span><small>Repositorio</small><strong>{project.repo}</strong></span><ExternalLink /></button>
      <div className="vip-project-progress"><div><span>{project.status}</span><strong>{project.progress}%</strong></div><i><b style={{ width: `${project.progress}%` }} /></i><button onClick={() => setActive(project)}>Entrar al proyecto <ChevronRight /></button></div>
    </article>)}</div>

    {activeProjectId && <div className="gh-links-section">
      <div className="gh-links-section__header">
        <div><span className="eyebrow">Repositorios del proyecto</span><h3>GitHub</h3></div>
        <form onSubmit={handleAddLink} className="gh-add-form">
          <input
            type="url" value={addUrl} onChange={e => setAddUrl(e.target.value)}
            placeholder="https://github.com/org/repo" disabled={adding}
          />
          <button type="submit" className="primary-button" disabled={adding || !addUrl.trim()}>
            <Plus size={15} /> {adding ? 'Guardando…' : 'Agregar'}
          </button>
        </form>
      </div>
      {ghLinks.length === 0
        ? <p className="gh-empty">Sin repositorios aún. Agrega el primero arriba.</p>
        : <div className="gh-cards-grid">
            {ghLinks.map(link => {
              const meta = ghMetas[link.url]
              return <div key={link.id} className="gh-card-wrapper">
                {meta
                  ? <GithubMetaCard meta={meta} url={link.url} />
                  : <a className="gh-card gh-card--loading" href={link.url} target="_blank" rel="noreferrer">
                      <GitBranch size={14} /><span>{link.url}</span>
                      {link.addedBy && <small style={{ display: 'block', marginTop: 4, opacity: 0.6 }}>Por: {link.addedBy}</small>}
                    </a>
                }
                <button className="gh-card-delete" title="Eliminar enlace" onClick={() => handleDeleteLink(link.id)}><Trash2 size={13} /></button>
              </div>
            })}
          </div>
      }
    </div>}

    {tlGist && <GistPanel meta={tlGist} />}

    {active && <div className="modal-backdrop" onMouseDown={() => setActive(null)}><section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}>
      <button type="button" className="prototype-modal-close" onClick={() => setActive(null)}><X /></button>
      <p className="eyebrow">{active.source}</p><h2>{active.name}</h2><p>{active.owner}</p>
      <div className="project-detail-actions">
        <button className="primary-button" onClick={() => toast('Tablero conectado al proyecto real')}>Abrir tablero</button>
        <button className="ghost-small" onClick={() => toast('README abierto dentro de Documentación')}>Ver README</button>
      </div>
      <div className="profile-dims-v2">
        <article><div><span>Avance</span><strong>{active.progress}%</strong></div><i><b style={{ width: `${active.progress}%`, background: '#55d7c3' }} /></i><small>{active.status}</small></article>
        <article><div><span>Historias</span><strong>{active.doneStories ?? 0}/{active.stories ?? 0}</strong></div><small>Completadas / totales</small></article>
        <article><div><span>Ceremonias</span><strong>{active.ceremonies ?? 0}</strong></div><small>Registradas en la base</small></article>
      </div>
    </section></div>}
    {notice && <div className="prototype-toast"><CheckCircle2 />{notice}</div>}
  </div>
}

// ---- BoardModule ----
const DEFAULT_COLS: BoardColumn[] = [
  { id: 'todo', title: 'Por hacer', color: '#8b7fa8', stories: [] },
  { id: 'in_progress', title: 'En progreso', color: '#9d72ff', stories: [] },
  { id: 'review', title: 'En revisión', color: '#ff7d91', stories: [] },
  { id: 'done', title: 'Finalizado', color: '#55d7a8', stories: [] },
]

function BoardModule() {
  const user = getCurrentUser()
  const SESS_KEY = `b612.board.${user?.id ?? 'x'}`

  const [columns, setColumns] = useState<BoardColumn[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESS_KEY)
      if (saved) return JSON.parse(saved) as BoardColumn[]
    } catch { /* ignore */ }
    return DEFAULT_COLS.map(c => ({ ...c, stories: [] }))
  })
  const [dragged, setDragged] = useState<{ story: Story; from: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ storyId: string; colId: string; title: string; asA: string; soThat: string } | null>(null)
  const [notice, setNotice] = useState('')

  const toast = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 2500) }

  // Persist to sessionStorage on every change so navigation doesn't wipe state
  useEffect(() => {
    try { sessionStorage.setItem(SESS_KEY, JSON.stringify(columns)) } catch { /* ignore */ }
  }, [columns, SESS_KEY])

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    apiRequest<{ projects: ApiProjectMeta[] }>(`/projects?coderId=${user.id}`)
      .then(({ projects }) => {
        const active = projects.find(p => p.sprintStatus === 'active') ?? projects[0]
        if (!active) return Promise.resolve(null)
        setActiveProjectId(active.id)
        return apiRequest<{ project: ApiProjectMeta; stories: ApiStory[] }>(`/projects/${active.id}`)
      })
      .then(details => {
        if (!details) return
        // Merge DB stories into current columns so local-only stories aren't lost
        const dbCols = apiStoriesToBoard(details.stories)
        setColumns(current => dbCols.map(dbCol => {
          const localCol = current.find(c => c.id === dbCol.id)
          const localOnly = (localCol?.stories ?? []).filter(s => s.id.startsWith('local-'))
          return { ...dbCol, stories: [...dbCol.stories, ...localOnly] }
        }))
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [user?.id])

  const move = (target: string) => {
    if (!dragged || target === dragged.from) return
    const story = dragged.story
    // Optimistic update first
    setColumns(current => current.map(col =>
      col.id === dragged.from ? { ...col, stories: col.stories.filter(s => s.id !== story.id) }
        : col.id === target ? { ...col, stories: [...col.stories, story] }
        : col
    ))
    setDragged(null)
    // Sync to DB asynchronously
    if (activeProjectId && !story.id.startsWith('local-')) {
      apiRequest(`/projects/${activeProjectId}/stories/${story.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: target }),
      }).catch(() => toast('Estado guardado localmente · sin sincronización con el servidor'))
    }
  }

  const add = async () => {
    const tempId = `local-${Date.now()}`
    const newStory: Story = { id: tempId, title: 'Nueva historia', asA: user?.fullName ?? 'Coder', soThat: '', assignee: initials(user?.fullName ?? null), assigneeName: user?.fullName ?? null, points: 3, priority: 'Media' }
    // Optimistic: show story immediately
    setColumns(current => current.map(col => col.id === 'todo'
      ? { ...col, stories: [...col.stories, newStory] }
      : col
    ))
    setEditing({ storyId: tempId, colId: 'todo', title: 'Nueva historia', asA: newStory.asA, soThat: '' })

    if (!activeProjectId) return

    try {
      const res = await apiRequest<{ id: string; iWant: string; status: string }>(`/projects/${activeProjectId}/stories`, {
        method: 'POST',
        body: JSON.stringify({ iWant: 'Nueva historia', asA: user?.fullName ?? 'Coder', soThat: '', estimate: 3, priority: 2 }),
      })
      // Replace temp ID with real UUID from DB
      setColumns(current => current.map(col => ({
        ...col,
        stories: col.stories.map(s => s.id === tempId ? { ...s, id: res.id } : s),
      })))
      setEditing(prev => prev?.storyId === tempId ? { ...prev, storyId: res.id } : prev)

    } catch {
      toast('Historia creada localmente · reinicia el servidor para sincronizar')
    }
  }

  const saveEdit = () => {
    if (!editing) return
    const { storyId, colId, title, asA, soThat } = editing
    // Always update local state — independent of API
    setColumns(current => current.map(col =>
      col.id === colId ? { ...col, stories: col.stories.map(s => s.id === storyId ? { ...s, title, asA, soThat } : s) } : col
    ))
    setEditing(null)
    // Sync to DB if IDs are available
    if (activeProjectId && !storyId.startsWith('local-')) {
      apiRequest(`/projects/${activeProjectId}/stories/${storyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ iWant: title, asA, soThat }),
      }).catch(() => toast('Historia guardada localmente · sin sincronización con el servidor'))
    }
  }

  return <div className="vip-module">
    <div className="vip-section-title vip-section-title--action">
      <div><p className="eyebrow">{loading ? 'Cargando tablero…' : 'Tablero interno · Scrum'}</p><h2>Flujo de la célula</h2><p>Arrastra historias entre columnas para actualizar su estado. Haz clic en el título para editar.</p></div>
      <button className="primary-button" onClick={add}><Plus /> Nueva historia</button>
    </div>
    <div className="coder-kanban">{columns.map(column => <section key={column.id} style={{ '--kanban-color': column.color } as React.CSSProperties} onDragOver={event => event.preventDefault()} onDrop={() => move(column.id)}>
      <header><span><i /><strong>{column.title}</strong></span><b>{column.stories.length}</b></header>
      <div>{column.stories.map(story => <article draggable onDragStart={() => setDragged({ story, from: column.id })} key={story.id}>
        <div><small>{story.id.startsWith('local-') ? 'local' : story.id.slice(0, 8)}</small><GripVertical /></div>
        {editing?.storyId === story.id
          ? <div className="board-story-edit-group">
              <input
                className="board-story-edit board-story-edit--sm"
                placeholder="Como (rol)…"
                value={editing.asA}
                onChange={e => setEditing(prev => prev ? { ...prev, asA: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Escape') setEditing(null) }}
              />
              <textarea
                autoFocus
                className="board-story-edit"
                placeholder="Quiero…"
                value={editing.title}
                onChange={e => setEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditing(null) }}
              />
              <input
                className="board-story-edit board-story-edit--sm"
                placeholder="Para que…"
                value={editing.soThat}
                onChange={e => setEditing(prev => prev ? { ...prev, soThat: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Escape') setEditing(null) }}
              />
              <div className="board-story-edit-actions">
                <button className="primary-button" style={{ fontSize: '0.7rem', padding: '3px 10px' }} onClick={saveEdit}>Guardar</button>
                <button className="ghost-small" style={{ fontSize: '0.7rem' }} onClick={() => setEditing(null)}>Cancelar</button>
              </div>
            </div>
          : <>
              {story.asA && <p className="board-story-asa">Como: <em>{story.asA}</em></p>}
              <h4 onClick={() => setEditing({ storyId: story.id, colId: column.id, title: story.title, asA: story.asA, soThat: story.soThat })} style={{ cursor: 'pointer' }} title="Clic para editar">
                {story.title} <Pencil size={11} style={{ opacity: 0.4, marginLeft: 4 }} />
              </h4>
              {story.soThat && <p className="board-story-sothat">Para que: <em>{story.soThat}</em></p>}
            </>
        }
        <span className={`coder-priority coder-priority--${story.priority.toLowerCase()}`}>{story.priority}</span>
        <footer>
          <span title={story.assigneeName ?? undefined}>{story.assigneeName ?? story.assignee}</span>
          <span><Clock3 />{story.points} pts</span>
        </footer>
      </article>)}</div>
      <button onClick={add}><Plus /> Agregar historia</button>
    </section>)}</div>
    {notice && <div className="prototype-toast"><CheckCircle2 />{notice}</div>}
  </div>
}

// ---- DocsModule (unchanged) ----
const docSections = [{ group: 'Empezar', items: ['Introducción', 'Objetivo del sprint', 'Instalación local'] }, { group: 'Arquitectura', items: ['Modelo de datos', 'Backend .NET', 'Frontend React', 'PostgreSQL'] }, { group: 'Trabajo en equipo', items: ['Convenciones Git', 'Definition of Done', 'Ceremonias'] }, { group: 'Referencia', items: ['API REST', 'Variables de entorno', 'Despliegue'] }]
function DocsModule() { const allItems = docSections.flatMap(s => s.items); const [selected, setSelected] = useState('Introducción'); const index = allItems.indexOf(selected); const previous = allItems[Math.max(0, index - 1)]; const next = allItems[Math.min(allItems.length - 1, index + 1)]; return <div className="docs-portal"><aside><div className="docs-portal__brand"><BookOpenText /><span><strong>B612 Docs</strong><small>v1.4</small></span></div><label>Buscar documentación… <kbd>⌘K</kbd></label>{docSections.map(section => <nav key={section.group}><strong>{section.group}</strong>{section.items.map(item => <button className={selected === item ? 'active' : ''} onClick={() => setSelected(item)} key={item}>{item}<ChevronRight /></button>)}</nav>)}</aside><article><div className="docs-breadcrumb">Docs <ChevronRight /> {selected}</div><p className="docs-version"><span /> Actualizado hoy</p><h1>{selected}</h1><p className="docs-lead">Esta guía reúne los acuerdos técnicos y operativos que necesita la célula para construir el proyecto del sprint activo.</p><div className="docs-callout"><Rocket /><div><strong>Objetivo</strong><p>Mantener una fuente única, clara y viva. Cada cambio funcional debe actualizar también su documentación.</p></div></div><h2>Visión general</h2><p>B612 integra el flujo Scrum completo: asignaciones, proyectos, tablero, ceremonias, evaluaciones y reconocimiento.</p><pre><code>docker compose up -d{`\n`}dotnet run --project backend/src/B612.Api{`\n`}npm run dev --prefix frontend</code></pre><div className="docs-pagination"><button disabled={selected === previous} onClick={() => setSelected(previous)}><small>Anterior</small><strong>← {previous}</strong></button><button disabled={selected === next} onClick={() => setSelected(next)}><small>Siguiente</small><strong>{next} →</strong></button></div></article></div> }

// ---- CeremoniesModule ----
function CeremoniesModule() {
  const user = getCurrentUser()
  const [ceremonies, setCeremonies] = useState<ApiCeremony[]>([])
  const [active, setActive] = useState<ApiCeremony | null>(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newType, setNewType] = useState('Planning')
  const [newDate, setNewDate] = useState('')
  const [addingCeremony, setAddingCeremony] = useState(false)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    apiRequest<{ projects: ApiProjectMeta[] }>(`/projects?coderId=${user.id}`)
      .then(({ projects }) => {
        const proj = projects.find(p => p.sprintStatus === 'active') ?? projects[0]
        if (!proj) return Promise.resolve(null)
        setProjectId(proj.id)
        return apiRequest<{ ceremonies: ApiCeremony[] }>(`/projects/${proj.id}/ceremonies`)
      })
      .then(data => { if (data) setCeremonies(data.ceremonies) })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [user?.id])

  const toast = (message: string) => { setNotice(message); setTimeout(() => setNotice(''), 2200) }

  const ceremonyIcon = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('planning')) return CalendarDays
    if (t.includes('review')) return ShieldCheck
    if (t.includes('retro')) return Users
    return MessageSquareText
  }

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) }
    catch { return iso }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!projectId || !newType || !newDate) return
    setAddingCeremony(true)
    try {
      const res = await apiRequest<ApiCeremony>('/ceremonies', {
        method: 'POST',
        body: JSON.stringify({ projectId, type: newType, date: new Date(newDate).toISOString(), status: 'scheduled' }),
      })
      setCeremonies(prev => [...prev, res])
      setShowAddForm(false)
      setNewDate('')
      toast(`Ceremonia "${newType}" creada`)
    } catch {
      toast('No se pudo crear la ceremonia')
    } finally {
      setAddingCeremony(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiRequest(`/ceremonies/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setCeremonies(prev => prev.map(c => c.id === id ? { ...c, status } : c))
      setActive(null)
      toast('Estado actualizado')
    } catch {
      toast('No se pudo actualizar')
    }
  }

  return <div className="vip-module">
    <div className="vip-section-title vip-section-title--action">
      <div>
        <p className="eyebrow">{loading ? 'Cargando ceremonias…' : `Ciclo Scrum · ${ceremonies.length} registradas`}</p>
        <h2>Ceremonias de la semana</h2>
        <p>Participa, consulta los acuerdos y deja evidencia del trabajo realizado.</p>
      </div>
      {projectId && <button className="ghost-small" onClick={() => setShowAddForm(f => !f)}><Plus size={15} /> Nueva ceremonia</button>}
    </div>

    {showAddForm && <form onSubmit={handleCreate} className="gh-add-form gh-add-form--full" style={{ marginBottom: '1rem' }}>
      <select value={newType} onChange={e => setNewType(e.target.value)} disabled={addingCeremony}>
        <option value="Planning">Planning</option>
        <option value="Daily">Daily</option>
        <option value="Review">Review</option>
        <option value="Retrospective">Retrospective</option>
      </select>
      <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} required disabled={addingCeremony} />
      <button type="submit" className="primary-button" disabled={addingCeremony || !newDate}>
        <Plus size={15} /> {addingCeremony ? 'Guardando…' : 'Crear'}
      </button>
      <button type="button" className="ghost-small" onClick={() => setShowAddForm(false)}>Cancelar</button>
    </form>}

    {ceremonies.length === 0 && !loading && <p style={{ padding: '1.5rem', color: 'var(--fg-muted)' }}>No hay ceremonias registradas para este proyecto aún.</p>}

    {ceremonies.length > 0 && <div className="ceremony-grid">{ceremonies.map((item, index) => {
      const Icon = ceremonyIcon(item.type)
      const isToday = item.status?.toLowerCase() === 'active' || item.status?.toLowerCase() === 'en_curso'
      return <article className={index === 1 || isToday ? 'active' : ''} key={item.id}>
        <span><Icon /></span>
        <div><small>{formatDate(item.date)}</small><h3>{item.type}</h3><p>Ceremonia del proyecto</p><b>{item.status}</b></div>
        <button onClick={() => setActive(item)}>Ver detalle <ChevronRight /></button>
      </article>
    })}</div>}

    {active && <div className="modal-backdrop" onMouseDown={() => setActive(null)}>
      <section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}>
        <button type="button" className="prototype-modal-close" onClick={() => setActive(null)}><X /></button>
        <p className="eyebrow">{formatDate(active.date)}</p><h2>{active.type}</h2>
        <p>Estado: <strong>{active.status}</strong></p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          {active.status !== 'done' && <button className="primary-button" onClick={() => handleUpdateStatus(active.id, 'done')}>Marcar completada</button>}
          {active.status !== 'scheduled' && <button className="ghost-small" onClick={() => handleUpdateStatus(active.id, 'scheduled')}>Volver a programar</button>}
          <button className="ghost-small" onClick={() => setActive(null)}>Cerrar</button>
        </div>
      </section>
    </div>}
    {notice && <div className="prototype-toast"><CheckCircle2 />{notice}</div>}
  </div>
}

// ---- EvaluationsModule ----
function StarRating({ value, onChange, disabled = false }: { value: number; onChange: (value: number) => void; disabled?: boolean }) { return <div className={`star-rating ${disabled ? 'star-rating--disabled' : ''}`}>{[1, 2, 3, 4, 5].map(star => <button disabled={disabled} aria-label={`${star} estrellas`} className={star <= value ? 'selected' : ''} onClick={() => onChange(star)} key={star}><Star /></button>)}</div> }

type CellMember = { coderId: string; name: string; role: string }
type RotationCells = { cells: { cellName: string; coders: CellMember[] }[] }

function EvaluationsModule() {
  const user = getCurrentUser()
  const [criteria, setCriteria] = useState<EvalCriterion[]>([])
  const [cellMembers, setCellMembers] = useState<CellMember[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const toast = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 2500) }

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    const clanName = user.clan ?? ''
    Promise.all([
      apiRequest<{ anonymous: boolean; criteria: EvalCriterion[] }>(`/evaluations/summary?coderId=${user.id}`),
      apiRequest<{ projects: ApiProjectMeta[] }>(`/projects?coderId=${user.id}`),
      clanName ? apiRequest<RotationCells>(`/rotation/cells?clanName=${encodeURIComponent(clanName)}`) : Promise.resolve<RotationCells | null>(null),
    ])
      .then(([evalData, projData, rotData]) => {
        setCriteria(evalData.criteria)
        const active = projData.projects.find(p => p.sprintStatus === 'active') ?? projData.projects[0]
        if (active) setProjectId(active.id)
        if (rotData) {
          const myCell = rotData.cells.find(c => c.cellName === user.cell)
          if (myCell) setCellMembers(myCell.coders.filter(m => m.coderId !== user.id))
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [user?.id, user?.clan, user?.cell])

  const avgScore = criteria.length > 0
    ? (criteria.reduce((sum, c) => sum + Number(c.average), 0) / criteria.length).toFixed(1)
    : '—'

  const ratedCount = Object.values(ratings).filter(v => v > 0).length
  const subjectName = cellMembers.find(m => m.coderId === selectedSubject)?.name ?? null
  const canSubmit = cellMembers.length === 0 || selectedSubject !== null

  const handleSubmit = async () => {
    if (!user?.id || !projectId) { toast('No hay proyecto activo para evaluar'); return }
    if (cellMembers.length > 0 && !selectedSubject) { toast('Selecciona a quién evalúas'); return }
    const scores = criteria
      .filter(c => (ratings[c.criterion] ?? 0) > 0)
      .map(c => ({ criterionId: c.criterionId, score: ratings[c.criterion], comment: null }))
    if (scores.length === 0) { toast('Selecciona al menos una valoración'); return }
    setSubmitting(true)
    try {
      await apiRequest('/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          ceremonyType: 'review',
          evaluatorUserId: user.id,
          projectId,
          subjectCoderId: selectedSubject ?? null,
          evalType: 'peer',
          scores,
        }),
      })
      if (selectedSubject) setSubmitted(prev => new Set([...prev, selectedSubject]))
      setRatings({})
      setSelectedSubject(null)
      toast(`Evaluación enviada · ${scores.length} criterio${scores.length !== 1 ? 's' : ''} registrado${scores.length !== 1 ? 's' : ''}`)
    } catch {
      toast('No se pudo enviar. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="vip-module">
    <div className="vip-section-title vip-section-title--action">
      <div>
        <p className="eyebrow">{loading ? 'Cargando…' : 'Evaluación entre compañeros'}</p>
        <h2>Califica a tu célula</h2>
        <p>De 1 a 5 estrellas por criterio. Anónimo para los coders; el TL ve los resultados del sprint.</p>
      </div>
      {ratedCount > 0 && canSubmit && <button className="primary-button" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Enviando…' : `Enviar${subjectName ? ` evaluación de ${subjectName.split(' ')[0]}` : ''} · ${ratedCount} ★`}
      </button>}
    </div>

    {cellMembers.length > 0 && (
      <div className="eval-member-list">
        <p className="eyebrow" style={{ padding: '0 0 8px' }}>¿A quién evalúas este sprint?</p>
        <div className="eval-member-chips">
          {cellMembers.map(m => (
            <button
              key={m.coderId}
              type="button"
              className={`eval-member-chip${selectedSubject === m.coderId ? ' eval-member-chip--active' : ''}${submitted.has(m.coderId) ? ' eval-member-chip--done' : ''}`}
              onClick={() => { if (!submitted.has(m.coderId)) { setSelectedSubject(m.coderId); setRatings({}) } }}
            >
              <span className="eval-member-chip__avatar">{m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
              <span>{m.name}</span>
              {m.role === 'leader' && <i>Líder</i>}
              {submitted.has(m.coderId) && <CheckCircle2 size={13} />}
            </button>
          ))}
        </div>
      </div>
    )}

    <div className="evaluation-layout">
      <section>
        {cellMembers.length > 0 && !selectedSubject && (
          <p style={{ color: 'var(--fg-muted)', padding: '1rem' }}>Selecciona un compañero para comenzar la evaluación.</p>
        )}
        {criteria.length === 0 && !loading && cellMembers.length === 0 && (
          <p style={{ color: 'var(--fg-muted)', padding: '1rem' }}>No hay criterios de evaluación configurados.</p>
        )}
        {(cellMembers.length === 0 || selectedSubject) && criteria.map(criterion => (
          <article key={criterion.criterionId} className="evaluation-card evaluation-card--ready">
            <div className="evaluation-card__icon"><Trophy /></div>
            <div className="evaluation-card__main">
              <small>{criterion.scope}</small>
              <h3>{criterion.criterion}</h3>
              <div><span>Promedio del grupo</span><strong>{Number(criterion.average).toFixed(1)} / 5</strong></div>
              <i><b style={{ width: `${Number(criterion.average) * 20}%` }} /></i>
            </div>
            <div className="evaluation-card__rating">
              {subjectName && <small>Califica a <strong>{subjectName.split(' ')[0]}</strong></small>}
              <StarRating value={ratings[criterion.criterion] ?? 0} onChange={value => setRatings(r => ({ ...r, [criterion.criterion]: value }))} />
              {(ratings[criterion.criterion] ?? 0) > 0 && <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>{ratings[criterion.criterion]} de 5 ★</span>}
            </div>
          </article>
        ))}
      </section>
      <aside>
        <Award />
        <p className="eyebrow">Tu promedio recibido</p>
        <h3>{avgScore}</h3>
        <div className="stars-static">★★★★★</div>
        <p>Así te han calificado tus compañeros de célula en el sprint.</p>
        {criteria.slice(0, 3).map(c => (
          <ul key={c.criterionId}><li><span>{c.criterion}</span><strong>{Number(c.average).toFixed(1)} / 5</strong></li></ul>
        ))}
        <small>Las identidades de los evaluadores son anónimas para los coders. El TL ve todos los resultados.</small>
      </aside>
    </div>
    {notice && <div className="prototype-toast"><CheckCircle2 />{notice}</div>}
  </div>
}

// ---- ProfileModule ----
function ProfileModule() {
  const user = getCurrentUser()
  const [profile, setProfile] = useState<CoderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatar, setAvatar] = useState<string>()
  const [bio, setBio] = useState('Coder full stack en formación. Me apasiona convertir ideas en productos claros, accesibles y útiles.')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    apiRequest<CoderProfile>(`/coders/${user.id}/profile`)
      .then(data => setProfile(data))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [user?.id])

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) { const reader = new FileReader(); reader.onload = () => setAvatar(String(reader.result)); reader.readAsDataURL(file) }
  }

  const name = profile?.coder.name ?? user?.fullName ?? 'Coder B612'
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Coder'
  const cell = user?.cell ?? 'Sin célula'
  const clan = user?.clan ?? profile?.coder.clan ?? 'Sin clan'
  const metrics = profile?.metrics
  const roses = metrics?.roses ?? 0
  const doneStories = metrics?.doneStories ?? 0
  const assignedStories = metrics?.assignedStories ?? 0
  const deliveryPct = assignedStories > 0 ? Math.round((doneStories / assignedStories) * 100) : 0
  const avgEval = metrics ? Number(metrics.averageEvaluation).toFixed(1) : '—'
  const leaderRuns = metrics?.leaderRuns ?? 0
  const sprintCount = profile?.history.length ?? 0

  return <div className="profile-universe">
    <section className="profile-identity">
      <div className="profile-cover" />
      <div className="profile-avatar-xl">
        {avatar ? <img src={avatar} alt={`Foto de perfil de ${name}`} /> : <span>{initials(name)}</span>}
        <label title="Cambiar foto"><Upload /><input type="file" accept="image/*" onChange={upload} /></label>
      </div>
      <div className="profile-identity__copy">
        <span>{loading ? 'Cargando…' : `${roleLabel} · Célula ${cell}`}</span>
        <h2>{name} <i>✦</i></h2>
        {editing ? <textarea value={bio} onChange={event => setBio(event.target.value)} /> : <p>{bio}</p>}
        <div>
          <button onClick={() => setEditing(!editing)}><Pencil />{editing ? 'Guardar perfil' : 'Editar perfil'}</button>
          <span><Medal /> {clan}</span>
        </div>
      </div>
      <div className="profile-score">
        <small>Promedio eval.</small>
        <strong>{avgEval}</strong>
        <span>Evaluaciones reales</span>
      </div>
    </section>

    <div className="profile-kpis">
      {[
        [avgEval !== '—' ? `${avgEval} / 5` : '—', 'Promedio eval.'],
        [`${sprintCount} sprint${sprintCount !== 1 ? 's' : ''}`, 'Participaciones'],
        [String(roses).padStart(2, '0'), 'Rosas ganadas'],
        [`${deliveryPct}%`, 'Entregas completadas'],
      ].map(([value, label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}
    </div>

    {profile?.history && profile.history.length > 0 && <section className="profile-history">
      <div className="passport-title"><div><p className="eyebrow">Historial</p><h2>Sprints y células</h2></div></div>
      <div className="profile-dims-v2">{profile.history.slice(0, 5).map((h, i) => <article key={i}>
        <div><span>Sprint {h.sprint} · {h.cell}</span><strong>{h.role}</strong></div>
        <small>{h.status}</small>
      </article>)}</div>
    </section>}

    {leaderRuns > 0 && <section className="achievement-strip">
      <div><p className="eyebrow">Logros reales</p><h3>Tu constelación sigue creciendo</h3></div>
      {leaderRuns > 0 && <article><span>🚀</span><div><strong>Líder de célula</strong><small>{leaderRuns} vez{leaderRuns !== 1 ? 'ces' : ''}</small></div></article>}
      {roses > 0 && <article><span>🌹</span><div><strong>Rosas ganadas</strong><small>{roses} reconocimiento{roses !== 1 ? 's' : ''}</small></div></article>}
      {doneStories > 0 && <article><span>⭐</span><div><strong>Historias completadas</strong><small>{doneStories} historia{doneStories !== 1 ? 's' : ''}</small></div></article>}
    </section>}
  </div>
}

// ---- Entry point ----
export function CoderSpaceModule({ slug }: { slug: string }) {
  const modules: Record<string, React.ReactNode> = {
    sprint: <SprintModule />,
    proyectos: <ProjectsModule />,
    tablero: <BoardModule />,
    documentacion: <DocsModule />,
    ceremonias: <CeremoniesModule />,
    evaluaciones: <EvaluationsModule />,
    perfil: <ProfileModule />,
  }
  return modules[slug] ?? null
}
