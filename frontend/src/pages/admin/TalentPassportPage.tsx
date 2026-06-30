import { ArrowUpRight, BarChart3, BookOpen, BrainCircuit, Database, Download, Flame, Gauge, GitBranch, Medal, Search, ShieldAlert, Sparkles, Trophy, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../shared/api/httpClient'
import { getCurrentUser } from '../../shared/auth/session'
import { RoleShell } from '../../shared/components/layout/RoleShell'

type ViewKey = 'general' | 'comparador' | 'student' | 'celula' | 'heatmap' | 'kpis' | 'insights'
type DimensionKey = 'technical' | 'delivery' | 'collaboration' | 'professional' | 'achievements' | 'continuous'
type TalentTier = 'Bajo' | 'Medio' | 'Alto'
type KpiStatus = 'ready' | 'partial' | 'gap'
type TalentMetrics = {
  stories: number
  doneStories: number
  totalPoints: number
  donePoints: number
  evaluations: number
  evaluationScores: number
  averageEvaluation: number
  roses: number
  redemptions: number
  assignments: number
  sprints: number
  cellsWorked: number
  leaderRuns: number
  dataCoverage: number
}
type TalentCoder = { rank: number; id?: string; name: string; email?: string; cell: string; clan?: string; score: number; tier: TalentTier; dims: Record<DimensionKey, number>; metrics?: TalentMetrics }
type CellRank = { cell: string; clan?: string; avg: number; count: number; roses?: number; accent: string; mural: string }
type TalentResponse = { coders: TalentCoder[]; cells: Array<{ cell: string; clan: string; avg: number; count: number; roses?: number }>; source?: string; execDate?: string | null }

const murals = ['/images/mural/riwi-mural-planet.jpg', '/images/mural/riwi-mural-fox.jpg', '/images/mural/riwi-mural-cup.jpg', '/images/mural/riwi-mural-rocket.jpg', '/images/mural/riwi-mural-rose.jpg', '/images/mural/riwi-mural-meteor.jpg']
const accents = ['#f3c43d', '#e86f2d', '#8fd7a8', '#f0783f', '#5cc7d8', '#b99cff']

const dimensionDefs: Array<{ key: DimensionKey; apiKey: string; label: string; short: string; color: string; weight: number }> = [
  { key: 'technical', apiKey: 'dim_technical', label: 'Technical Excellence', short: 'Technical', color: '#5cc7d8', weight: 30 },
  { key: 'delivery', apiKey: 'dim_delivery', label: 'Delivery Performance', short: 'Delivery', color: '#f3c43d', weight: 20 },
  { key: 'collaboration', apiKey: 'dim_collaboration', label: 'Team Collaboration', short: 'Collab.', color: '#8fd7a8', weight: 15 },
  { key: 'professional', apiKey: 'dim_professional', label: 'Professional Behavior', short: 'Professional', color: '#f0783f', weight: 10 },
  { key: 'achievements', apiKey: 'dim_achievements', label: 'Achievements & Recognition', short: 'Achievements', color: '#ff9f43', weight: 10 },
  { key: 'continuous', apiKey: 'dim_continuous', label: 'Continuous Improvement', short: 'Improvement', color: '#b8d99a', weight: 15 },
]

const kpiCatalog: Array<{ id: string; name: string; dimension: DimensionKey; formula: string; source: string; status: KpiStatus }> = [
  { id: 'KPI-001', name: 'Technical Score', dimension: 'technical', formula: 'Weighted average of technical evaluations', source: 'evaluations + evaluation_scores', status: 'ready' },
  { id: 'KPI-002', name: 'Competency Score', dimension: 'technical', formula: 'Average per competency', source: 'evaluation_criteria', status: 'partial' },
  { id: 'KPI-003', name: 'Evaluation Consistency', dimension: 'technical', formula: 'Standard deviation of technical performance', source: 'evaluation_scores', status: 'partial' },
  { id: 'KPI-004', name: 'Technical Strength Index', dimension: 'technical', formula: 'Competencies with score >= 85', source: 'evaluation_scores', status: 'partial' },
  { id: 'KPI-005', name: 'Technical Weakness Index', dimension: 'technical', formula: 'Competencies with score < 70', source: 'evaluation_scores', status: 'partial' },
  { id: 'KPI-006', name: 'Throughput', dimension: 'delivery', formula: 'Stories completed per sprint', source: 'user_stories', status: 'ready' },
  { id: 'KPI-007', name: 'Sprint Completion Rate', dimension: 'delivery', formula: 'Done stories / planned stories', source: 'user_stories + sprints', status: 'ready' },
  { id: 'KPI-008', name: 'Lead Time', dimension: 'delivery', formula: 'Creation to done', source: 'user_stories timestamps', status: 'gap' },
  { id: 'KPI-009', name: 'Cycle Time', dimension: 'delivery', formula: 'In progress to done', source: 'user_stories timestamps', status: 'gap' },
  { id: 'KPI-010', name: 'Productivity Index', dimension: 'delivery', formula: 'Throughput + lead time + completion rate', source: 'user_stories', status: 'partial' },
  { id: 'KPI-011', name: 'Collaboration Score', dimension: 'collaboration', formula: 'Average of peer reviews', source: 'evaluations peer', status: 'partial' },
  { id: 'KPI-012', name: 'Team Diversity Index', dimension: 'collaboration', formula: 'Distinct teams participated in', source: 'cell_assignments', status: 'ready' },
  { id: 'KPI-013', name: 'Participation Index', dimension: 'collaboration', formula: 'Registered ceremonies or activities', source: 'ceremonies + assignments', status: 'partial' },
  { id: 'KPI-014', name: 'Peer Recognition', dimension: 'collaboration', formula: 'Recognition given by teammates', source: 'roses + coder_roses', status: 'ready' },
  { id: 'KPI-015', name: 'Performance Stability', dimension: 'professional', formula: 'Performance stability across evaluations', source: 'evaluation_scores', status: 'partial' },
  { id: 'KPI-016', name: 'Participation Continuity', dimension: 'professional', formula: 'Sprints with continuous participation', source: 'cell_assignments + sprints', status: 'ready' },
  { id: 'KPI-017', name: 'Commitment Score', dimension: 'professional', formula: 'Attendance + compliance + participation', source: 'attendance + commitments', status: 'gap' },
  { id: 'KPI-018', name: 'Achievement Count', dimension: 'achievements', formula: 'Number of prizes or achievements', source: 'prizes + redemptions', status: 'partial' },
  { id: 'KPI-019', name: 'Badge Score', dimension: 'achievements', formula: 'Number of badges', source: 'badges', status: 'gap' },
  { id: 'KPI-020', name: 'Recognition Index', dimension: 'achievements', formula: 'Prizes + badges + recognitions', source: 'roses + badges + medals', status: 'partial' },
  { id: 'KPI-021', name: 'Technical Growth Rate', dimension: 'continuous', formula: 'Technical variation between first and last period', source: 'evaluation history', status: 'partial' },
  { id: 'KPI-022', name: 'Productivity Growth Rate', dimension: 'continuous', formula: 'Productivity variation between periods', source: 'story history', status: 'partial' },
  { id: 'KPI-023', name: 'Trend Score', dimension: 'continuous', formula: 'Slope via linear regression', source: '>= 3 historical periods', status: 'gap' },
  { id: 'KPI-024', name: 'Continuous Improvement Score', dimension: 'continuous', formula: 'Technical growth + productivity + stability + trend', source: 'historical KPIs', status: 'partial' },
]

const gaps = [
  ['KPI-008', 'Lead Time', 'Delivery Performance', 'user_stories has no state-change timestamps. Needs created_at, started_at and done_at per story.'],
  ['KPI-009', 'Cycle Time', 'Delivery Performance', 'Same as Lead Time: requires start and end timestamps for development.'],
  ['KPI-023', 'Trend Score', 'Continuous Improvement', 'Requires at least 3 historical data periods. Activates once multiple pipeline runs exist.'],
]

function tierFromScore(score: number): TalentTier {
  if (score >= 75) return 'Alto'
  if (score >= 50) return 'Medio'
  return 'Bajo'
}

function normalizeCoders(coders: TalentCoder[]) {
  return coders.map(coder => ({
    ...coder,
    score: Number(coder.score),
    tier: tierFromScore(Number(coder.score)),
    dims: Object.fromEntries(Object.entries(coder.dims).map(([key, value]) => [key, Number(value)])) as Record<DimensionKey, number>,
    metrics: coder.metrics ? Object.fromEntries(Object.entries(coder.metrics).map(([key, value]) => [key, Number(value)])) as TalentMetrics : undefined
  }))
}

function tierClass(tier: TalentTier) {
  return tier === 'Alto' ? 'high' : tier === 'Medio' ? 'mid' : 'low'
}

function levelLabel(score: number) {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Highly Employable'
  if (score >= 70) return 'Employable'
  if (score >= 60) return 'Developing'
  return 'Needs Improvement'
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
  const sessionUser = getCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get('view') as ViewKey) ?? 'general'
  const [query, setQuery] = useState('')
  const [selectedCell, setSelectedCell] = useState('All')
  const [minScore, setMinScore] = useState(0)
  const [selectedCoderId, setSelectedCoderId] = useState('')
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [cellView, setCellView] = useState('')
  const [remote, setRemote] = useState<{ coders: TalentCoder[]; cells: CellRank[]; source?: string; execDate?: string | null } | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    void apiRequest<TalentResponse>('/dashboard/talent-passport').then(data => {
      const coders = normalizeCoders(data.coders)
      const cells = data.cells.map((cell, index) => ({ ...cell, avg: Number(cell.avg), accent: accents[index % accents.length], mural: murals[index % murals.length] }))
      setRemote({ coders, cells, source: data.source, execDate: data.execDate })
      setLoadError('')
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Could not connect to the real API.'
      console.error('[TalentPassport] API real no disponible:', error)
      setLoadError(message)
      setRemote(null)
    })
  }, [])

  const coders = useMemo(() => normalizeCoders(remote?.coders ?? []), [remote])
  const sourceNote = remote
    ? (remote.source === 's3' ? `AWS S3${remote.execDate ? ` · ${remote.execDate}` : ''}` : 'Real PostgreSQL')
    : 'Waiting for real API'

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
  const cellsForFilters = useMemo(() => Array.from(new Set(coders.map(coder => coder.cell))).sort(), [coders])

  useEffect(() => {
    setSelectedCoderId(current => coders.some(coder => (coder.id || coder.name) === current) ? current : coders[0]?.id || coders[0]?.name || '')
    setCompareA(current => coders.some(coder => (coder.id || coder.name) === current) ? current : coders[0]?.id || coders[0]?.name || '')
    setCompareB(current => coders.some(coder => (coder.id || coder.name) === current) ? current : coders[1]?.id || coders[1]?.name || coders[0]?.id || coders[0]?.name || '')
    setCellView(current => cellsForFilters.includes(current) ? current : cellsForFilters[0] || '')
  }, [cellsForFilters, coders])

  const filtered = useMemo(() => coders
    .filter(coder => selectedCell === 'All' || coder.cell === selectedCell)
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
      coverage: Number(avg(filtered.map(coder => coder.metrics?.dataCoverage ?? 0)).toFixed(1)),
      stories: filtered.reduce((sum, coder) => sum + (coder.metrics?.stories ?? 0), 0),
      evaluations: filtered.reduce((sum, coder) => sum + (coder.metrics?.evaluations ?? 0), 0),
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
  const weakestDimension = [...dimensionDefs].sort((left, right) => groupAvg[left.key] - groupAvg[right.key])[0]

  const distribution = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, index) => ({ label: index === 9 ? '90-100' : `${index * 10}-${index * 10 + 9}`, count: 0 }))
    coders.forEach(coder => bins[Math.min(9, Math.floor(coder.score / 10))].count++)
    return bins
  }, [coders])
  const maxDist = Math.max(...distribution.map(bin => bin.count), 1)

  return (
    <RoleShell role="Admin" name={sessionUser?.fullName ?? 'Admin B612'}>
      <section className="talent-passport talent-dashboard-v2">
        <header className="talent-hero dashboard-hero-v2">
          <div className="talent-hero__copy">
            <p className="eyebrow">B612 Talent Passport Analytics</p>
            <h1>Employability <span>Dashboard</span></h1>
            <p>We integrate the B-612 analytics layer: 24 KPIs, 6 dimensions, weighted scoring, tiers, gaps, traceability, and insights for academic direction.</p>
            <div className="talent-actions">
              <span><Database /> {sourceNote}</span>
              <a href="https://github.com/Riwi-io-Medellin/212-b-612/tree/dev" target="_blank" rel="noreferrer"><GitBranch /> dev branch <ArrowUpRight /></a>
              <button type="button" onClick={() => window.print()}><Download /> Export</button>
            </div>
            {loadError && <p className="dashboard-error">Real API unavailable: {loadError}</p>}
            {!loadError && remote && coders.length === 0 && <p className="dashboard-error">The real API responded, but there are no coders registered to analyze.</p>}
          </div>
          <div className="dashboard-side-panel">
            <label><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search student or cell..." /></label>
            <select value={selectedCell} onChange={event => setSelectedCell(event.target.value)}>
              <option>All</option>
              {cellsForFilters.map(cell => <option key={cell}>{cell}</option>)}
            </select>
            <div className="score-filter"><span>Min score: <b>{minScore}</b></span><input type="range" min={0} max={100} step={5} value={minScore} onChange={event => setMinScore(Number(event.target.value))} /></div>
          </div>
        </header>

        {coders.length === 0 && <section className="passport-panel">
          <div className="passport-title"><div><p className="eyebrow">Datos reales</p><h2>Sin registros para analizar</h2></div><Database /></div>
          <p>Talent Passport ya no usa muestras locales. Cuando existan coders, asignaciones, historias o evaluaciones en PostgreSQL, el analisis se construira desde esos registros.</p>
        </section>}

        {coders.length > 0 && view === 'general' && <>
          <div className="talent-metrics dashboard-kpis">
            <article><Users /><span>Students</span><strong>{summary.total}</strong><small>of {summary.allTotal} registered</small></article>
            <article><Gauge /><span>Average score</span><strong>{summary.avgScore}</strong><small>{levelLabel(summary.avgScore)}</small></article>
            <article><Trophy /><span>Top performer</span><strong>{summary.top?.score ?? '-'}</strong><small>{summary.top?.name ?? 'No data'}</small></article>
            <article><Medal /><span>Top cell</span><strong>{summary.topCell?.avg ?? '-'}</strong><small>{summary.topCell?.cell ?? 'No cell'}</small></article>
            <article><Flame /><span>Real evidence</span><strong>{summary.coverage}%</strong><small>{summary.stories} stories · {summary.evaluations} evals</small></article>
            <article><ShieldAlert /><span>Priority focus</span><strong>{weakestDimension?.short}</strong><small>{weakestDimension ? groupAvg[weakestDimension.key] : '-'}/100</small></article>
          </div>

          <div className="dashboard-grid-main">
            <section className="passport-panel">
              <div className="passport-title"><div><p className="eyebrow">Ranking de empleabilidad</p><h2>Top coders</h2></div><BarChart3 /></div>
              <div className="ranking-bars">{filtered.slice(0, 25).map(coder => <button key={`${coder.rank}-${coder.id ?? coder.name}`} onClick={() => { setSelectedCoderId(coder.id || coder.name); setSearchParams({ view: 'student' }) }}><span>{coder.rank}</span><strong>{coder.name}</strong><i><b style={{ width: `${coder.score}%`, background: scoreColor(coder.score) }} /></i><em>{coder.score}</em></button>)}</div>
            </section>

            <section className="passport-panel">
              <div className="passport-title"><div><p className="eyebrow">Distribucion</p><h2>Scores por rango</h2></div><Gauge /></div>
              <div className="distribution-bars">{distribution.map(bin => <article key={bin.label}><span>{bin.label}</span><i><b style={{ height: `${(bin.count / maxDist) * 100}%` }} /></i><strong>{bin.count}</strong></article>)}</div>
            </section>
          </div>

          <div className="passport-grid passport-grid--bottom">
            <CellRanking cells={cellRanks} onSelect={cell => { setCellView(cell); setSearchParams({ view: 'celula' }) }} />
            <DimensionWeights groupAvg={groupAvg} />
            <section className="passport-panel">
              <div className="passport-title"><div><p className="eyebrow">Operational insight</p><h2>Next action</h2></div><Sparkles /></div>
              <div className="insight-premium"><p>Prioritize {weakestDimension?.label}</p><span>The group can raise the Employment Score by reinforcing the weakest dimension and supporting low-tier coders during the next sprint.</span></div>
            </section>
          </div>

          <StudentTable coders={filtered} onSelect={coder => { setSelectedCoderId(coder.id || coder.name); setSearchParams({ view: 'student' }) }} />
          <GapAnalysis />
        </>}

        {coders.length > 0 && view === 'comparador' && a && b && <CompareView a={a} b={b} coders={coders} setA={setCompareA} setB={setCompareB} />}
        {coders.length > 0 && view === 'student' && selected && <StudentView selected={selected} coders={coders} groupAvg={groupAvg} />}
        {coders.length > 0 && view === 'celula' && <CellView cell={cellView} setCell={setCellView} cells={cellsForFilters} members={selectedCellMembers} stats={selectedCellStats} groupAvg={groupAvg} />}
        {coders.length > 0 && view === 'heatmap' && <HeatmapView coders={coders} />}
        {view === 'kpis' && <KpiCatalogView />}
        {coders.length > 0 && view === 'insights' && <InsightsView coders={coders} cellRanks={cellRanks} groupAvg={groupAvg} weakestDimension={weakestDimension} />}
      </section>
    </RoleShell>
  )
}

