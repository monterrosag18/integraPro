import { ArrowUpRight, Filter, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { DocumentationPanel } from '../../features/documentation/components/DocumentationPanel'
import { apiRequest } from '../../shared/api/httpClient'
import { getCurrentUser } from '../../shared/auth/session'
import { RoleShell } from '../../shared/components/layout/RoleShell'

type Role = 'Admin' | 'TL' | 'Líder'
type Config = {
  title: string
  eyebrow: string
  description: string
  columns: string[]
  rows: string[][]
  stats: string[][]
}

const shells: Record<string, Config> = {
  'admin/campus': emptyConfig('Campus', 'Estructura academica', 'Sedes desde donde se organizan cohortes, clanes y coders.', ['Campus', 'Ciudad', 'Cohortes', 'Coders', 'Estado']),
  'admin/cohortes': emptyConfig('Cohortes', 'Organizacion', 'Consulta y organiza los grupos activos de cada campus.', ['Cohorte', 'Campus', 'Clanes', 'Coders', 'Estado']),
  'admin/clanes': emptyConfig('Clanes', 'Estructura academica', 'Clanes, celulas y TL responsables por cohorte.', ['Clan', 'Cohorte', 'TL', 'Celulas', 'Estado']),
  'admin/usuarios': emptyConfig('Usuarios', 'Identidad y acceso', 'Administra cuentas, roles y estado de acceso.', ['Nombre', 'Correo', 'Rol', 'Contexto', 'Estado']),
  'admin/criterios': emptyConfig('Criterios de evaluacion', 'Calidad de datos', 'Catalogo configurable para evaluar proyectos y personas.', ['Criterio', 'Alcance', 'Uso', 'Scores', 'Estado']),
  'tl/resumen': emptyConfig('Pulso del clan', 'Resumen real', 'Vista consolidada de clanes, celulas y avance.', ['Clan', 'Celulas', 'Sprints', 'Historias', 'Estado']),
  'tl/sprints': emptyConfig('Sprints', 'Calendario del clan', 'Configura fechas y controla el ciclo completo de cada sprint.', ['Sprint', 'Inicio', 'Fin', 'Clanes/Celulas', 'Estado']),
  'tl/celulas': emptyConfig('Celulas', 'Tripulaciones', 'Consulta lideres, rotadores y proyectos del sprint activo.', ['Celula', 'Lider', 'Rotadores', 'Proyecto', 'Avance']),
  'tl/evaluaciones': emptyConfig('Evaluaciones', 'Empleabilidad', 'Seguimiento agregado de reviews y retrospectivas.', ['Tipo', 'Sujeto', 'Scores', 'Promedio', 'Estado']),
  'tl/rosa': emptyConfig('La Rosa', 'Reconocimiento', 'Consulta el historial real de rosas del sprint.', ['Sprint', 'Celula ganadora', 'Clan', 'Coders reconocidos', 'Estado']),
  'tl/documentacion': emptyConfig('Documentacion del clan', 'README compartido', 'Publica lineamientos Markdown visibles para todas las celulas.', ['Documento', 'Alcance', 'Autor', 'Version', 'Estado']),
  'leader/proyecto': emptyConfig('Proyecto de la celula', 'Trabajo real', 'Informacion general, repositorio y entregables del sprint.', ['Proyecto', 'Celula', 'Sprint', 'Historias', 'Estado']),
  'leader/backlog': emptyConfig('Backlog', 'Historias de usuario', 'Historias reales que alimentan el tablero de la celula.', ['Historia', 'Titulo', 'Prioridad', 'Estimacion', 'Responsable']),
  'leader/ceremonias': emptyConfig('Ceremonias', 'Ciclo Scrum', 'Planning, review y retrospectiva del proyecto.', ['Ceremonia', 'Fecha', 'Proyecto', 'Evidencia', 'Estado']),
  'leader/evaluaciones': emptyConfig('Evaluaciones', 'Retroalimentacion', 'Evaluaciones reales sin revelar identidades.', ['Evaluacion', 'Sujeto', 'Criterios', 'Promedio', 'Estado']),
}

function emptyConfig(title: string, eyebrow: string, description: string, columns: string[]): Config {
  return { title, eyebrow, description, columns, rows: [], stats: [] }
}

export function PrototypeModulePage({ role }: { role: Role }) {
  const { section } = useParams()
  const roleKey = role === 'Líder' ? 'leader' : role.toLowerCase()
  const key = `${roleKey}/${section || 'resumen'}`
  const shell = shells[key]
  const [config, setConfig] = useState<Config | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState<string[] | null>(null)

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    setConfig(null)
    apiRequest<Config>(`/dashboard/module/${roleKey}/${section || 'resumen'}`)
      .then(payload => setConfig(payload))
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la vista real.')
        setConfig(shell ?? null)
      })
      .finally(() => setLoading(false))
  }, [roleKey, section, shell])

  const current = config ?? shell
  const rows = current?.rows ?? []
  const filtered = useMemo(
    () => rows.filter(row => row.join(' ').toLowerCase().includes(query.toLowerCase())),
    [query, rows]
  )

  if (!current) return <Navigate to={`/app/${roleKey}`} replace />

  const sessionUser = getCurrentUser()
  const name = sessionUser?.fullName ?? (role === 'Admin' ? 'Admin B612' : role === 'TL' ? 'TL B612' : 'Líder B612')
  const stats = current.stats.length ? current.stats : [['...', loading ? 'Cargando VPS' : 'Sin datos']]
  return (
    <RoleShell role={role} name={name}>
      <header className="prototype-header">
        <div>
          <p className="eyebrow">{current.eyebrow}</p>
          <h1>{current.title}</h1>
          <p>{current.description}</p>
          {loadError && <p className="dashboard-error">{loadError}</p>}
        </div>
      </header>

      <div className="prototype-stats">
        {stats.map(([value, label]) => (
          <article key={label}><Sparkles /><strong>{value}</strong><span>{label}</span></article>
        ))}
      </div>

      <section className="prototype-table-card">
        <div className="prototype-toolbar">
          <label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar en ${current.title.toLowerCase()}...`} /></label>
          <button onClick={() => setQuery('')}><Filter /> Limpiar filtros</button>
          <span>{loading ? 'Cargando...' : `${filtered.length} registros reales`}</span>
        </div>

        <div className="prototype-table-scroll">
          <table className="prototype-table">
            <thead><tr>{current.columns.map(column => <th key={column}>{column}</th>)}<th /></tr></thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr key={`${row[0]}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cellIndex === row.length - 1 ? <span className="prototype-status"><i />{cell}</span> : cell}</td>
                  ))}
                  <td><button onClick={() => setSelected(row)}>Ver <ArrowUpRight /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <div className="prototype-empty">No hay registros reales para esta vista o filtro.</div>}
      </section>

      {key === 'tl/documentacion' && <DocumentationPanel />}

      {selected && (
        <div className="modal-backdrop" onMouseDown={() => setSelected(null)}>
          <section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}>
            <button type="button" className="prototype-modal-close" onClick={() => setSelected(null)}><X /></button>
            <p className="eyebrow">{current.title}</p>
            <h2>{selected[0]}</h2>
            <div className="record-detail-list">
              {current.columns.map((column, index) => <article key={column}><span>{column}</span><strong>{selected[index] ?? '-'}</strong></article>)}
            </div>
            <div>
              <button className="ghost-small" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

    </RoleShell>
  )
}
