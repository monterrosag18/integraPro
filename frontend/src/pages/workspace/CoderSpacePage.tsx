import { ArrowLeft, BookOpenText, CalendarClock, Columns3, FolderGit2, MessageSquareText, Sparkles, Trophy, UserRound } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CoderSpaceModule } from '../../features/workspace/components/CoderSpaceModules'
import { RoleShell } from '../../shared/components/layout/RoleShell'

const spaces = {
  sprint:{title:'Sprint 04',subtitle:'Historias, alcance y ritmo de la célula.',icon:CalendarClock,art:'/images/coder-sprint-v1.png',color:'#9d72ff',stats:[['8','Historias listas'],['3','En progreso'],['6 días','Tiempo restante']]},
  proyectos:{title:'Proyectos',subtitle:'Repositorios y entregables de Célula Cosmos.',icon:FolderGit2,art:'/images/coder-projects-v1.png',color:'#55d7c3',stats:[['2','Repositorios'],['7','Pull requests'],['76%','Avance']]},
  tablero:{title:'Tablero de la célula',subtitle:'El flujo propio de trabajo para este sprint.',icon:Columns3,art:'/images/coder-board-v1.png',color:'#7e8fff',stats:[['5','Por hacer'],['3','En curso'],['11','Finalizadas']]},
  ceremonias:{title:'Ceremonias Scrum',subtitle:'Planning, checkpoints, review y retrospectiva.',icon:MessageSquareText,art:'/images/coder-sprint-v1.png',color:'#f18a79',stats:[['04','Ceremonias'],['01','Completada'],['24 Jun','Próxima']]},
  documentacion:{title:'Documentación',subtitle:'README, arquitectura y acuerdos vivos.',icon:BookOpenText,art:'/images/coder-docs-v1.png',color:'#4ed9c3',stats:[['12','Secciones'],['4','Editores'],['Hoy','Actualizado']]},
  evaluaciones:{title:'Evaluaciones',subtitle:'Retos, evidencia y crecimiento técnico.',icon:Trophy,art:'/images/coder-evaluations-v1.png',color:'#ff9c62',stats:[['14','Completadas'],['6','Pendientes'],['420','XP ganado']]},
  perfil:{title:'Perfil de Laura',subtitle:'Tu recorrido dentro de B612.',icon:UserRound,art:'/images/coder-profile-v1.png',color:'#65b9ff',stats:[['Nivel 7','Explorador'],['12 días','Racha'],['620 XP','Progreso']]},
} as const

export function CoderSpacePage(){
  const {space:slug}=useParams()
  const space=spaces[slug as keyof typeof spaces]
  if(!space)return <Navigate to="/app/coder" replace/>
  const Icon=space.icon
  return <RoleShell role="Coder" name="Laura M."><Link className="coder-space-back" to="/app/coder"><ArrowLeft size={16}/> Volver a mis espacios</Link><header className="coder-space-hero coder-space-hero--vip" style={{'--space-color':space.color,'--space-art':`url(${space.art})`} as CSSProperties}><div><span><Icon/> Espacio de trabajo</span><h1>{space.title}</h1><p>{space.subtitle}</p></div><b>PROTO · SPRINT 04</b></header><div className="coder-space-stats coder-space-stats--vip">{space.stats.map(([value,label])=><article key={label}><Sparkles/><strong>{value}</strong><span>{label}</span></article>)}</div><CoderSpaceModule slug={slug||''}/></RoleShell>
}
