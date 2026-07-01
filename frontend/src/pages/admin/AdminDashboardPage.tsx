import { ArrowUpRight, Building2, GraduationCap, Orbit, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../shared/api/httpClient'
import { getCurrentUser } from '../../shared/auth/session'
import { RoleShell } from '../../shared/components/layout/RoleShell'

type Summary = { campuses: number; cohorts: number; clans: number; cells: number; coders: number; tls: number; activeSprints: number; projects: number; stories: number }
type CohortRow = { cohort: string; campus: string; clans: number; coders: number; status: string }
type Overview = { cohorts: CohortRow[] }
type Campus = { id: string; name: string }
type Cohort = { id: string; name: string; campusId: string; campusName?: string; campus?: string }
type CreateCohortResponse = Cohort

export function AdminDashboardPage() {
  const user = getCurrentUser()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCampus, setFormCampus] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [overview, setOverview] = useState<Overview>({ cohorts: [] })
  const [campuses, setCampuses] = useState<Campus[]>([])

  useEffect(() => {
    void apiRequest<Campus[]>('/Campus').then(async campusRows => {
      setCampuses(campusRows)
      if (campusRows[0]) setFormCampus(campusRows[0].id)
      const cohortGroups = await Promise.all(
        campusRows.map(campus => apiRequest<Cohort[]>(`/cohorts?campusId=${campus.id}`).catch(() => [] as Cohort[])),
      )
      const cohorts = cohortGroups.flat()
      setOverview({
        cohorts: cohorts.map(cohort => ({
          cohort: cohort.name,
          campus: cohort.campusName ?? campusRows.find(campus => campus.id === cohort.campusId)?.name ?? 'Campus',
          clans: 0,
          coders: 0,
          status: 'Activa',
        })),
      })
      setSummary({
        campuses: campusRows.length,
        cohorts: cohorts.length,
        clans: 0,
        cells: 0,
        coders: 0,
        tls: 0,
        activeSprints: 0,
        projects: 0,
        stories: 0,
      })
    }).catch(() => undefined)
  }, [])

  const toast = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(''), 2400)
  }

  const handleCreateCohort = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formName.trim()) { setFormError('Ingresa un nombre para la cohorte.'); return }
    setSaving(true)
    setFormError('')
    try {
      const result = await apiRequest<CreateCohortResponse>('/cohorts', {
        method: 'POST',
        body: JSON.stringify({ name: formName.trim(), campusId: formCampus }),
      })
      setOverview(prev => ({
        cohorts: [{ cohort: result.name, campus: result.campusName ?? result.campus ?? 'Campus', clans: 0, coders: 0, status: 'Preparación' }, ...prev.cohorts]
      }))
      setSummary(prev => prev ? { ...prev, cohorts: prev.cohorts + 1 } : prev)
      setShowCreate(false)
      setFormName('')
      toast(`Cohorte "${result.name}" creada`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo crear la cohorte.')
    } finally {
      setSaving(false)
    }
  }

  const metrics = [
    { value: String(summary?.campuses ?? '—').padStart(2, '0'), label: 'Campus', detail: `${summary?.tls ?? '—'} TL registrados`, icon: Building2, color: 'violet' },
    { value: String(summary?.cohorts ?? '—').padStart(2, '0'), label: 'Cohortes', detail: 'Datos desde PostgreSQL', icon: GraduationCap, color: 'coral' },
    { value: String(summary?.clans ?? '—').padStart(2, '0'), label: 'Clanes', detail: `${summary?.cells ?? '—'} células`, icon: Orbit, color: 'cyan' },
    { value: String(summary?.coders ?? '—'), label: 'Coders', detail: `${summary?.projects ?? '—'} proyectos activos`, icon: Users, color: 'mint' },
  ]

  return (
    <RoleShell role="Admin" name={user?.fullName ?? 'Admin B612'}>
      <header className="page-header page-header--premium">
        <div><p className="eyebrow">Pulso de la organización</p><h1>Centro de control</h1><p>Una lectura clara de todo el universo académico conectada a la base real.</p></div>
        <button className="primary-button" onClick={() => { setFormError(''); setShowCreate(true) }}><Plus size={17} /> Crear cohorte</button>
      </header>

      <div className="metric-grid metric-grid--premium">{metrics.map(({ icon: Icon, ...metric }) => <article className={`metric-card metric-card--${metric.color}`} key={metric.label}><div><Icon /><span>DB real</span></div><strong>{metric.value}</strong><h3>{metric.label}</h3><p>{metric.detail}</p></article>)}</div>

      <div className="admin-grid">
        <section className="data-panel data-panel--premium">
          <div className="section-heading"><div><p className="eyebrow">Estructura</p><h2>Cohortes recientes</h2></div><Link className="text-button" to="/app/admin/cohortes">Ver todas <ArrowUpRight size={16} /></Link></div>
          <table><thead><tr><th>Cohorte</th><th>Campus</th><th>Clanes</th><th>Coders</th><th>Estado</th></tr></thead>
            <tbody>
              {overview.cohorts.map(row => <tr key={`${row.cohort}-${row.campus}`} style={{ cursor: 'pointer' }} onClick={() => navigate('/app/admin/cohortes')}>
                <td><b>{row.cohort}</b><small>Base real</small></td>
                <td>{row.campus}</td><td>{row.clans}</td><td>{row.coders}</td>
                <td><span className={row.status === 'Activa' ? 'badge badge--green' : 'badge badge--gold'}>{row.status}</span></td>
              </tr>)}
            </tbody>
          </table>
        </section>

        <aside className="activity-card">
          <div><p className="eyebrow">Actividad</p><h2>Ritmo semanal</h2></div>
          <div className="bar-chart">{[
            summary?.activeSprints ?? 0,
            summary?.projects ?? 0,
            summary?.clans ?? 0,
            summary?.cells ?? 0,
            summary?.coders ?? 0,
            summary?.cohorts ?? 0,
            summary?.campuses ?? 0,
          ].map((value, index) => {
            const max = Math.max(summary?.coders ?? 1, 1)
            return <span key={index} style={{ height: `${Math.max(8, Math.min(100, (value / max) * 100))}%` }}><i /></span>
          })}</div>
          <div className="chart-labels"><span>Sprints</span><span>Proyectos</span><span>Clanes</span><span>Células</span><span>Coders</span><span>Cohortes</span><span>Campus</span></div>
          <div className="activity-stat"><strong>{summary?.stories ?? '—'}</strong><span>historias registradas</span></div>
        </aside>
      </div>

      {showCreate && <div className="modal-backdrop" onMouseDown={() => setShowCreate(false)}>
        <form className="modal-card" onMouseDown={event => event.stopPropagation()} onSubmit={event => void handleCreateCohort(event)}>
          <p className="eyebrow">Nueva estructura</p>
          <h2>Crear cohorte</h2>
          <label>Nombre<input value={formName} onChange={e => setFormName(e.target.value)} placeholder={`Cohorte ${overview.cohorts.length + 1}`} /></label>
          <label>Campus
            <select value={formCampus} onChange={e => setFormCampus(e.target.value)}>
              {campuses.length > 0
                ? campuses.map(campus => <option key={campus.id} value={campus.id}>{campus.name}</option>)
                : <option>Cargando campus…</option>}
            </select>
          </label>
          {formError && <p className="dashboard-error" style={{ margin: '4px 0' }}>{formError}</p>}
          <div>
            <button type="button" className="ghost-small" onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Crear cohorte'}</button>
          </div>
        </form>
      </div>}

      {notice && <div className="prototype-toast"><ArrowUpRight size={17} />{notice}</div>}
    </RoleShell>
  )
}