function CellRanking({ cells, onSelect }: { cells: CellRank[]; onSelect: (cell: string) => void }) {
  return <section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Ranking por celula</p><h2>Celulas activas</h2></div><Medal /></div><div className="cell-bars">{cells.map(cell => <button key={cell.cell} onClick={() => onSelect(cell.cell)} style={{ '--cell-accent': cell.accent, '--cell-art': `url(${cell.mural})` } as React.CSSProperties}><div><strong>{cell.cell}</strong><span>{cell.clan ? `${cell.clan} - ` : ''}{cell.count} coders</span></div><i><b style={{ width: `${cell.avg}%` }} /></i><em>{cell.avg}</em></button>)}</div></section>
}

function DimensionWeights({ groupAvg }: { groupAvg: Record<DimensionKey, number> }) {
  return <section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Modelo de score</p><h2>6 dimensiones</h2></div><BarChart3 /></div><div className="dimension-orbit">{dimensionDefs.map(dim => <article key={dim.key} style={{ '--dim-color': dim.color } as React.CSSProperties}><span>{dim.weight}%</span><strong>{dim.label}</strong><small>Promedio: {groupAvg[dim.key]}</small></article>)}</div></section>
}

function StudentTable({ coders, onSelect }: { coders: TalentCoder[]; onSelect: (coder: TalentCoder) => void }) {
  return <section className="passport-panel dashboard-table-panel"><div className="passport-title"><div><p className="eyebrow">Detalle por estudiante</p><h2>Tabla de coders</h2></div><span>{coders.length} registros reales</span></div><div className="talent-full-table"><table><thead><tr><th>#</th><th>Estudiante</th><th>Celula</th><th>Score</th><th>Nivel</th><th>Tier</th><th>Evidencia</th>{dimensionDefs.map(dim => <th key={dim.key}>{dim.short}</th>)}</tr></thead><tbody>{coders.map(coder => <tr key={`${coder.rank}-${coder.id ?? coder.name}`} onClick={() => onSelect(coder)}><td>#{coder.rank}</td><td><strong>{coder.name}</strong><small>{coder.email}</small></td><td>{coder.cell}</td><td className="score-td">{coder.score}</td><td><span className="level-pill">{levelLabel(coder.score)}</span></td><td><span className={`tier-badge tier-badge--${tierClass(coder.tier)}`}>{coder.tier}</span></td><td><small>{coder.metrics?.dataCoverage ?? 0}% · {coder.metrics?.stories ?? 0} HU · {coder.metrics?.evaluations ?? 0} eval</small></td>{dimensionDefs.map(dim => <td key={dim.key}><DimMini value={coder.dims[dim.key]} color={dim.color} /></td>)}</tr>)}</tbody></table></div></section>
}

