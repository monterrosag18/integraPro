import { Bell, BookOpenText, Building2, CalendarDays, ChartNoAxesCombined, ChevronDown, ClipboardCheck, Flower2 as Rose, FolderKanban, LayoutDashboard, LogOut, Orbit, PanelLeftClose, Search, Settings, Shuffle, Sparkles, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

type Role = 'Admin' | 'TL' | 'Líder' | 'Coder'
type MenuItem = { label: string; slug: string; icon: typeof LayoutDashboard }

const menus: Record<Role, MenuItem[]> = {
  Admin: [{ label:'Resumen',slug:'',icon:LayoutDashboard },{ label:'Campus',slug:'campus',icon:Building2 },{ label:'Cohortes',slug:'cohortes',icon:Users },{ label:'Clanes',slug:'clanes',icon:Orbit },{ label:'Usuarios',slug:'usuarios',icon:Users },{ label:'Criterios',slug:'criterios',icon:ClipboardCheck }],
  TL: [{ label:'Resumen',slug:'',icon:LayoutDashboard },{ label:'Sprints',slug:'sprints',icon:CalendarDays },{ label:'Rotación',slug:'rotacion',icon:Shuffle },{ label:'Células',slug:'celulas',icon:Orbit },{ label:'Evaluaciones',slug:'evaluaciones',icon:ChartNoAxesCombined },{ label:'La Rosa',slug:'rosa',icon:Rose },{ label:'Documentación',slug:'documentacion',icon:BookOpenText }],
  Líder: [{ label:'Mi célula',slug:'',icon:Orbit },{ label:'Proyecto',slug:'proyecto',icon:FolderKanban },{ label:'Backlog',slug:'backlog',icon:ClipboardCheck },{ label:'Tablero',slug:'tablero',icon:LayoutDashboard },{ label:'Ceremonias',slug:'ceremonias',icon:CalendarDays },{ label:'Evaluaciones',slug:'evaluaciones',icon:ChartNoAxesCombined }],
  Coder: [{ label:'Resumen',slug:'',icon:LayoutDashboard },{ label:'Sprint',slug:'sprint',icon:CalendarDays },{ label:'Proyectos',slug:'proyectos',icon:FolderKanban },{ label:'Tablero',slug:'tablero',icon:LayoutDashboard },{ label:'Ceremonias',slug:'ceremonias',icon:Sparkles },{ label:'Documentación',slug:'documentacion',icon:BookOpenText },{ label:'Evaluaciones',slug:'evaluaciones',icon:ClipboardCheck },{ label:'Mi perfil',slug:'perfil',icon:Users }],
}

export function RoleShell({ role, name, children }: { role: Role; name: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2)

  const roleClass = role === 'Líder' ? 'leader' : role.toLowerCase()
  const rolePath = role === 'Líder' ? 'leader' : role.toLowerCase()
  return (
    <div className={`app-shell app-shell--premium role-${roleClass} ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <aside className="sidebar sidebar--premium">
        <div className="sidebar-brand-row"><Link className="brand" to="/"><span>B</span><div>B612<small>Scrum Universe</small></div></Link><button aria-label="Contraer menú" onClick={() => setCollapsed(!collapsed)}><PanelLeftClose size={18} /></button></div>
        <div className="profile profile--premium"><div className="profile__avatar">{initials}<i /></div><div><strong>{name}</strong><span>{role} · Online</span></div><ChevronDown size={16} /></div>
        <div className="context-card context-card--planet"><div className="mini-planet" /><div><span>Contexto actual</span><strong>Van Rossum</strong><small>Célula Cosmos · Sprint 04</small></div></div>
        <nav aria-label={`Navegación de ${role}`}>{menus[role].map(({ label, slug, icon: Icon }) => {const path=`/app/${rolePath}${slug?`/${slug}`:''}`;const active=location.pathname===path;return <Link className={active?'nav-item nav-item--active':'nav-item'} to={path} key={label}><Icon size={18}/><span>{label}</span>{active&&<i/>}</Link>})}</nav>
        <div className="sidebar-rose"><div><Rose size={28} /><span>La Rosa</span></div><p>El crecimiento de tu equipo deja una huella.</p><div className="rose-progress"><i /></div><small>7 de 10 pétalos</small></div>
        <div className="sidebar-actions"><button><Settings size={17} /><span>Configuración</span></button><Link to="/login"><LogOut size={17} /><span>Cambiar rol</span></Link></div>
      </aside>
      <div className="app-main">
        <header className="topbar"><div className="global-search"><Search size={18} /><input aria-label="Buscar" placeholder="Buscar proyectos, coders, historias..." /><kbd>⌘ K</kbd></div><div className="topbar-actions"><button aria-label="Notificaciones"><Bell size={19} /><i>3</i></button><div className="topbar-divider" /><span className="topbar-role">Vista {role}</span></div></header>
        <main className="workspace workspace--premium">{children}</main>
      </div>
    </div>
  )
}
