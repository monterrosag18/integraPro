import { CalendarDays, Flame, Github, Orbit, Users } from 'lucide-react'

export function CellHeader() {
  return (
    <header className="cell-hero">
      <div className="cell-hero__orbit"><Orbit /></div>
      <div className="cell-hero__content"><div className="hero-kicker"><span className="live-dot" /> Sprint 04 en curso</div><h1>Buenos días, Laura <span>✦</span></h1><p>Tu célula avanza por buen camino. Hay 3 historias esperando tu atención.</p><div className="cell-meta"><span><CalendarDays size={15} /> 6 días restantes</span><span><Github size={15} /> 2 repositorios</span><span><Flame size={15} /> 12 días de racha</span></div></div>
      <div className="team-pill"><div className="avatar-stack">{['JL','LM','DR','CT'].map((name,index)=><span key={name} style={{ zIndex: 5-index }}>{name}</span>)}</div><div><small>Tu tripulación</small><strong><Users size={14} /> Célula Cosmos</strong></div></div>
    </header>
  )
}
