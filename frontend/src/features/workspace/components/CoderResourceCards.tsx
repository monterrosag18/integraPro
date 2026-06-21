import { ArrowUpRight, BookOpenText, CalendarClock, Columns3, FolderGit2, MessageSquareText, Trophy, UserRound } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

const resources = [
  { slug:'sprint', title:'Sprint', description:'Consulta historias, fechas y el ritmo actual de la célula.', metric:'8 de 12 historias', progress:67, icon:CalendarClock, art:'/images/coder-sprint-v1.png', color:'#9d72ff' },
  { slug:'proyectos', title:'Proyectos', description:'Código, repositorios y entregables reunidos en una sola órbita.', metric:'2 repositorios activos', progress:76, icon:FolderGit2, art:'/images/coder-projects-v1.png', color:'#55d7c3' },
  { slug:'tablero', title:'Tablero', description:'Mueve tareas y sigue el flujo de trabajo de tu célula.', metric:'5 tareas en curso', progress:58, icon:Columns3, art:'/images/coder-board-v1.png', color:'#7e8fff' },
  { slug:'ceremonias', title:'Ceremonias', description:'Participa en planning, checkpoints, review y retrospectiva.', metric:'Próxima: 24 de junio', progress:50, icon:MessageSquareText, art:'/images/coder-sprint-v1.png', color:'#f18a79' },
  { slug:'documentacion', title:'Documentación', description:'Lee el README, acuerdos y decisiones técnicas del proyecto.', metric:'Última edición: hoy', progress:85, icon:BookOpenText, art:'/images/coder-docs-v1.png', color:'#4ed9c3' },
  { slug:'evaluaciones', title:'Evaluaciones', description:'Completa retos y convierte tu aprendizaje en evidencia.', metric:'14 de 20 completados', progress:70, icon:Trophy, art:'/images/coder-evaluations-v1.png', color:'#ff9c62' },
  { slug:'perfil', title:'Mi perfil', description:'Revisa tu progreso, logros y recorrido dentro del clan.', metric:'Nivel 7 · Explorador', progress:62, icon:UserRound, art:'/images/coder-profile-v1.png', color:'#65b9ff' },
]

export function CoderResourceCards() {
  return <section className="coder-resources" aria-labelledby="coder-resources-title">
    <div className="coder-section-heading"><div><p className="eyebrow">Centro de navegación</p><h2 id="coder-resources-title">Tus espacios de trabajo</h2><p>Todo lo que necesitas para avanzar con tu célula.</p></div><span><i/> Sprint 04 activo</span></div>
    <div className="coder-resource-grid">{resources.map(({icon:Icon,...resource})=><Link className="coder-resource-card" to={`/app/coder/${resource.slug}`} key={resource.slug} style={{'--resource-color':resource.color,'--resource-art':`url(${resource.art})`} as CSSProperties}>
      <div className="coder-resource-card__glow" />
      <div className="coder-resource-card__content">
        <div className="coder-resource-card__icon"><Icon/></div>
        <h3>{resource.title}</h3>
        <p>{resource.description}</p>
        <span className="coder-resource-card__action">Ingresar <ArrowUpRight size={15}/></span>
      </div>
      <div className="coder-resource-card__footer"><div><span>{resource.metric}</span><strong>{resource.progress}%</strong></div><i><b style={{width:`${resource.progress}%`}}/></i></div>
    </Link>)}</div>
  </section>
}
