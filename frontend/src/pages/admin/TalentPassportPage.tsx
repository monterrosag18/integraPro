import { ArrowUpRight, BarChart3, Flame, Gauge, GitBranch, Medal, Search, ShieldAlert, Sparkles, Trophy, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../shared/api/httpClient'
import { RoleShell } from '../../shared/components/layout/RoleShell'

type ViewKey = 'general' | 'comparador' | 'student' | 'celula' | 'heatmap'
type DimensionKey = 'technical' | 'delivery' | 'collaboration' | 'professional' | 'achievements' | 'continuous'
type TalentCoder = { rank: number; id?: string; name: string; email?: string; cell: string; clan?: string; score: number; tier: 'Bajo' | 'Medio' | 'Alto'; dims: Record<DimensionKey, number> }
type CellRank = { cell: string; clan?: string; avg: number; count: number; roses?: number; accent: string; mural: string }
type TalentResponse = { coders: TalentCoder[]; cells: Array<{ cell: string; clan: string; avg: number; count: number; roses?: number }> }

const murals = ['/images/mural/riwi-mural-planet.jpg', '/images/mural/riwi-mural-fox.jpg', '/images/mural/riwi-mural-cup.jpg', '/images/mural/riwi-mural-rocket.jpg', '/images/mural/riwi-mural-rose.jpg', '/images/mural/riwi-mural-meteor.jpg']
const accents = ['#f3c43d', '#e86f2d', '#8fd7a8', '#f0783f', '#5cc7d8', '#b99cff']
const dimensionDefs: Array<{ key: DimensionKey; apiKey: string; label: string; short: string; color: string; weight: number }> = [
  { key: 'technical', apiKey: 'dim_technical', label: 'Excelencia Técnica', short: 'Excelencia Téc.', color: '#5cc7d8', weight: 30 },
  { key: 'delivery', apiKey: 'dim_delivery', label: 'Desempeño en Entrega', short: 'Desempeño', color: '#f3c43d', weight: 20 },
  { key: 'collaboration', apiKey: 'dim_collaboration', label: 'Colaboración de Equipo', short: 'Colaboración', color: '#8fd7a8', weight: 15 },
  { key: 'professional', apiKey: 'dim_professional', label: 'Comportamiento Profesional', short: 'Comportamiento', color: '#f0783f', weight: 10 },
  { key: 'achievements', apiKey: 'dim_achievements', label: 'Logros y Reconocimientos', short: 'Logros', color: '#ff9f43', weight: 10 },
  { key: 'continuous', apiKey: 'dim_continuous', label: 'Mejora Continua', short: 'Mejora', color: '#b8d99a', weight: 15 },
]

const gaps = [
  ['KPI-008', 'Lead Time', 'Desempeño en Entrega', 'user_stories no tiene timestamps de cambio de estado. Se necesita created_at y done_at por historia.'],
  ['KPI-009', 'Cycle Time', 'Desempeño en Entrega', 'Igual que Lead Time: requiere timestamps de inicio y fin de desarrollo.'],
  ['KPI-023', 'Trend Score', 'Mejora Continua', 'Requiere ≥ 3 períodos históricos de datos. Estará disponible tras varias ejecuciones del pipeline.'],
]

const fallbackCoders: TalentCoder[] = [
  { rank: 1, name: 'Camila Rodríguez', cell: 'Epsilon', score: 24.8, tier: 'Bajo', dims: { technical: 0, delivery: 0, collaboration: 0, professional: 0, achievements: 0, continuous: 0 } },
  { rank: 2, name: 'Alejandro Morales', cell: 'Beta', score: 24.8, tier: 'Bajo', dims: { technical: 0, delivery: 0, collaboration: 0, professional: 0, achievements: 0, continuous: 0 } },
  { rank: 3, name: 'Sebastián García', cell: 'Epsilon', score: 24.8, tier: 'Bajo', dims: { technical: 0, delivery: 0, collaboration: 0, professional: 0, achievements: 0, continuous: 0 } },
]

function normalizeCoders(coders: TalentCoder[]) {
  return coders.map(coder => ({
    ...coder,
    score: Number(coder.score),
    dims: Object.fromEntries(Object.entries(coder.dims).map(([key, value]) => [key, Number(value)])) as Record<DimensionKey, number>
  }))
}

function tierClass(tier: TalentCoder['tier']) {
  return tier === 'Alto' ? 'high' : tier === 'Medio' ? 'mid' : 'low'
}

function initials(name: string) {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2)
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function scoreColor(score: number) {
  if (score >= 75) return '#55d7a8'
  if (score >= 50) return '#f3c43d'
  return '#f0783f'
}

export function TalentPassportPage() {
  const [view, setView] = useState<ViewKey>('general')
  const [query, setQuery] = useState('')
  const [selectedCell, setSelectedCell] = useState('Todas')
  const [minScore, setMinScore] = useState(0)
  const [selectedCoderId, setSelectedCoderId] = useState('')
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [cellView, setCellView] = useState('')
  const [remote, setRemote] = useState<{ coders: TalentCoder[]; cells: CellRank[] } | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    void apiRequest<TalentResponse>('/dashboard/talent-passport').then(data => {
      const coders = normalizeCoders(data.coders)
      const cells = data.cells.map((cell, index) => ({ ...cell, avg: Number(cell.avg), accent: accents[index % accents.length], mural: murals[index % murals.length] }))
      setRemote({ coders, cells })
      setLoadError('')
      setSelectedCoderId(current => current || coders[0]?.id || coders[0]?.name || '')
      setCompareA(current => current || coders[0]?.id || coders[0]?.name || '')
      setCompareB(current => current || coders[1]?.id || coders[1]?.name || '')
      setCellView(current => current || cells[0]?.cell || coders[0]?.cell || '')
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'No se pudo conectar con el API real.'
      console.error('[TalentPassport] API real no disponible:', error)
      setLoadError(message)
      const coders = normalizeCoders(fallbackCoders)
      setRemote({ coders, cells: [] })
      setSelectedCoderId(coders[0].name)
      setCompareA(coders[0].name)
      setCompareB(coders[1]?.name ?? coders[0].name)
      setCellView(coders[0].cell)
    })
  }, [])

  const coders = remote?.coders.length ? remote.coders : normalizeCoders(fallbackCoders)
  const derivedCells = useMemo(() => {
    const groups = new Map<string, TalentCoder[]>()
    coders.forEach(coder => groups.set(coder.cell, [...(groups.get(coder.cell) ?? []), coder]))
    return Array.from(groups.entries()).map(([cell, members], index) => ({
      cell,
      clan: members[0]?.clan,
      avg: Number(avg(members.map(member => member.score)).toFixed(1)),
      count: members.length,
      accent: accents[index % accents.length],
      mural: murals[index % murals.length]
    })).sort((a, b) => b.avg - a.avg)
  }, [coders])
  const cellRanks = remote?.cells.length ? remote.cells : derivedCells
  const cellsForFilters = Array.from(new Set(coders.map(coder => coder.cell))).sort()

  const filtered = useMemo(() => coders
    .filter(coder => selectedCell === 'Todas' || coder.cell === selectedCell)
    .filter(coder => coder.score >= minScore)
    .filter(coder => `${coder.name} ${coder.email ?? ''} ${coder.cell}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.score - a.score || a.rank - b.rank), [coders, minScore, query, selectedCell])

  const summary = useMemo(() => {
    const top = filtered[0] ?? coders[0]
    const topCell = cellRanks[0] ?? derivedCells[0]
    return {
      total: filtered.length,
      allTotal: coders.length,
      avgScore: Number(avg(filtered.map(coder => coder.score)).toFixed(1)),
      top,
      topCell,
      high: filtered.filter(coder => coder.tier === 'Alto').length,
      low: filtered.filter(coder => coder.tier === 'Bajo').length,
    }
  }, [cellRanks, coders, derivedCells, filtered])

  const groupAvg = useMemo(() => Object.fromEntries(dimensionDefs.map(dim => [dim.key, Number(avg(coders.map(coder => coder.dims[dim.key])).toFixed(1))])) as Record<DimensionKey, number>, [coders])
  const selected = coders.find(coder => (coder.id || coder.name) === selectedCoderId) ?? filtered[0] ?? coders[0]
  const selectedCellMembers = coders.filter(coder => coder.cell === cellView)
  const selectedCellStats = {
    avg: Number(avg(selectedCellMembers.map(coder => coder.score)).toFixed(1)),
    high: selectedCellMembers.filter(coder => coder.tier === 'Alto').length,
    rank: Math.max(1, derivedCells.findIndex(cell => cell.cell === cellView) + 1),
  }
  const a = coders.find(coder => (coder.id || coder.name) === compareA) ?? coders[0]
  const b = coders.find(coder => (coder.id || coder.name) === compareB) ?? coders[1] ?? coders[0]
  const distribution = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, index) => ({ label: index === 9 ? '90-100' : `${index * 10}-${index * 10 + 9}`, count: 0 }))
    coders.forEach(coder => bins[Math.min(9, Math.floor(coder.score / 10))].count++)
    return bins
  }, [coders])
  const maxDist = Math.max(...distribution.map(bin => bin.count), 1)

  return (
    <RoleShell role="Admin" name="Admin B612">
      <section className="talent-passport talent-dashboard-v2">
        <header className="talent-hero dashboard-hero-v2">
          <div className="talent-hero__copy">
            <p className="eyebrow">B612 · Talent Passport v2 · PostgreSQL real</p>
            <h1>Dashboard de <span>Empleabilidad</span></h1>
            <p>Recreé la información del dashboard HTML: KPIs, ranking, comparador, perfil de coder, vista por célula, heatmap, filtros, gap analysis e insights; pero con el universo visual que ya estamos construyendo.</p>
            <div className="talent-actions">
              <span><Sparkles /> Generado desde datos externos</span>
              <a href="https://github.com/Riwi-io-Medellin/212-b-612/tree/dev" target="_blank" rel="noreferrer"><GitBranch /> Rama dev <ArrowUpRight /></a>
            </div>
            {loadError && <p className="dashboard-error">API real no disponible: {loadError}. Mostrando maqueta temporal.</p>}
          </div>
          <div className="dashboard-side-panel">
            <label><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar estudiante o célula..." /></label>
            <select value={selectedCell} onChange={event => setSelectedCell(event.target.value)}>
              <option>Todas</option>
              {cellsForFilters.map(cell => <option key={cell}>{cell}</option>)}
            </select>
            <div className="score-filter"><span>Score mínimo: <b>{minScore}</b></span><input type="range" min={0} max={100} step={5} value={minScore} onChange={event => setMinScore(Number(event.target.value))} /></div>
          </div>
        </header>

        <nav className="dashboard-tabs">
          {[
            ['general', '🌐', 'General'],
            ['comparador', '⚖️', 'Comparar'],
            ['student', '👤', 'Coder'],
            ['celula', '🏢', 'Célula'],
            ['heatmap', '🔥', 'Heatmap'],
          ].map(([key, emoji, label]) => <button className={view === key ? 'active' : ''} key={key} onClick={() => setView(key as ViewKey)}><span>{emoji}</span>{label}</button>)}
        </nav>

        {view === 'general' && <>
          <div className="talent-metrics dashboard-kpis">
            <article><Users /><span>Estudiantes</span><strong>{summary.total}</strong><small>de {summary.allTotal} registrados</small></article>
            <article><Gauge /><span>Score promedio</span><strong>{summary.avgScore}</strong><small>filtros activos</small></article>
            <article><Trophy /><span>Top performer</span><strong>{summary.top?.score ?? '—'}</strong><small>{summary.top?.name ?? 'Sin datos'}</small></article>
            <article><Medal /><span>Célula líder</span><strong>{summary.topCell?.avg ?? '—'}</strong><small>{summary.topCell?.cell ?? 'Sin célula'}</small></article>
            <article><Flame /><span>Tier Alto ≥75</span><strong>{summary.high}</strong><small>coders destacados</small></article>
            <article><ShieldAlert /><span>Tier Bajo &lt;50</span><strong>{summary.low}</strong><small>requieren seguimiento</small></article>
          </div>

          <div className="dashboard-grid-main">
            <section className="passport-panel">
              <div className="passport-title"><div><p className="eyebrow">Ranking de empleabilidad</p><h2>Top 25 coders</h2></div><BarChart3 /></div>
              <div className="ranking-bars">{filtered.slice(0, 25).map(coder => <button key={`${coder.rank}-${coder.id ?? coder.name}`} onClick={() => { setSelectedCoderId(coder.id || coder.name); setView('student') }}><span>{coder.rank}</span><strong>{coder.name}</strong><i><b style={{ width: `${coder.score}%`, background: scoreColor(coder.score) }} /></i><em>{coder.score}</em></button>)}</div>
            </section>

            <section className="passport-panel">
              <div className="passport-title"><div><p className="eyebrow">Distribución</p><h2>Scores por rango</h2></div><Gauge /></div>
              <div className="distribution-bars">{distribution.map(bin => <article key={bin.label}><span>{bin.label}</span><i><b style={{ height: `${(bin.count / maxDist) * 100}%` }} /></i><strong>{bin.count}</strong></article>)}</div>
            </section>
          </div>

          <div className="passport-grid passport-grid--bottom">
            <section className="passport-panel">
              <div className="passport-title"><div><p className="eyebrow">Ranking por célula</p><h2>Células activas</h2></div><Medal /></div>
              <div className="cell-bars">{cellRanks.map(cell => <button key={cell.cell} onClick={() => { setCellView(cell.cell); setView('celula') }} style={{ '--cell-accent': cell.accent, '--cell-art': `url(${cell.mural})` } as React.CSSProperties}><div><strong>{cell.cell}</strong><span>{cell.clan ? `${cell.clan} · ` : ''}{cell.count} coders</span></div><i><b style={{ width: `${cell.avg}%` }} /></i><em>{cell.avg}</em></button>)}</div>
            </section>

            <section className="passport-panel">
              <div className="passport-title"><div><p className="eyebrow">Dimensiones</p><h2>Pesos del score</h2></div><BarChart3 /></div>
              <div className="dimension-orbit">{dimensionDefs.map(dim => <article key={dim.key} style={{ '--dim-color': dim.color } as React.CSSProperties}><span>{dim.weight}%</span><strong>{dim.label}</strong><small>Promedio: {groupAvg[dim.key]}</small></article>)}</div>
            </section>

            <section className="passport-panel">
              <div className="passport-title"><div><p className="eyebrow">Análisis de IA</p><h2>Insights</h2></div><Sparkles /></div>
              <div className="insight-premium"><p>Configure <code>OPENAI_API_KEY</code> para activar insights de IA.</p><span>Mientras tanto, el Admin puede revisar coders en tier bajo, células con menor promedio y dimensiones con brechas institucionales.</span></div>
            </section>
          </div>

          <StudentTable coders={filtered} onSelect={coder => { setSelectedCoderId(coder.id || coder.name); setView('student') }} />
          <GapAnalysis />
        </>}

        {view === 'comparador' && <CompareView a={a} b={b} coders={coders} setA={setCompareA} setB={setCompareB} />}
        {view === 'student' && <StudentView selected={selected} coders={coders} groupAvg={groupAvg} />}
        {view === 'celula' && <CellView cell={cellView} setCell={setCellView} cells={cellsForFilters} members={selectedCellMembers} stats={selectedCellStats} groupAvg={groupAvg} />}
        {view === 'heatmap' && <HeatmapView coders={coders} />}
      </section>
    </RoleShell>
  )
}

function StudentTable({ coders, onSelect }: { coders: TalentCoder[]; onSelect: (coder: TalentCoder) => void }) {
  return <section className="passport-panel dashboard-table-panel"><div className="passport-title"><div><p className="eyebrow">Detalle por estudiante</p><h2>Tabla de coders</h2></div><span>{coders.length} registros</span></div><div className="talent-full-table"><table><thead><tr><th>#</th><th>Estudiante</th><th>Célula</th><th>Score</th><th>Tier</th>{dimensionDefs.map(dim => <th key={dim.key}>{dim.short}</th>)}</tr></thead><tbody>{coders.map(coder => <tr key={`${coder.rank}-${coder.id ?? coder.name}`} onClick={() => onSelect(coder)}><td>#{coder.rank}</td><td><strong>{coder.name}</strong><small>{coder.email}</small></td><td>{coder.cell}</td><td className="score-td">{coder.score}</td><td><span className={`tier-badge tier-badge--${tierClass(coder.tier)}`}>{coder.tier}</span></td>{dimensionDefs.map(dim => <td key={dim.key}><DimMini value={coder.dims[dim.key]} color={dim.color} /></td>)}</tr>)}</tbody></table></div></section>
}

function DimMini({ value, color }: { value: number; color: string }) {
  return <span className="dim-mini"><i><b style={{ width: `${value}%`, background: color }} /></i><em>{value}</em></span>
}

function CompareView({ a, b, coders, setA, setB }: { a: TalentCoder; b: TalentCoder; coders: TalentCoder[]; setA: (id: string) => void; setB: (id: string) => void }) {
  return <div className="dashboard-view-block"><div className="compare-controls"><select value={a.id || a.name} onChange={event => setA(event.target.value)}>{coders.map(coder => <option value={coder.id || coder.name} key={`a-${coder.id ?? coder.name}`}>{coder.name} · {coder.cell}</option>)}</select><select value={b.id || b.name} onChange={event => setB(event.target.value)}>{coders.map(coder => <option value={coder.id || coder.name} key={`b-${coder.id ?? coder.name}`}>{coder.name} · {coder.cell}</option>)}</select></div><div className="compare-premium-grid"><CompareCard coder={a} side="left" /><CompareCard coder={b} side="right" /></div><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Diferencia por dimensión</p><h2>{a.name} vs {b.name}</h2></div></div><div className="diff-list">{dimensionDefs.map(dim => { const diff = Number((a.dims[dim.key] - b.dims[dim.key]).toFixed(1)); return <article key={dim.key}><span>{dim.label}</span><strong>{a.dims[dim.key]}</strong><strong>{b.dims[dim.key]}</strong><em className={diff >= 0 ? 'positive' : 'negative'}>{diff > 0 ? '+' : ''}{diff}</em></article> })}</div></section></div>
}

function CompareCard({ coder, side }: { coder: TalentCoder; side: string }) {
  return <article className={`compare-premium-card compare-premium-card--${side}`}><span>{coder.cell}</span><h2>{coder.name}</h2><p>{coder.email || 'Sin correo visible'}</p><strong>{coder.score}</strong><small>Employment Score</small><b className={`tier-badge tier-badge--${tierClass(coder.tier)}`}>{coder.tier}</b></article>
}

function StudentView({ selected, coders, groupAvg }: { selected: TalentCoder; coders: TalentCoder[]; groupAvg: Record<DimensionKey, number> }) {
  const [focused, setFocused] = useState<TalentCoder | null>(null)
  const index = coders.findIndex(coder => (coder.id || coder.name) === (selected.id || selected.name))
  const context = coders.slice(Math.max(0, index - 3), Math.min(coders.length, index + 4))
  return <div className="dashboard-view-block"><section className="student-profile-premium"><div className="profile-avatar-xl">{initials(selected.name)}</div><div><p className="eyebrow">Perfil de coder</p><h2>{selected.name}</h2><span>{selected.cell} · {selected.email || 'Sin email'}</span></div><div className="student-score"><strong>{selected.score}</strong><span>Employment Score</span><b>#{selected.rank} de {coders.length}</b></div><em className={`tier-badge tier-badge--${tierClass(selected.tier)}`}>{selected.tier}</em></section><div className="passport-grid"><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Dimensiones</p><h2>Perfil individual</h2></div></div><div className="profile-dims-v2">{dimensionDefs.map(dim => <article key={dim.key}><div><span>{dim.label}</span><strong>{selected.dims[dim.key]}</strong></div><i><b style={{ width: `${selected.dims[dim.key]}%`, background: dim.color }} /></i><small>Promedio grupo: {groupAvg[dim.key]}</small></article>)}</div></section><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Radar vs grupo</p><h2>Brechas</h2></div></div><div className="radar-fake">{dimensionDefs.map((dim, index) => <span key={dim.key} style={{ '--angle': `${index * 60}deg`, '--value': `${selected.dims[dim.key]}%`, '--dim-color': dim.color } as React.CSSProperties}><b>{dim.short}</b></span>)}</div></section></div><StudentTable coders={context} onSelect={setFocused} />{focused && <div className="prototype-toast"><Trophy size={17}/>{focused.name} · Score {focused.score} · {focused.cell}</div>}</div>
}

function CellView({ cell, setCell, cells, members, stats, groupAvg }: { cell: string; setCell: (cell: string) => void; cells: string[]; members: TalentCoder[]; stats: { avg: number; high: number; rank: number }; groupAvg: Record<DimensionKey, number> }) {
  const [selected, setSelected] = useState<TalentCoder | null>(null)
  const cellAvgDims = Object.fromEntries(dimensionDefs.map(dim => [dim.key, Number(avg(members.map(member => member.dims[dim.key])).toFixed(1))])) as Record<DimensionKey, number>
  return <div className="dashboard-view-block"><div className="compare-controls"><select value={cell} onChange={event => setCell(event.target.value)}>{cells.map(item => <option key={item}>{item}</option>)}</select></div><section className="cell-profile-premium"><div><p className="eyebrow">Célula seleccionada</p><h2>{cell}</h2></div><article><strong>{stats.avg}</strong><span>Score prom.</span></article><article><strong>{members.length}</strong><span>Estudiantes</span></article><article><strong>#{stats.rank}</strong><span>Rank global</span></article><article><strong>{stats.high}</strong><span>Tier Alto</span></article></section><div className="passport-grid"><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Ranking interno</p><h2>{cell}</h2></div></div><div className="ranking-bars">{[...members].sort((a,b)=>b.score-a.score).map(coder => <button onClick={() => setSelected(coder)} key={coder.id ?? coder.name}><span>{coder.rank}</span><strong>{coder.name}</strong><i><b style={{ width: `${coder.score}%`, background: scoreColor(coder.score) }} /></i><em>{coder.score}</em></button>)}</div></section><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Dims vs global</p><h2>Promedios</h2></div></div><div className="profile-dims-v2">{dimensionDefs.map(dim => <article key={dim.key}><div><span>{dim.label}</span><strong>{cellAvgDims[dim.key]}</strong></div><i><b style={{ width: `${cellAvgDims[dim.key]}%`, background: dim.color }} /></i><small>Global: {groupAvg[dim.key]}</small></article>)}</div></section></div><StudentTable coders={members} onSelect={setSelected} />{selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}><button type="button" className="prototype-modal-close" onClick={() => setSelected(null)}><X /></button><p className="eyebrow">{selected.cell}</p><h2>{selected.name}</h2><p>{selected.email}</p><div className="student-score"><strong>{selected.score}</strong><span>Employment Score</span><b>#{selected.rank}</b></div><div className="profile-dims-v2">{dimensionDefs.map(dim => <article key={dim.key}><div><span>{dim.label}</span><strong>{selected.dims[dim.key]}</strong></div><i><b style={{ width: `${selected.dims[dim.key]}%`, background: dim.color }} /></i></article>)}</div></section></div>}</div>
}

function HeatmapView({ coders }: { coders: TalentCoder[] }) {
  return <section className="passport-panel dashboard-table-panel"><div className="passport-title"><div><p className="eyebrow">Heatmap de dimensiones</p><h2>Todos los coders</h2></div><Flame /></div><div className="heatmap-v2"><table><thead><tr><th>Estudiante</th><th>Score</th>{dimensionDefs.map(dim => <th key={dim.key}>{dim.short}</th>)}</tr></thead><tbody>{coders.map(coder => <tr key={`${coder.rank}-${coder.id ?? coder.name}`}><td><strong>{coder.name}</strong><small>{coder.cell}</small></td><td>{coder.score}</td>{dimensionDefs.map(dim => <td key={dim.key}><span style={{ opacity: .35 + (coder.dims[dim.key] / 160), background: dim.color }}>{coder.dims[dim.key]}</span></td>)}</tr>)}</tbody></table></div></section>
}

function GapAnalysis() {
  return <section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Gap Analysis</p><h2>KPIs pendientes</h2></div><ShieldAlert /></div><div className="gap-list gap-list--v2">{gaps.map(([id, name, dim, reason]) => <article key={id}><span>{id}</span><strong>{name}</strong><small>📐 {dim}</small><p>{reason}</p></article>)}</div></section>
}
