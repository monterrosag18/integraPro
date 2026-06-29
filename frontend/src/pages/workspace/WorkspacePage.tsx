import { Flame, Orbit, Sparkles } from 'lucide-react'
import { CoderResourceCards } from '../../features/workspace/components/CoderResourceCards'
import { getCurrentUser } from '../../shared/auth/session'
import { RoleShell } from '../../shared/components/layout/RoleShell'

export function WorkspacePage() {
  const user = getCurrentUser()
  const firstName = user?.fullName.split(' ')[0] ?? 'Coder'
  const context = [user?.cell, user?.clan].filter(Boolean).join(' · ') || 'Tu célula · Tu clan'
  return <RoleShell role="Coder" name={user?.fullName ?? 'Coder B612'}><header className="coder-welcome"><div><p className="eyebrow">{context}</p><h1>Bienvenida/o, {firstName} <span>✦</span></h1><p>Continúa aprendiendo, construyendo y creciendo con tu tripulación.</p></div><div className="coder-welcome__status"><span><Flame/> Sesión real</span><div><small>Progreso del sprint</small><strong>DB</strong><i><b/></i></div></div></header><CoderResourceCards/><footer className="coder-quote"><Sparkles/><blockquote>“Lo esencial también vive en lo que construimos juntos.”</blockquote><div><Orbit/><span><small>Próximo hito</small><strong>Alcanza 1000 XP</strong></span><b>620 / 1000 XP</b></div></footer></RoleShell>
}
