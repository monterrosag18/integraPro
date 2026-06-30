import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Clock3, ExternalLink, Flower2, GitBranch, History, Loader2, LockKeyhole, Orbit, Plus, Shuffle, Sparkles, Trash2, UserRoundCog, Users, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { DocumentationPanel } from '../../features/documentation/components/DocumentationPanel'
import { apiRequest } from '../../shared/api/httpClient'
import { getCurrentUser } from '../../shared/auth/session'
import { fetchGithubMeta, timeAgo, type GithubGist, type GithubMeta, type GithubOrg, type GithubRepo } from '../../shared/lib/github'
import { RoleShell } from '../../shared/components/layout/RoleShell'

type CellRow = { cell: string; clan: string; count: number; leader: string; color: string }
type SprintRow = { sprint: string; inicio: string; fin: string; estado: string }
type ModuleConfig = { title: string; eyebrow: string; columns: string[]; rows: string[][]; stats: string[][] }
type ClanResource = { id: string; type: 'gist' | 'org'; url: string; label: string | null; addedBy: string | null; addedAt: string }
type CellCoder = { coderId: string; name: string; role: string }
type RealSprint = { id: string; number: number; startDate: string; endDate: string; status: string; clan: string; projects: number; stories: number; doneStories: number; progress: number }
type RoseCellEntry = { id: string; cell: string; clan: string; roses: number }
type RoseCoderEntry = { id: string; name: string; email: string; roses: number }
type HealthIssue = { coderId: string; coder: string; sprint: number; cell: string; repeatedCell: boolean; repeatedLeader: boolean }

const colors = ['#a78bfa', '#fb7185', '#38bdf8', '#fbbf24', '#34d399', '#f97316']

function GistPreviewCard({ meta, url }: { meta: GithubGist; url: string }) {
  const preview = meta.firstFile.content.slice(0, 800)
  return <a className="gh-card gh-card--gist" href={url} target="_blank" rel="noreferrer">
    <div className="gh-card__header">
      <GitBranch size={14} />
      <strong>{meta.description || meta.firstFile.filename}</strong>
      <span className="gh-lang">Gist</span>
    </div>
    <article className="markdown-preview gh-gist-inline" style={{ maxHeight: '140px', overflow: 'hidden' }}>
      <ReactMarkdown>{preview}</ReactMarkdown>
    </article>
    <small className="gh-card__foot">@{meta.owner} · {timeAgo(meta.updatedAt)} <ExternalLink size={11} /></small>
  </a>
}

function OrgPreviewCard({ meta, url }: { meta: GithubOrg; url: string }) {
  return <a className="gh-card gh-card--org" href={url} target="_blank" rel="noreferrer">
    <div className="gh-card__header">
      {meta.avatarUrl && <img src={meta.avatarUrl} alt={meta.login} width={22} height={22} style={{ borderRadius: '50%' }} />}
      <strong>{meta.name ?? meta.login}</strong>
      <span className="gh-stars">{meta.publicRepos} repos públicos</span>
    </div>
    {meta.description && <p className="gh-card__desc">{meta.description}</p>}
    <small className="gh-card__foot">@{meta.login} <ExternalLink size={11} /></small>
  </a>
}

function RepoPreviewCard({ meta, url }: { meta: GithubRepo; url: string }) {
  return <a className="gh-card gh-card--repo" href={url} target="_blank" rel="noreferrer">
    <div className="gh-card__header">
      <GitBranch size={14} />
      <strong>{meta.fullName}</strong>
      {meta.language && <span className="gh-lang">{meta.language}</span>}
      {meta.stars > 0 && <span className="gh-stars">★ {meta.stars}</span>}
    </div>
    {meta.description && <p className="gh-card__desc">{meta.description}</p>}
    <small className="gh-card__foot">Actualizado {timeAgo(meta.updatedAt)} <ExternalLink size={11} /></small>
  </a>
}

