import { Flame, Orbit, Sparkles } from 'lucide-react'
import { CoderResourceCards } from '../../features/workspace/components/CoderResourceCards'
import { RoleShell } from '../../shared/components/layout/RoleShell'

export function WorkspacePage() {
  return <RoleShell role="Coder" name="Laura M."><header className="coder-welcome"><div><p className="eyebrow">Célula Cosmos · Van Rossum</p><h1>Bienvenida, Laura <span>✦</span></h1><p>Continúa aprendiendo, construyendo y creciendo con tu tripulación.</p></div><div className="coder-welcome__status"><span><Flame/> 12 días de racha</span><div><small>Progreso del sprint</small><strong>76%</strong><i><b/></i></div></div></header><CoderResourceCards/><footer className="coder-quote"><Sparkles/><blockquote>“Lo esencial también vive en lo que construimos juntos.”</blockquote><div><Orbit/><span><small>Próximo hito</small><strong>Alcanza 1000 XP</strong></span><b>620 / 1000 XP</b></div></footer></RoleShell>
}