function DimMini({ value, color }: { value: number; color: string }) {
  return <span className="dim-mini"><i><b style={{ width: `${value}%`, background: color }} /></i><em>{value}</em></span>
}

function CompareView({ a, b, coders, setA, setB }: { a: TalentCoder; b: TalentCoder; coders: TalentCoder[]; setA: (id: string) => void; setB: (id: string) => void }) {
  return <div className="dashboard-view-block"><div className="compare-controls"><select value={a.id || a.name} onChange={event => setA(event.target.value)}>{coders.map(coder => <option value={coder.id || coder.name} key={`a-${coder.id ?? coder.name}`}>{coder.name} - {coder.cell}</option>)}</select><select value={b.id || b.name} onChange={event => setB(event.target.value)}>{coders.map(coder => <option value={coder.id || coder.name} key={`b-${coder.id ?? coder.name}`}>{coder.name} - {coder.cell}</option>)}</select></div><div className="compare-premium-grid"><CompareCard coder={a} side="left" /><CompareCard coder={b} side="right" /></div><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Diferencia por dimension</p><h2>{a.name} vs {b.name}</h2></div></div><div className="diff-list">{dimensionDefs.map(dim => { const diff = Number((a.dims[dim.key] - b.dims[dim.key]).toFixed(1)); return <article key={dim.key}><span>{dim.label}</span><strong>{a.dims[dim.key]}</strong><strong>{b.dims[dim.key]}</strong><em className={diff >= 0 ? 'positive' : 'negative'}>{diff > 0 ? '+' : ''}{diff}</em></article> })}</div></section></div>
}

