export type UserRole = 'admin' | 'tl' | 'coder'

export type AuthUser = {
  id: string
  fullName: string
  email: string
  role: UserRole
  homePath: string
  campus?: string | null
  cohort?: string | null
  clan?: string | null
  cell?: string | null
}

export type AuthSession = {
  sessionToken: string
  user: AuthUser
}

const SESSION_KEY = 'b612.session'

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<AuthSession>
  return Boolean(
    session.sessionToken &&
      session.user &&
      typeof session.user === 'object' &&
      session.user.id &&
      session.user.role &&
      session.user.homePath,
  )
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as unknown
    if (!isAuthSession(session)) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getCurrentUser(): AuthUser | null {
  return getSession()?.user ?? null
}

export function roleHomePath(role: string) {
  if (role === 'admin') return '/app/admin/talent-passport'
  if (role === 'tl') return '/app/tl'
  return '/app/coder/tablero'
}
