import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const LandingPage = lazy(() => import('../../pages/landing/LandingPage').then(module => ({ default: module.LandingPage })))
const LoginPage = lazy(() => import('../../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })))
const AdminDashboardPage = lazy(() => import('../../pages/admin/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })))
const TlDashboardPage = lazy(() => import('../../pages/tl/TlDashboardPage').then(module => ({ default: module.TlDashboardPage })))
const LeaderDashboardPage = lazy(() => import('../../pages/leader/LeaderDashboardPage').then(module => ({ default: module.LeaderDashboardPage })))
const WorkspacePage = lazy(() => import('../../pages/workspace/WorkspacePage').then(module => ({ default: module.WorkspacePage })))
const CoderSpacePage = lazy(() => import('../../pages/workspace/CoderSpacePage').then(module => ({ default: module.CoderSpacePage })))
const PrototypeModulePage = lazy(() => import('../../pages/prototype/PrototypeModulePage').then(module => ({ default: module.PrototypeModulePage })))

export function AppRouter() {
  return (
    <Suspense fallback={<div className="route-loader"><span>B</span><p>Preparando tu universo...</p></div>}><Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app/admin" element={<AdminDashboardPage />} />
      <Route path="/app/admin/:section" element={<PrototypeModulePage role="Admin" />} />
      <Route path="/app/tl" element={<PrototypeModulePage role="TL" />} />
      <Route path="/app/tl/rotacion" element={<TlDashboardPage />} />
      <Route path="/app/tl/:section" element={<PrototypeModulePage role="TL" />} />
      <Route path="/app/leader" element={<LeaderDashboardPage />} />
      <Route path="/app/leader/tablero" element={<LeaderDashboardPage />} />
      <Route path="/app/leader/:section" element={<PrototypeModulePage role="Líder" />} />
      <Route path="/app/coder" element={<WorkspacePage />} />
      <Route path="/app/coder/:space" element={<CoderSpacePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  )
}