function CompareCard({ coder, side }: { coder: TalentCoder; side: string }) {
  return <article className={`compare-premium-card compare-premium-card--${side}`}><span>{coder.cell}</span><h2>{coder.name}</h2><p>{coder.email || 'No email visible'}</p><strong>{coder.score}</strong><small>{levelLabel(coder.score)}</small><b className={`tier-badge tier-badge--${tierClass(coder.tier)}`}>{coder.tier}</b></article>
}

function StudentView({ selected, coders, groupAvg }: { selected: TalentCoder; coders: TalentCoder[]; groupAvg: Record<DimensionKey, number> }) {
  const [focused, setFocused] = useState<TalentCoder | null>(null)
  const index = coders.findIndex(coder => (coder.id || coder.name) === (selected.id || selected.name))
  const context = coders.slice(Math.max(0, index - 3), Math.min(coders.length, index + 4))
  const metrics = selected.metrics
  return <div className="dashboard-view-block"><section className="student-profile-premium"><div className="profile-avatar-xl">{initials(selected.name)}</div><div><p className="eyebrow">Perfil de coder</p><h2>{selected.name}</h2><span>{selected.cell} - {selected.email || 'Sin email'}</span></div><div className="student-score"><strong>{selected.score}</strong><span>Employment Score</span><b>#{selected.rank} de {coders.length}</b></div><em className={`tier-badge tier-badge--${tierClass(selected.tier)}`}>{selected.tier}</em></section><section className="passport-panel evidence-panel"><div className="passport-title"><div><p className="eyebrow">Trazabilidad real</p><h2>Registros que sustentan el score</h2></div><Database /></div><div className="evidence-grid"><article><strong>{metrics?.dataCoverage ?? 0}%</strong><span>Cobertura</span></article><article><strong>{metrics?.evaluations ?? 0}</strong><span>Evaluaciones</span></article><article><strong>{metrics?.stories ?? 0}</strong><span>Historias</span></article><article><strong>{metrics?.donePoints ?? 0}/{metrics?.totalPoints ?? 0}</strong><span>Puntos done</span></article><article><strong>{metrics?.roses ?? 0}</strong><span>Rosas</span></article><article><strong>{metrics?.assignments ?? 0}</strong><span>Asignaciones</span></article><article><strong>{metrics?.sprints ?? 0}</strong><span>Sprints</span></article><article><strong>{metrics?.leaderRuns ?? 0}</strong><span>Liderazgos</span></article></div></section><div className="passport-grid"><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Dimensiones</p><h2>Perfil individual</h2></div></div><div className="profile-dims-v2">{dimensionDefs.map(dim => <article key={dim.key}><div><span>{dim.label}</span><strong>{selected.dims[dim.key]}</strong></div><i><b style={{ width: `${selected.dims[dim.key]}%`, background: dim.color }} /></i><small>Promedio grupo: {groupAvg[dim.key]}</small></article>)}</div></section><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Radar vs grupo</p><h2>Brechas</h2></div></div><div className="radar-fake">{dimensionDefs.map((dim, idx) => <span key={dim.key} style={{ '--angle': `${idx * 60}deg`, '--value': `${selected.dims[dim.key]}%`, '--dim-color': dim.color } as React.CSSProperties}><b>{dim.short}</b></span>)}</div></section></div><StudentTable coders={context} onSelect={setFocused} />{focused && <div className="prototype-toast"><Trophy size={17}/>{focused.name} - Score {focused.score} - {focused.cell}</div>}</div>
}

