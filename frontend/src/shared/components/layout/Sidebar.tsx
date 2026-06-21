const navigation = ['Resumen', 'Sprint', 'Proyectos', 'Tablero', 'Ceremonias', 'Evaluaciones']

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="profile">
        <div className="profile__avatar">LM</div>
        <div><strong>Laura M.</strong><span>Coder rotador</span></div>
      </div>
      <div className="context-card"><span>Clan</span><strong>B612 · Van Rossum</strong></div>
      <nav aria-label="Navegación principal">
        {navigation.map((item, index) => (
          <button className={index === 0 ? 'nav-item nav-item--active' : 'nav-item'} type="button" key={item}>{item}</button>
        ))}
      </nav>
      <blockquote>“Lo esencial es invisible a los ojos.”</blockquote>
    </aside>
  )
}
