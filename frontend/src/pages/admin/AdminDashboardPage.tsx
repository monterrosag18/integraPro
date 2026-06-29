import { ArrowUpRight, Building2, GraduationCap, Orbit, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../shared/api/httpClient'
import { RoleShell } from '../../shared/components/layout/RoleShell'

type Summary = { campuses: number; cohorts: number; clans: number; cells: number; coders: number; tls: number; activeSprints: number; projects: number; stories: number }
type Overview = { cohorts: Array<{ cohort: string; campus: string; clans: number; coders: number; status: string }> }

export function AdminDashboardPage() {
  const[showCreate,setShowCreate]=useState(false)
  const[created,setCreated]=useState(false)
  const[notice,setNotice]=useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [overview, setOverview] = useState<Overview>({ cohorts: [] })

  useEffect(() => {
    void Promise.all([
      apiRequest<Summary>('/dashboard/summary'),
      apiRequest<Overview>('/dashboard/admin-overview')
    ]).then(([summaryData, overviewData]) => {
      setSummary(summaryData)
      setOverview(overviewData)
    }).catch(() => undefined)
  }, [])

  const metrics = [
    {value:String(summary?.campuses ?? '—').padStart(2,'0'),label:'Campus',detail:`${summary?.tls ?? '—'} TL registrados`,icon:Building2,color:'violet'},
    {value:String(summary?.cohorts ?? '—').padStart(2,'0'),label:'Cohortes',detail:'Datos desde PostgreSQL',icon:GraduationCap,color:'coral'},
    {value:String(summary?.clans ?? '—').padStart(2,'0'),label:'Clanes',detail:`${summary?.cells ?? '—'} células`,icon:Orbit,color:'cyan'},
    {value:String(summary?.coders ?? '—'),label:'Coders',detail:`${summary?.projects ?? '—'} proyectos activos`,icon:Users,color:'mint'}
  ]

  return <RoleShell role="Admin" name="Ana Admin"><header className="page-header page-header--premium"><div><p className="eyebrow">Pulso de la organización</p><h1>Centro de control</h1><p>Una lectura clara de todo el universo académico conectada a la base real.</p></div><button className="primary-button" onClick={()=>setShowCreate(true)}><Plus size={17}/> Crear cohorte</button></header><div className="metric-grid metric-grid--premium">{metrics.map(({icon:Icon,...metric})=><article className={`metric-card metric-card--${metric.color}`} key={metric.label}><div><Icon/><span>DB real</span></div><strong>{metric.value}</strong><h3>{metric.label}</h3><p>{metric.detail}</p></article>)}</div><div className="admin-grid"><section className="data-panel data-panel--premium"><div className="section-heading"><div><p className="eyebrow">Estructura</p><h2>Cohortes recientes</h2></div><Link className="text-button" to="/app/admin/cohortes">Ver todas <ArrowUpRight size={16}/></Link></div><table><thead><tr><th>Cohorte</th><th>Campus</th><th>Clanes</th><th>Coders</th><th>Estado</th></tr></thead><tbody>{overview.cohorts.map(row=><tr key={`${row.cohort}-${row.campus}`} onClick={()=>{setNotice(`${row.cohort} · ${row.coders} coders · ${row.status}`);setTimeout(()=>setNotice(''),2200)}}><td><b>{row.cohort}</b><small>Base b612</small></td><td>{row.campus}</td><td>{row.clans}</td><td>{row.coders}</td><td><span className={row.status==='Activa'?'badge badge--green':'badge badge--gold'}>{row.status}</span></td></tr>)}{created&&<tr><td><b>Cohorte nueva</b><small>Prototipo local visual</small></td><td>Medellín</td><td>0</td><td>0</td><td><span className="badge badge--gold">Preparación</span></td></tr>}</tbody></table></section><aside className="activity-card"><div><p className="eyebrow">Actividad</p><h2>Ritmo semanal</h2></div><div className="bar-chart">{[42,68,54,82,73,91,64].map((height,index)=><span key={index} style={{height:`${height}%`}}><i/></span>)}</div><div className="chart-labels"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div className="activity-stat"><strong>{summary?.stories ?? '—'}</strong><span>historias registradas</span></div></aside></div>{showCreate&&<div className="modal-backdrop" onMouseDown={()=>setShowCreate(false)}><form className="modal-card" onMouseDown={event=>event.stopPropagation()} onSubmit={event=>{event.preventDefault();setCreated(true);setShowCreate(false);setNotice('Cohorte creada en prototipo local');setTimeout(()=>setNotice(''),2200)}}><p className="eyebrow">Nueva estructura</p><h2>Crear cohorte</h2><label>Nombre<input defaultValue="Cohorte 8"/></label><label>Campus<select><option>Medellín</option><option>Barranquilla</option></select></label><label>Fecha de inicio<input type="date"/></label><div><button type="button" className="ghost-small" onClick={()=>setShowCreate(false)}>Cancelar</button><button className="primary-button">Crear cohorte</button></div></form></div>}{notice&&<div className="prototype-toast"><ArrowUpRight size={17}/>{notice}</div>}</RoleShell>
}