function CellView({ cell, setCell, cells, members, stats, groupAvg }: { cell: string; setCell: (cell: string) => void; cells: string[]; members: TalentCoder[]; stats: { avg: number; high: number; rank: number }; groupAvg: Record<DimensionKey, number> }) {
  const [selected, setSelected] = useState<TalentCoder | null>(null)
  const cellAvgDims = Object.fromEntries(dimensionDefs.map(dim => [dim.key, Number(avg(members.map(member => member.dims[dim.key])).toFixed(1))])) as Record<DimensionKey, number>
  return <div className="dashboard-view-block"><div className="compare-controls"><select value={cell} onChange={event => setCell(event.target.value)}>{cells.map(item => <option key={item}>{item}</option>)}</select></div><section className="cell-profile-premium"><div><p className="eyebrow">Celula seleccionada</p><h2>{cell}</h2></div><article><strong>{stats.avg}</strong><span>Score prom.</span></article><article><strong>{members.length}</strong><span>Estudiantes</span></article><article><strong>#{stats.rank}</strong><span>Rank global</span></article><article><strong>{stats.high}</strong><span>Tier Alto</span></article></section><div className="passport-grid"><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Ranking interno</p><h2>{cell}</h2></div></div><div className="ranking-bars">{[...members].sort((x,y)=>y.score-x.score).map(coder => <button onClick={() => setSelected(coder)} key={coder.id ?? coder.name}><span>{coder.rank}</span><strong>{coder.name}</strong><i><b style={{ width: `${coder.score}%`, background: scoreColor(coder.score) }} /></i><em>{coder.score}</em></button>)}</div></section><section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Dims vs global</p><h2>Promedios</h2></div></div><div className="profile-dims-v2">{dimensionDefs.map(dim => <article key={dim.key}><div><span>{dim.label}</span><strong>{cellAvgDims[dim.key]}</strong></div><i><b style={{ width: `${cellAvgDims[dim.key]}%`, background: dim.color }} /></i><small>Global: {groupAvg[dim.key]}</small></article>)}</div></section></div><StudentTable coders={members} onSelect={setSelected} />{selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}><button type="button" className="prototype-modal-close" onClick={() => setSelected(null)}><X /></button><p className="eyebrow">{selected.cell}</p><h2>{selected.name}</h2><p>{selected.email}</p><div className="student-score"><strong>{selected.score}</strong><span>Employment Score</span><b>#{selected.rank}</b></div><div className="profile-dims-v2">{dimensionDefs.map(dim => <article key={dim.key}><div><span>{dim.label}</span><strong>{selected.dims[dim.key]}</strong></div><i><b style={{ width: `${selected.dims[dim.key]}%`, background: dim.color }} /></i></article>)}</div></section></div>}</div>
}

