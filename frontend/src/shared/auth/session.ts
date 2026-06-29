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

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
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
  return '/app/coder'
}