export function TlDashboardPage() {
  const user = getCurrentUser()
  const [cells, setCells] = useState<CellRow[]>([])
  const [sprints, setSprints] = useState<SprintRow[]>([])
  const [coderNames, setCoderNames] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeSprint, setActiveSprint] = useState<SprintRow | null>(null)
  const [cellCoders, setCellCoders] = useState<Record<string, CellCoder[]>>({})
  const [changingLeader, setChangingLeader] = useState(false)
  const [resources, setResources] = useState<ClanResource[]>([])
  const [resMetas, setResMetas] = useState<Record<string, GithubMeta | null>>({})
  const [resUrl, setResUrl] = useState('')
  const [resType, setResType] = useState<'gist' | 'org'>('gist')
  const [resLabel, setResLabel] = useState('')
  const [resAdding, setResAdding] = useState(false)
  const [showResources, setShowResources] = useState(false)
  // Sprints reales
  const [clanId, setClanId] = useState<string | null>(null)
  const [activeCellSprintId, setActiveCellSprintId] = useState<string | null>(null)
  const [cellIds, setCellIds] = useState<Record<string, string>>({})
  const [realSprints, setRealSprints] = useState<RealSprint[]>([])
  const [showSprintSection, setShowSprintSection] = useState(false)
  const [showCreateSprint, setShowCreateSprint] = useState(false)
  const [sprintStart, setSprintStart] = useState('')
  const [sprintEnd, setSprintEnd] = useState('')
  const [sprintWorking, setSprintWorking] = useState(false)
  // Rosas
  const [roseLeaderboard, setRoseLeaderboard] = useState<{ cells: RoseCellEntry[]; coders: RoseCoderEntry[] } | null>(null)
  const [showRoses, setShowRoses] = useState(false)
  // Salud de rotación
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([])
  const [showHealth, setShowHealth] = useState(false)

  useEffect(() => {
    Promise.all([
      apiRequest<ModuleConfig>('/dashboard/module/tl/celulas'),
      apiRequest<ModuleConfig>('/dashboard/module/tl/sprints'),
    ])
      .then(([cellsData, sprintsData]) => {
        const parsedCells: CellRow[] = cellsData.rows.map((row, i) => ({
          cell: row[0] ?? `Célula ${i + 1}`,
          clan: user?.clan ?? 'Sin clan',
          count: Number(row[2]) || 0,
          leader: row[1] !== 'Sin lider' ? row[1] : 'Sin líder',
          color: colors[i % colors.length],
        }))
        setCells(parsedCells)

        const parsedSprints: SprintRow[] = sprintsData.rows.map(row => ({
          sprint: row[0] ?? '—',
          inicio: row[1] ?? '—',
          fin: row[2] ?? '—',
          estado: row[4] ?? '—',
        }))
        setSprints(parsedSprints)
        const active = parsedSprints.find(s => s.estado.toLowerCase() === 'active') ?? parsedSprints[0]
        setActiveSprint(active ?? null)

        const rotadores = cellsData.rows.flatMap(row => {
          const count = Number(row[2]) || 0
          return Array.from({ length: count }, (_, i) => `Coder ${i + 1}`)
        })
        setCoderNames(rotadores.slice(0, 16))
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))

    if (user?.clan) {
      fetchResources(user.clan)
      apiRequest<{ clanId: string | null; sprintId: string | null; cells: { cellId: string; cellName: string; coders: CellCoder[] }[] }>(`/rotation/cells?clanName=${encodeURIComponent(user.clan)}`)
        .then(({ clanId: cid, sprintId: sid, cells: rotCells }) => {
          const map: Record<string, CellCoder[]> = {}
          const idMap: Record<string, string> = {}
          rotCells.forEach(c => { map[c.cellName] = c.coders; idMap[c.cellName] = c.cellId })
          setCellCoders(map)
          setCellIds(idMap)
          if (cid) {
            setClanId(cid)
            apiRequest<{ sprints: RealSprint[] }>(`/sprints?clanId=${cid}`).then(r => setRealSprints(r.sprints)).catch(() => undefined)
            apiRequest<{ issues: HealthIssue[]; repeatedCells: number; repeatedLeaders: number }>(`/rotation/health?clanId=${cid}`)
              .then(r => setHealthIssues(r.issues)).catch(() => undefined)
          }
          if (sid) setActiveCellSprintId(sid)
        })
        .catch(() => undefined)
      apiRequest<{ cells: RoseCellEntry[]; coders: RoseCoderEntry[] }>('/roses/leaderboard')
        .then(r => setRoseLeaderboard(r)).catch(() => undefined)
    }
  }, [])

  const fetchResources = (clanName: string) => {
    apiRequest<{ resources: ClanResource[] }>(`/clan-resources?clanName=${encodeURIComponent(clanName)}`)
      .then(({ resources: rows }) => {
        setResources(rows)
        rows.forEach(r => {
          fetchGithubMeta(r.url).then(meta => {
            setResMetas(prev => ({ ...prev, [r.url]: meta }))
          })
        })
      })
      .catch(() => undefined)
  }

  const handleAddResource = async (e: FormEvent) => {
    e.preventDefault()
    if (!resUrl.trim() || !user?.clan || !user?.id) return
    setResAdding(true)
    try {
      await apiRequest('/clan-resources', {
        method: 'POST',
        body: JSON.stringify({ clanName: user.clan, userId: user.id, url: resUrl.trim(), type: resType, label: resLabel.trim() || null }),
      })
      setResUrl(''); setResLabel('')
      fetchResources(user.clan)
      toast('Recurso agregado al clan')
    } catch {
      toast('No se pudo guardar el recurso')
    } finally {
      setResAdding(false)
    }
  }

  const handleDeleteResource = async (id: string) => {
    await apiRequest(`/clan-resources/${id}`, { method: 'DELETE' }).catch(() => undefined)
    setResources(prev => prev.filter(r => r.id !== id))
  }

  const toast = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const shuffle = () => {
    setConfirmed(false)
    setCoderNames(current => [...current].sort(() => Math.random() - 0.5))
    toast('Coders sorteados sin repetir célula consecutiva')
  }

  const changeLeader = async (coder: CellCoder) => {
    if (!editingCell || !user?.clan) return
    setChangingLeader(true)
    try {
      await apiRequest('/rotation/leader', {
        method: 'PUT',
        body: JSON.stringify({ clanName: user.clan, cellName: editingCell, coderId: coder.coderId }),
      })
      setCells(current => current.map(cell => cell.cell === editingCell ? { ...cell, leader: coder.name } : cell))
      setCellCoders(prev => {
        const coders = prev[editingCell]?.map(c => ({
          ...c,
          role: c.coderId === coder.coderId ? 'leader' : c.role === 'leader' ? 'rotator' : c.role,
        })) ?? []
        return { ...prev, [editingCell]: coders }
      })
      setEditingCell(null)
      setConfirmed(false)
      toast(`${coder.name} ahora lidera ${editingCell}`)
    } catch {
      toast('No se pudo cambiar el líder. Intenta de nuevo.')
    } finally {
      setChangingLeader(false)
    }
  }

  const totalAssigned = cells.reduce((sum, c) => sum + c.count, 0)

  const createSprint = async (e: FormEvent) => {
    e.preventDefault()
    if (!clanId || !sprintStart || !sprintEnd) return
    setSprintWorking(true)
    try {
      const newSprint = await apiRequest<RealSprint>('/sprints', {
        method: 'POST',
        body: JSON.stringify({ clanId, startDate: sprintStart, endDate: sprintEnd }),
      })
      setRealSprints(prev => [newSprint, ...prev])
      setShowCreateSprint(false)
      setSprintStart(''); setSprintEnd('')
      toast('Sprint creado')
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'No se pudo crear el sprint'
      toast(msg)
    } finally {
      setSprintWorking(false)
    }
  }

  const closeSprint = async (id: string) => {
    setSprintWorking(true)
    try {
      const updated = await apiRequest<RealSprint>(`/sprints/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed', closedBy: user?.fullName ?? 'tl' }),
      })
      setRealSprints(prev => prev.map(s => s.id === id ? updated : s))
      toast('Sprint cerrado')
    } catch {
      toast('No se pudo cerrar el sprint')
    } finally {
      setSprintWorking(false)
    }
  }

  const extendSprint = async (id: string, days: number) => {
    setSprintWorking(true)
    try {
      const updated = await apiRequest<RealSprint>(`/sprints/${id}/extend`, {
        method: 'PATCH',
        body: JSON.stringify({ extraDays: days }),
      })
      setRealSprints(prev => prev.map(s => s.id === id ? updated : s))
      toast(`Sprint extendido ${days} día${days !== 1 ? 's' : ''}`)
    } catch {
      toast('No se pudo extender el sprint')
    } finally {
      setSprintWorking(false)
    }
  }

  const awardRose = async (cellId: string, cellName: string) => {
    const activeRealSprint = realSprints.find(s => s.status === 'active')
    const sprintIdToUse = activeRealSprint?.id ?? activeCellSprintId
    if (!sprintIdToUse) { toast('No hay sprint activo para otorgar rosas'); return }
    try {
      await apiRequest('/roses/award', {
        method: 'POST',
        body: JSON.stringify({ sprintId: sprintIdToUse, cellId, grantedByUserId: user?.id }),
      })
      toast(`🌹 Rosa otorgada a ${cellName}`)
      apiRequest<{ cells: RoseCellEntry[]; coders: RoseCoderEntry[] }>('/roses/leaderboard')
        .then(r => setRoseLeaderboard(r)).catch(() => undefined)
    } catch {
      toast('No se pudo otorgar la rosa')
    }
  }

  return <RoleShell role="TL" name={user?.fullName ?? 'TL B612'}>
    <header className="page-header page-header--premium">
      <div>
        <div className="hero-kicker"><Sparkles size={14} /> {activeSprint ? `${activeSprint.sprint} · ${user?.clan ?? 'Tu clan'}` : 'Gestión de rotación'}</div>
        <h1>Diseña la próxima tripulación</h1>
        <p>Los líderes permanecen anclados hasta que el TL decida cambiarlos.</p>
      </div>
      <div className="header-actions">
        <button className="ghost-small" onClick={() => setShowHistory(true)}><History size={16} /> Historial</button>
        <button className="primary-button" onClick={shuffle} disabled={loading}>
          {loading ? <Loader2 size={17} className="spin" /> : <Shuffle size={17} />} Sortear coders
        </button>
      </div>
    </header>

    <div className="rotation-summary">
      <div><Users /><span><strong>{totalAssigned}</strong> coders asignados</span></div>
      <div><Orbit /><span><strong>{String(cells.length).padStart(2, '0')}</strong> células visibles</span></div>
      <div><Clock3 /><span><strong>{activeSprint ? `hasta ${activeSprint.fin}` : 'Sin sprint activo'}</strong></span></div>
      <div className="rotation-valid"><CheckCircle2 /><span>Datos reales</span></div>
    </div>

    {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-muted)' }}><Loader2 className="spin" /> Cargando células desde la base de datos…</div>}

    {!loading && cells.length === 0 && <div style={{ padding: '2rem', color: 'var(--fg-muted)' }}>No hay células registradas para tu clan.</div>}

    <div className="rotation-grid rotation-grid--premium">{cells.map(({ cell, leader, color, count }, index) => {
      const rotadores = coderNames.slice(index * 3, index * 3 + Math.min(3, count))
      return <article className="cell-card cell-card--premium" key={cell} style={{ '--cell-color': color } as React.CSSProperties}>
        <div className="cell-card__visual"><div className="cell-planet"><Orbit /></div><span>0{index + 1}</span></div>
        <div className="cell-card__header">
          <div><small>CÉLULA</small><h3>{cell}</h3></div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {cellIds[cell] && (realSprints.find(s => s.status === 'active') || activeCellSprintId) && (
              <button title="Dar rosa a esta célula" onClick={() => awardRose(cellIds[cell], cell)} style={{ padding: '0.25rem' }}><Flower2 size={15} /></button>
            )}
            <button title="Cambiar líder" onClick={() => setEditingCell(cell)}><UserRoundCog size={17} /></button>
          </div>
        </div>
        <div className="leader-row">
          <span><LockKeyhole size={14} /></span>
          <div><small>LÍDER ANCLADO</small><strong>{leader}</strong></div>
        </div>
        <div className="crew-list">{rotadores.map((name, position) => <div className="coder-row" key={`${cell}-${position}`}>
          <span style={{ background: `linear-gradient(135deg,${color},#31244f)` }}>{name[0]}</span>
          <div><strong>{name}</strong><small>Rotador {position + 1}</small></div>
          <i>::</i>
        </div>)}
        {count > 3 && <div className="coder-row"><span style={{ background: color }}>+</span><div><strong>{count - 3} más</strong><small>En base de datos</small></div></div>}
        </div>
      </article>
    })}</div>

    <div className={`confirm-bar confirm-bar--premium ${confirmed ? 'is-confirmed' : ''}`}>
      <div>
        {confirmed ? <CheckCircle2 /> : <Sparkles />}
        <span>
          <strong>{confirmed ? 'Rotación confirmada' : 'Distribución lista para revisar'}</strong>
          <small>Datos reales del VPS · {cells.length} células · {totalAssigned} coders</small>
        </span>
      </div>
      <button className="primary-button" onClick={() => { setConfirmed(true); toast(`Rotación confirmada para ${activeSprint?.sprint ?? 'el sprint activo'}`) }}>
        {confirmed ? 'Confirmada ✓' : 'Confirmar rotación'}
      </button>
    </div>

    {/* Sprint management */}
    <section className="tl-management-section">
      <div className="tl-management-section__header">
        <div>
          <p className="eyebrow">Gestión · {user?.clan ?? ''}</p>
          <h2>Sprints</h2>
        </div>
        <div className="header-actions">
          {clanId && <button className="ghost-small" onClick={() => { setShowCreateSprint(f => !f); setShowSprintSection(true) }}>
            <Plus size={15} /> Nuevo sprint
          </button>}
          <button className="ghost-small" onClick={() => setShowSprintSection(f => !f)}>
            {showSprintSection ? <ChevronUp size={15} /> : <ChevronDown size={15} />} {showSprintSection ? 'Ocultar' : 'Ver sprints'}
          </button>
        </div>
      </div>

      {showCreateSprint && <form onSubmit={createSprint} className="gh-add-form gh-add-form--full" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
          Inicio
          <input type="date" value={sprintStart} onChange={e => setSprintStart(e.target.value)} required disabled={sprintWorking} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
          Fin
          <input type="date" value={sprintEnd} onChange={e => setSprintEnd(e.target.value)} required disabled={sprintWorking} />
        </label>
        <button type="submit" className="primary-button" disabled={sprintWorking || !sprintStart || !sprintEnd}>
          <CalendarDays size={15} /> {sprintWorking ? 'Guardando…' : 'Crear sprint'}
        </button>
        <button type="button" className="ghost-small" onClick={() => setShowCreateSprint(false)}>Cancelar</button>
      </form>}

      {showSprintSection && realSprints.length === 0 && <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No hay sprints registrados para este clan.</p>}

      {showSprintSection && realSprints.length > 0 && <div className="sprint-list-real">
        {realSprints.slice(0, 6).map(sprint => <div key={sprint.id} className={`sprint-real-row ${sprint.status === 'active' ? 'sprint-real-row--active' : ''}`}>
          <div className="sprint-real-row__info">
            <strong>Sprint {sprint.number}</strong>
            <span>{sprint.startDate} → {sprint.endDate}</span>
            <small className={`sprint-badge sprint-badge--${sprint.status}`}>{sprint.status}</small>
            {sprint.stories > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{sprint.doneStories}/{sprint.stories} HU · {sprint.progress}%</span>}
            {sprint.projects > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{sprint.projects} proy.</span>}
          </div>
          <div className="sprint-real-row__actions">
            {sprint.status === 'active' && <>
              <button className="ghost-small" onClick={() => closeSprint(sprint.id)} disabled={sprintWorking}>Cerrar</button>
              <button className="ghost-small" onClick={() => extendSprint(sprint.id, 7)} disabled={sprintWorking}>+7 días</button>
            </>}
            {sprint.status !== 'active' && <button className="ghost-small" onClick={() => extendSprint(sprint.id, 7)} disabled={sprintWorking}>Reabrir +7d</button>}
          </div>
        </div>)}
      </div>}
    </section>

    {/* Roses leaderboard */}
    {roseLeaderboard && <section className="tl-management-section">
      <div className="tl-management-section__header">
        <div>
          <p className="eyebrow">Reconocimiento del sprint</p>
          <h2><Flower2 size={18} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />La Rosa · Leaderboard</h2>
        </div>
        <button className="ghost-small" onClick={() => setShowRoses(f => !f)}>
          {showRoses ? <ChevronUp size={15} /> : <ChevronDown size={15} />} {showRoses ? 'Ocultar' : 'Ver ranking'}
        </button>
      </div>
      {showRoses && <div className="roses-leaderboard-grid">
        <div>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.5rem' }}>Top células</h3>
          {roseLeaderboard.cells.length === 0 && <p style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>Sin rosas aún.</p>}
          {roseLeaderboard.cells.slice(0, 5).map((entry, i) => <div key={entry.id} className="rose-leaderboard-row">
            <span className="rose-rank">#{i + 1}</span>
            <div><strong>{entry.cell}</strong><small>{entry.clan}</small></div>
            <span className="rose-count">🌹 {entry.roses}</span>
          </div>)}
        </div>
        <div>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '0.5rem' }}>Top coders</h3>
          {roseLeaderboard.coders.length === 0 && <p style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>Sin rosas aún.</p>}
          {roseLeaderboard.coders.slice(0, 5).map((entry, i) => <div key={entry.id} className="rose-leaderboard-row">
            <span className="rose-rank">#{i + 1}</span>
            <div><strong>{entry.name}</strong><small>{entry.email}</small></div>
            <span className="rose-count">🌹 {entry.roses}</span>
          </div>)}
        </div>
      </div>}
    </section>}

    {/* Rotation health */}
    {healthIssues.length > 0 && <section className="tl-management-section">
      <div className="tl-management-section__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} style={{ color: '#fbbf24' }} />
          <div>
            <p className="eyebrow">Validación de rotación</p>
            <h2>Alertas de asignación</h2>
          </div>
        </div>
        <button className="ghost-small" onClick={() => setShowHealth(f => !f)}>
          {showHealth ? <ChevronUp size={15} /> : <ChevronDown size={15} />} {healthIssues.length} alerta{healthIssues.length !== 1 ? 's' : ''}
        </button>
      </div>
      {showHealth && <div className="health-issues-list">
        {healthIssues.slice(0, 10).map((issue, i) => <div key={i} className="health-issue-row">
          <div><strong>{issue.coder}</strong><small>Sprint {issue.sprint} · {issue.cell}</small></div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {issue.repeatedCell && <span className="health-badge health-badge--cell">Célula repetida</span>}
            {issue.repeatedLeader && <span className="health-badge health-badge--leader">Líder repetido</span>}
          </div>
        </div>)}
        {healthIssues.length > 10 && <p style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', padding: '0.25rem' }}>…y {healthIssues.length - 10} más</p>}
      </div>}
    </section>}

    <section className="clan-resources-section">
      <div className="clan-resources-section__header">
        <div>
          <p className="eyebrow">Recursos del clan · {user?.clan ?? ''}</p>
          <h2>Gists y organizaciones</h2>
          <p>Comparte gists de trabajo y orgs de GitHub para que todos los coders los vean.</p>
        </div>
        <button className="ghost-small" onClick={() => setShowResources(r => !r)}>
          {showResources ? 'Cerrar' : <><GitBranch size={15} /> Gestionar recursos</>}
        </button>
      </div>

      {showResources && <form onSubmit={handleAddResource} className="gh-add-form gh-add-form--full">
        <select value={resType} onChange={e => setResType(e.target.value as 'gist' | 'org')}>
          <option value="gist">Gist (instrucciones del sprint)</option>
          <option value="org">Organización GitHub</option>
        </select>
        <input type="url" value={resUrl} onChange={e => setResUrl(e.target.value)}
          placeholder={resType === 'gist' ? 'https://gist.github.com/usuario/id' : 'https://github.com/organizacion'}
          disabled={resAdding} />
        <input type="text" value={resLabel} onChange={e => setResLabel(e.target.value)}
          placeholder="Etiqueta opcional" disabled={resAdding} style={{ maxWidth: '180px' }} />
        <button type="submit" className="primary-button" disabled={resAdding || !resUrl.trim()}>
          <Plus size={15} /> {resAdding ? 'Guardando…' : 'Agregar'}
        </button>
      </form>}

      {resources.length > 0 && <div className="clan-resources-list">
        {resources.map(r => {
          const meta = resMetas[r.url]
          return <div key={r.id} className="clan-resource-row">
            <div className="clan-resource-row__preview">
              {meta?.type === 'gist' && <GistPreviewCard meta={meta} url={r.url} />}
              {meta?.type === 'org' && <OrgPreviewCard meta={meta} url={r.url} />}
              {meta?.type === 'repo' && <RepoPreviewCard meta={meta} url={r.url} />}
              {!meta && <a href={r.url} target="_blank" rel="noreferrer" className="gh-card gh-card--loading">
                <GitBranch size={14} /><span>{r.label ?? r.url}</span>
                <small>{r.type} · {r.addedBy ?? 'TL'}</small>
              </a>}
            </div>
            <button className="icon-button" title="Eliminar" onClick={() => handleDeleteResource(r.id)}>
              <Trash2 size={15} />
            </button>
          </div>
        })}
      </div>}

      {resources.length === 0 && !showResources && <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        Sin recursos todavía. Usa «Gestionar recursos» para agregar un Gist o una org.
      </p>}
    </section>

    <DocumentationPanel />

    {editingCell && <div className="modal-backdrop" onMouseDown={() => setEditingCell(null)}>
      <section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}>
        <button type="button" className="prototype-modal-close" onClick={() => setEditingCell(null)}><X /></button>
        <p className="eyebrow">Control del TL</p>
        <h2>Cambiar líder de {editingCell}</h2>
        {changingLeader && <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}><Loader2 size={14} className="spin" /> Actualizando…</p>}
        {!changingLeader && (cellCoders[editingCell] ?? []).map(coder => <button
          type="button"
          className="leader-picker-row"
          key={coder.coderId}
          disabled={coder.role === 'leader'}
          onClick={() => changeLeader(coder)}
        >
          <UserRoundCog size={16} /><span>{coder.name}</span>
          <small>{coder.role === 'leader' ? 'Líder actual' : 'Rotador'}</small>
        </button>)}
        {!changingLeader && (cellCoders[editingCell] ?? []).length === 0 && <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Sin coders en esta célula.</p>}
      </section>
    </div>}

    {showHistory && <div className="modal-backdrop" onMouseDown={() => setShowHistory(false)}>
      <section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}>
        <button type="button" className="prototype-modal-close" onClick={() => setShowHistory(false)}><X /></button>
        <p className="eyebrow">Historial de sprints</p>
        <h2>Últimos registros</h2>
        {sprints.slice(0, 6).map(s => <article className="history-row" key={s.sprint}>
          <History size={16} />
          <span>{s.sprint} · {s.inicio} → {s.fin} · {s.estado}</span>
        </article>)}
        <div><button className="primary-button" onClick={() => setShowHistory(false)}>Entendido</button></div>
      </section>
    </div>}

    {notice && <div className="prototype-toast"><CheckCircle2 />{notice}</div>}
  </RoleShell>
}
