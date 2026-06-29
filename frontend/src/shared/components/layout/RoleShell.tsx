import { Bell, BookOpenText, Building2, CalendarDays, ChartNoAxesCombined, ChevronDown, ClipboardCheck, Flower2 as Rose, FolderKanban, LayoutDashboard, LogOut, Orbit, PanelLeftClose, Search, Settings, Shuffle, Sparkles, Trophy, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../api/httpClient'
import { clearSession, getCurrentUser } from '../../auth/session'

type Role = 'Admin' | 'TL' | 'Líder' | 'Coder'
type MenuItem = { label: string; slug: string; icon: typeof LayoutDashboard }
type NotificationItem = { id: string; title: string; body: string; type: string; readAt: string | null; createdAt: string }

const menus: Record<Role, MenuItem[]> = {
  Admin: [{ label:'Resumen',slug:'',icon:LayoutDashboard },{ label:'Talent Passport',slug:'talent-passport',icon:Trophy },{ label:'Campus',slug:'campus',icon:Building2 },{ label:'Cohortes',slug:'cohortes',icon:Users },{ label:'Clanes',slug:'clanes',icon:Orbit },{ label:'Usuarios',slug:'usuarios',icon:Users },{ label:'Criterios',slug:'criterios',icon:ClipboardCheck }],
  TL: [{ label:'Resumen',slug:'',icon:LayoutDashboard },{ label:'Sprints',slug:'sprints',icon:CalendarDays },{ label:'Rotación',slug:'rotacion',icon:Shuffle },{ label:'Células',slug:'celulas',icon:Orbit },{ label:'Evaluaciones',slug:'evaluaciones',icon:ChartNoAxesCombined },{ label:'La Rosa',slug:'rosa',icon:Rose },{ label:'Documentación',slug:'documentacion',icon:BookOpenText }],
  Líder: [{ label:'Mi célula',slug:'',icon:Orbit },{ label:'Proyecto',slug:'proyecto',icon:FolderKanban },{ label:'Backlog',slug:'backlog',icon:ClipboardCheck },{ label:'Tablero',slug:'tablero',icon:LayoutDashboard },{ label:'Ceremonias',slug:'ceremonias',icon:CalendarDays },{ label:'Evaluaciones',slug:'evaluaciones',icon:ChartNoAxesCombined }],
  Coder: [{ label:'Resumen',slug:'',icon:LayoutDashboard },{ label:'Sprint',slug:'sprint',icon:CalendarDays },{ label:'Proyectos',slug:'proyectos',icon:FolderKanban },{ label:'Tablero',slug:'tablero',icon:LayoutDashboard },{ label:'Ceremonias',slug:'ceremonias',icon:Sparkles },{ label:'Documentación',slug:'documentacion',icon:BookOpenText },{ label:'Evaluaciones',slug:'evaluaciones',icon:ClipboardCheck },{ label:'Mi perfil',slug:'perfil',icon:Users }],
}

export function RoleShell({ role, name, children }: { role: Role; name: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [notice, setNotice] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const user = getCurrentUser()
  const displayName = user?.fullName || name
  const contextTitle = user?.clan || user?.campus || 'Van Rossum'
  const contextDetail = [user?.cell, user?.cohort].filter(Boolean).join(' · ') || 'Célula Cosmos · Sprint activo'
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2)

  useEffect(() => {
    if (!user?.id) return
    apiRequest<{ unread: number; notifications: NotificationItem[] }>(`/notifications?userId=${user.id}`)
      .then((payload) => {
        setNotifications(payload.notifications)
        setUnread(payload.unread)
      })
      .catch(() => {
        setNotifications([])
        setUnread(0)
      })
  }, [user?.id])

  const roleClass = role === 'Líder' ? 'leader' : role.toLowerCase()
  const rolePath = role === 'Líder' ? 'leader' : role.toLowerCase()
  const searchableItems = useMemo(() => menus[role].map(item => ({
    ...item,
    path: `/app/${rolePath}${item.slug ? `/${item.slug}` : ''}`,
  })), [role, rolePath])
  const searchResults = query.trim()
    ? searchableItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : []
  const toast = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const runSearch = () => {
    if (searchResults[0]) {
      navigate(searchResults[0].path)
      setQuery('')
    } else if (query.trim()) {
      toast(`No encontré "${query}" en esta vista`)
    }
  }

  const markNotificationsRead = () => {
    if (!user?.id) return
    apiRequest<{ updated: number }>('/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ userId: user.id }),
    })
      .then(() => {
        setUnread(0)
        setNotifications(current => current.map(item => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
        toast('Notificaciones marcadas como leídas')
      })
      .catch(() => toast('No pude actualizar notificaciones ahora'))
  }

  return (
    <div className={`app-shell app-shell--premium role-${roleClass} ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <aside className="sidebar sidebar--premium">
        <div className="sidebar-brand-row"><Link className="brand" to="/"><span>B</span><div>B612<small>Scrum Universe</small></div></Link><button aria-label="Contraer menú" onClick={() => setCollapsed(!collapsed)}><PanelLeftClose size={18} /></button></div>
        <button className="profile profile--premium profile--button" onClick={() => setShowSettings(true)}><div className="profile__avatar">{initials}<i /></div><div><strong>{displayName}</strong><span>{role} · Online</span></div><ChevronDown size={16} /></button>
        <div className="context-card context-card--planet"><div className="mini-planet" /><div><span>Contexto actual</span><strong>{contextTitle}</strong><small>{contextDetail}</small></div></div>
        <nav aria-label={`Navegación de ${role}`}>{menus[role].map(({ label, slug, icon: Icon }) => {const path=`/app/${rolePath}${slug?`/${slug}`:''}`;const active=location.pathname===path;return <Link className={active?'nav-item nav-item--active':'nav-item'} to={path} key={label}><Icon size={18}/><span>{label}</span>{active&&<i/>}</Link>})}</nav>
        <div className="sidebar-rose"><div><Rose size={28} /><span>La Rosa</span></div><p>El crecimiento de tu equipo deja una huella.</p><div className="rose-progress"><i /></div><small>7 de 10 pétalos</small></div>
        <div className="sidebar-actions"><button onClick={() => setShowSettings(true)}><Settings size={17} /><span>Configuración</span></button><Link to="/login" onClick={clearSession}><LogOut size={17} /><span>Salir</span></Link></div>
      </aside>
      <div className="app-main">
        <header className="topbar"><div className="global-search"><Search size={18} /><input ref={searchRef} aria-label="Buscar" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') runSearch(); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') searchRef.current?.focus() }} placeholder="Buscar proyectos, coders, historias..." /><kbd onClick={() => searchRef.current?.focus()}>⌘ K</kbd>{searchResults.length > 0 && <div className="global-search-results">{searchResults.map(({ label, path, icon: Icon }) => <button key={path} onMouseDown={() => { navigate(path); setQuery('') }}><Icon size={15}/><span>{label}</span><small>{path}</small></button>)}</div>}</div><div className="topbar-actions"><button aria-label="Notificaciones" onClick={() => setShowNotifications(true)}><Bell size={19} />{unread > 0 && <i>{unread}</i>}</button><div className="topbar-divider" /><span className="topbar-role">Vista {role}</span></div></header>
        <main className="workspace workspace--premium">{children}</main>
      </div>
      {showNotifications && <div className="modal-backdrop" onMouseDown={() => setShowNotifications(false)}><section className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()}><p className="eyebrow">Centro de avisos</p><h2>Notificaciones</h2>{notifications.length === 0 && <p>No hay avisos activos para esta sesión.</p>}{notifications.map(item => <button type="button" className="notification-row" key={item.id} onClick={() => toast(item.title)}><Bell size={16}/><span><strong>{item.title}</strong><small>{item.body}</small></span>{!item.readAt && <i/>}</button>)}<div><button className="ghost-small" onClick={() => setShowNotifications(false)}>Cerrar</button><button className="primary-button" onClick={() => { setShowNotifications(false); markNotificationsRead() }}>Marcar leídas</button></div></section></div>}
      {showSettings && <div className="modal-backdrop" onMouseDown={() => setShowSettings(false)}><form className="modal-card modal-card--side" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); setShowSettings(false); toast('Preferencias guardadas en esta sesión') }}><p className="eyebrow">Preferencias</p><h2>Configuración de {displayName}</h2><label>Nombre visible<input defaultValue={displayName}/></label><label>Vista inicial<select defaultValue={location.pathname}><option value={location.pathname}>Vista actual</option>{searchableItems.map(item => <option value={item.path} key={item.path}>{item.label}</option>)}</select></label><label className="toggle-row"><input type="checkbox" defaultChecked/> Activar notificaciones del sprint</label><label className="toggle-row"><input type="checkbox" defaultChecked/> Modo premium visual</label><div><button type="button" className="ghost-small" onClick={() => setShowSettings(false)}>Cancelar</button><button className="primary-button">Guardar cambios</button></div></form></div>}
      {notice && <div className="prototype-toast"><Sparkles size={17}/>{notice}</div>}
    </div>
  )
}