function HeatmapView({ coders }: { coders: TalentCoder[] }) {
  return <section className="passport-panel dashboard-table-panel"><div className="passport-title"><div><p className="eyebrow">Heatmap de dimensiones</p><h2>Todos los coders</h2></div><Flame /></div><div className="heatmap-v2"><table><thead><tr><th>Estudiante</th><th>Score</th>{dimensionDefs.map(dim => <th key={dim.key}>{dim.short}</th>)}</tr></thead><tbody>{coders.map(coder => <tr key={`${coder.rank}-${coder.id ?? coder.name}`}><td><strong>{coder.name}</strong><small>{coder.cell}</small></td><td>{coder.score}</td>{dimensionDefs.map(dim => <td key={dim.key}><span style={{ opacity: .35 + (coder.dims[dim.key] / 160), background: dim.color }}>{coder.dims[dim.key]}</span></td>)}</tr>)}</tbody></table></div></section>
}

function KpiCatalogView() {
  const byDimension = dimensionDefs.map(dim => ({ ...dim, items: kpiCatalog.filter(kpi => kpi.dimension === dim.key) }))
  return <div className="kpi-catalog-grid">{byDimension.map(dim => <section className="passport-panel kpi-dimension-card" key={dim.key} style={{ '--dim-color': dim.color } as React.CSSProperties}><div className="passport-title"><div><p className="eyebrow">{dim.weight}% del score</p><h2>{dim.label}</h2></div><BookOpen /></div><div className="kpi-list">{dim.items.map(kpi => <article key={kpi.id} className={`kpi-status--${kpi.status}`}><span>{kpi.id}</span><strong>{kpi.name}</strong><small>{kpi.source}</small><p>{kpi.formula}</p></article>)}</div></section>)}</div>
}

