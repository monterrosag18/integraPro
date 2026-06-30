import { lazy, Suspense, type ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getSession, roleHomePath, type UserRole } from '../../shared/auth/session'

const LandingPage = lazy(() => import('../../pages/landing/LandingPage').then(module => ({ default: module.LandingPage })))
const LoginPage = lazy(() => import('../../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })))
const AdminDashboardPage = lazy(() => import('../../pages/admin/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })))
const TlDashboardPage = lazy(() => import('../../pages/tl/TlDashboardPage').then(module => ({ default: module.TlDashboardPage })))
const TalentPassportPage = lazy(() => import('../../pages/admin/TalentPassportPage').then(module => ({ default: module.TalentPassportPage })))
const CoderSpacePage = lazy(() => import('../../pages/workspace/CoderSpacePage').then(module => ({ default: module.CoderSpacePage })))
const PrototypeModulePage = lazy(() => import('../../pages/prototype/PrototypeModulePage').then(module => ({ default: module.PrototypeModulePage })))

function RequireSession({ roles, children }: { roles: UserRole[]; children: ReactElement }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  if (!roles.includes(session.user.role)) return <Navigate to={session.user.homePath || roleHomePath(session.user.role)} replace />
  return children
}

export function AppRouter() {
  return (
    <Suspense fallback={<div className="route-loader"><span>B</span><p>Preparando tu universo...</p></div>}><Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app/admin" element={<RequireSession roles={['admin']}><AdminDashboardPage /></RequireSession>} />
      <Route path="/app/admin/talent-passport" element={<RequireSession roles={['admin']}><TalentPassportPage /></RequireSession>} />
      <Route path="/app/admin/:section" element={<RequireSession roles={['admin']}><PrototypeModulePage role="Admin" /></RequireSession>} />
      <Route path="/app/tl" element={<RequireSession roles={['tl']}><PrototypeModulePage role="TL" /></RequireSession>} />
      <Route path="/app/tl/rotacion" element={<RequireSession roles={['tl']}><TlDashboardPage /></RequireSession>} />
      <Route path="/app/tl/talent-passport" element={<Navigate to="/app/tl" replace />} />
      <Route path="/app/tl/:section" element={<RequireSession roles={['tl']}><PrototypeModulePage role="TL" /></RequireSession>} />
      <Route path="/app/leader" element={<Navigate to="/app/coder" replace />} />
      <Route path="/app/leader/tablero" element={<Navigate to="/app/coder" replace />} />
      <Route path="/app/leader/:section" element={<Navigate to="/app/coder" replace />} />
      <Route path="/app/coder" element={<RequireSession roles={['coder']}><Navigate to="/app/coder/tablero" replace /></RequireSession>} />
      <Route path="/app/coder/:space" element={<RequireSession roles={['coder']}><CoderSpacePage /></RequireSession>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  )
}
