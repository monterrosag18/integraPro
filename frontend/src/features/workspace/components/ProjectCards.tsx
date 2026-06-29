import { ArrowUpRight, BookOpenText, Braces, ChartNoAxesCombined, CheckCircle2, Clock3, FolderKanban, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CosmicGlyph } from '../../../shared/components/icons/CosmicGlyph'

const projects = [
  { title: 'API de seguimiento', progress: 72, status: 'En desarrollo', meta:'12 historias · 8 listas', icon: Braces, color:'violet' },
  { title: 'Dashboard del clan', progress: 48, status: 'En desarrollo', meta:'9 historias · 4 listas', icon: ChartNoAxesCombined, color:'coral' },
  { title: 'Documentación técnica', progress: 85, status: 'En revisión', meta:'README · Arquitectura', icon: BookOpenText, color:'cyan' },
]

export function ProjectCards() {
  const [selected, setSelected] = useState<typeof projects[number] | null>(null)
  return (
    <section className="content-section" aria-labelledby="projects-title">
      <div className="section-heading section-heading--premium"><div><p className="eyebrow">Órbita de trabajo</p><h2 id="projects-title">Proyectos de la célula</h2></div><Link to="/app/coder/proyectos" className="text-button">Ver todos <ArrowUpRight size={17} /></Link></div>
      <div className="project-grid project-grid--premium">{projects.map(({ icon:Icon, ...project }) => <article className={`project-card project-card--${project.color}`} key={project.title}><div className="project-card__top"><div className="project-icon"><Icon /></div><div className="project-watermark"><CosmicGlyph type={project.title.includes('Documentación') ? 'docs' : 'board'} size={90}/></div><button aria-label={`Abrir ${project.title}`} onClick={() => setSelected(projects.find(item => item.title === project.title) ?? null)}><ArrowUpRight /></button></div><span className="project-card__status"><i /> {project.status}</span><h3>{project.title}</h3><p className="project-card__meta">{project.meta}</p><div className="project-progress-label"><span>Progreso del sprint</span><strong>{project.progress}%</strong></div><div className="progress"><span style={{ width: `${project.progress}%` }} /></div><div className="project-card__footer"><span><Clock3 size={14} /> Actualizado hoy</span><FolderKanban size={16} /></div></article>)}</div>
      {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}><button type="button" className="prototype-modal-close" onClick={() => setSelected(null)}><X /></button><p className="eyebrow">Proyecto de célula</p><h2>{selected.title}</h2><p>{selected.meta}</p><div className="profile-dims-v2"><article><div><span>Avance</span><strong>{selected.progress}%</strong></div><i><b style={{ width: `${selected.progress}%`, background: '#55d7c3' }} /></i><small>{selected.status}</small></article></div><div><button className="ghost-small" onClick={() => setSelected(null)}>Cerrar</button><Link className="primary-button" to="/app/coder/proyectos"><CheckCircle2 /> Ir al espacio</Link></div></section></div>}
    </section>
  )
}