function InsightsView({ coders, cellRanks, groupAvg, weakestDimension }: { coders: TalentCoder[]; cellRanks: CellRank[]; groupAvg: Record<DimensionKey, number>; weakestDimension?: { key: DimensionKey; label: string; short: string } }) {
  const top = coders.slice(0, 3)
  const bottom = [...coders].sort((a, b) => a.score - b.score).slice(0, 3)
  const tierCounts = { alto: coders.filter(c => c.tier === 'Alto').length, medio: coders.filter(c => c.tier === 'Medio').length, bajo: coders.filter(c => c.tier === 'Bajo').length }
  return <div className="insights-grid-v2"><section className="passport-panel insight-board"><div className="passport-title"><div><p className="eyebrow">Executive summary</p><h2>Group reading</h2></div><BrainCircuit /></div><p>The group has {coders.length} evaluated coders, with {tierCounts.alto} High, {tierCounts.medio} Mid and {tierCounts.bajo} Low. Top cell is {cellRanks[0]?.cell ?? 'no data'} with average {cellRanks[0]?.avg ?? '-'}.</p><p>The dimension with the most opportunity is {weakestDimension?.label ?? 'no data'}, with average {weakestDimension ? groupAvg[weakestDimension.key] : '-'}.</p></section><section className="passport-panel insight-board"><div className="passport-title"><div><p className="eyebrow">Top performers</p><h2>Recognize and replicate</h2></div><Trophy /></div>{top.map(coder => <article className="insight-row" key={coder.id ?? coder.name}><strong>{coder.name}</strong><span>{coder.cell} - {coder.score} - {levelLabel(coder.score)}</span></article>)}</section><section className="passport-panel insight-board"><div className="passport-title"><div><p className="eyebrow">Action plan</p><h2>Next sprint</h2></div><Sparkles /></div><ol className="insight-steps"><li>Focused coaching for {bottom.map(coder => coder.name).join(', ')}.</li><li>Make {weakestDimension?.label ?? 'the weakest dimension'} an explicit sprint goal.</li><li>Review gaps KPI-008, KPI-009 and KPI-023 before committing to historical data.</li></ol></section></div>
}

function GapAnalysis() {
  return <section className="passport-panel"><div className="passport-title"><div><p className="eyebrow">Gap Analysis</p><h2>KPIs pendientes</h2></div><ShieldAlert /></div><div className="gap-list gap-list--v2">{gaps.map(([id, name, dim, reason]) => <article key={id}><span>{id}</span><strong>{name}</strong><small>{dim}</small><p>{reason}</p></article>)}</div></section>
}
