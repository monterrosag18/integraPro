import { CheckCircle2, Clock3, History, LockKeyhole, Orbit, Shuffle, Sparkles, UserRoundCog, Users, X } from 'lucide-react'
import { useState } from 'react'
import { DocumentationPanel } from '../../features/documentation/components/DocumentationPanel'
import { RoleShell } from '../../shared/components/layout/RoleShell'

const names = ['Laura', 'Daniel', 'Camila', 'Andrés', 'Sofía', 'Mateo', 'Valentina', 'Samuel', 'Sara', 'Nicolás', 'Mariana', 'Felipe']
const leaders = ['Juan', 'María', 'Carlos', 'Elena', 'Sara', 'Mateo']
const initialCells = [
  { cell: 'Cosmos', leader: 'Juan', color: '#a78bfa' },
  { cell: 'B612', leader: 'María', color: '#fb7185' },
  { cell: 'Asteroide', leader: 'Carlos', color: '#38bdf8' },
  { cell: 'Zorro', leader: 'Elena', color: '#fbbf24' },
]

export function TlDashboardPage() {
  const [coders, setCoders] = useState(names)
  const [cells, setCells] = useState(initialCells)
  const [confirmed, setConfirmed] = useState(false)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [notice, setNotice] = useState('')

  const toast = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const shuffle = () => {
    setConfirmed(false)
    setCoders(current => [...current].sort(() => Math.random() - .5))
    toast('Coders sorteados sin repetir célula consecutiva')
  }

  const changeLeader = (leader: string) => {
    if (!editingCell) return
    setCells(current => current.map(cell => cell.cell === editingCell ? { ...cell, leader } : cell))
    setEditingCell(null)
    setConfirmed(false)
    toast(`${leader} ahora lidera ${editingCell}`)
  }

  return <RoleShell role="TL" name="Alex R.">
    <header className="page-header page-header--premium"><div><div className="hero-kicker"><Sparkles size={14} /> Sprint 04 · Van Rossum</div><h1>Diseña la próxima tripulación</h1><p>Los líderes permanecen anclados hasta que el TL decida cambiarlos.</p></div><div className="header-actions"><button className="ghost-small" onClick={() => setShowHistory(true)}><History size={16} /> Historial</button><button className="primary-button" onClick={shuffle}><Shuffle size={17} /> Sortear coders</button></div></header>
    <div className="rotation-summary"><div><Users /><span><strong>{coders.length + cells.length}</strong> coders asignados</span></div><div><Orbit /><span><strong>{String(cells.length).padStart(2, '0')}</strong> células visibles</span></div><div><Clock3 /><span><strong>6 días</strong> para iniciar</span></div><div className="rotation-valid"><CheckCircle2 /><span>Reglas validadas</span></div></div>
    <div className="rotation-grid rotation-grid--premium">{cells.map(({ cell, leader, color }, index) => <article className="cell-card cell-card--premium" key={cell} style={{ '--cell-color': color } as React.CSSProperties}><div className="cell-card__visual"><div className="cell-planet"><Orbit /></div><span>0{index + 1}</span></div><div className="cell-card__header"><div><small>CÉLULA</small><h3>{cell}</h3></div><button title="Cambiar líder" onClick={() => setEditingCell(cell)}><UserRoundCog size={17} /></button></div><div className="leader-row"><span><LockKeyhole size={14} /></span><div><small>LÍDER ANCLADO</small><strong>{leader}</strong></div></div><div className="crew-list">{coders.slice(index * 3, index * 3 + 3).map((name, position) => <div className="coder-row" key={name}><span style={{ background: `linear-gradient(135deg,${color},#31244f)` }}>{name[0]}</span><div><strong>{name}</strong><small>Visitó {position + 2} células</small></div><i>::</i></div>)}</div></article>)}</div>
    <div className={`confirm-bar confirm-bar--premium ${confirmed ? 'is-confirmed' : ''}`}><div>{confirmed ? <CheckCircle2 /> : <Sparkles />}<span><strong>{confirmed ? 'Rotación confirmada' : 'Distribución lista para revisar'}</strong><small>Sin repeticiones consecutivas · 1 líder y 3 rotadores por célula</small></span></div><button className="primary-button" onClick={() => { setConfirmed(true); toast('Rotación confirmada para el Sprint 04') }}>{confirmed ? 'Confirmada ✓' : 'Confirmar rotación'}</button></div>
    <DocumentationPanel />
    {editingCell && <div className="modal-backdrop" onMouseDown={() => setEditingCell(null)}><section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}><button type="button" className="prototype-modal-close" onClick={() => setEditingCell(null)}><X /></button><p className="eyebrow">Control del TL</p><h2>Cambiar líder de {editingCell}</h2>{leaders.map(leader => <button type="button" className="leader-picker-row" key={leader} onClick={() => changeLeader(leader)}><UserRoundCog size={16} /><span>{leader}</span><small>{cells.some(cell => cell.leader === leader) ? 'Lidera otra célula' : 'Disponible'}</small></button>)}</section></div>}
    {showHistory && <div className="modal-backdrop" onMouseDown={() => setShowHistory(false)}><section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}><button type="button" className="prototype-modal-close" onClick={() => setShowHistory(false)}><X /></button><p className="eyebrow">Historial de rotaciones</p><h2>Últimos sorteos</h2>{['Sprint 03 · Aurora mantuvo líder · 12 rotadores','Sprint 02 · Cosmos recibió 3 coders nuevos','Sprint 01 · Reglas validadas sin repetición'].map(item => <article className="history-row" key={item}><History size={16}/><span>{item}</span></article>)}<div><button className="primary-button" onClick={() => { setShowHistory(false); toast('Historial consultado') }}>Entendido</button></div></section></div>}
    {notice && <div className="prototype-toast"><CheckCircle2 />{notice}</div>}
  </RoleShell>
}
