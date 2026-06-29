import { Link, useLocation } from 'react-router-dom'

const navigation = [
  ['Resumen', '/app/coder'],
  ['Sprint', '/app/coder/sprint'],
  ['Proyectos', '/app/coder/proyectos'],
  ['Tablero', '/app/coder/tablero'],
  ['Ceremonias', '/app/coder/ceremonias'],
  ['Evaluaciones', '/app/coder/evaluaciones'],
]

export function Sidebar() {
  const location = useLocation()
  return (
    <aside className="sidebar">
      <div className="profile">
        <div className="profile__avatar">LM</div>
        <div><strong>Laura M.</strong><span>Coder rotador</span></div>
      </div>
      <div className="context-card"><span>Clan</span><strong>B612 · Van Rossum</strong></div>
      <nav aria-label="Navegación principal">
        {navigation.map(([item, path]) => (
          <Link className={location.pathname === path ? 'nav-item nav-item--active' : 'nav-item'} to={path} key={path}>{item}</Link>
        ))}
      </nav>
      <blockquote>“Lo esencial es invisible a los ojos.”</blockquote>
    </aside>
  )
}
