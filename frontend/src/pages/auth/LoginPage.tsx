import { ArrowLeft, ArrowRight, KeyRound, Loader2, Mail, Orbit, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../shared/api/httpClient'
import { roleHomePath, saveSession, type AuthSession, type AuthUser, type UserRole } from '../../shared/auth/session'

type LoginPayload = {
  sessionToken?: string
  SessionToken?: string
  user?: Partial<LoginUserPayload>
  User?: Partial<LoginUserPayload>
  accessToken?: string
  AccessToken?: string
  token?: string
  Token?: string
  jwt?: string
  Jwt?: string
  id?: string
  Id?: string
  userId?: string
  UserId?: string
  fullName?: string
  FullName?: string
  name?: string
  Name?: string
  firstName?: string
  FirstName?: string
  lastName?: string
  LastName?: string
  email?: string
  Email?: string
  role?: string
  Role?: string
  homePath?: string
  HomePath?: string
  campus?: string | null
  Campus?: string | null
  cohort?: string | null
  Cohort?: string | null
  clan?: string | null
  Clan?: string | null
  cell?: string | null
  Cell?: string | null
}

type LoginUserPayload = Partial<AuthUser> & {
  Id?: string
  userId?: string
  UserId?: string
  FullName?: string
  name?: string
  Name?: string
  firstName?: string
  FirstName?: string
  lastName?: string
  LastName?: string
  Email?: string
  Role?: string
  HomePath?: string
  Campus?: string | null
  Cohort?: string | null
  Clan?: string | null
  Cell?: string | null
  sessionToken?: string
  SessionToken?: string
  accessToken?: string
  AccessToken?: string
  token?: string
  Token?: string
}

type JwtClaims = Record<string, string | number | boolean | undefined>

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
const NAME_ID_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'

function normalizeRole(role?: string): UserRole {
  const value = String(role ?? 'coder').toLowerCase()
  if (value === 'admin') return 'admin'
  if (value === 'tl' || value === 'teamleader' || value === 'team_leader') return 'tl'
  return 'coder'
}

function firstValue(...values: unknown[]) {
  const value = values.find(item => item !== undefined && item !== null && String(item).trim() !== '')
  return value === undefined ? undefined : String(value)
}

function compactName(...parts: Array<string | undefined>) {
  return parts.map(part => String(part ?? '').trim()).filter(Boolean).join(' ')
}

function decodeJwtClaims(token: string): JwtClaims {
  const [, encodedPayload] = token.split('.')
  if (!encodedPayload) return {}

  try {
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const json = decodeURIComponent(
      Array.from(binary)
        .map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    return JSON.parse(json) as JwtClaims
  } catch {
    return {}
  }
}

function normalizeSession(payload: LoginPayload, fallbackEmail: string): AuthSession {
  const rawUser = payload.user ?? payload.User ?? {}
  const sessionToken = String(
    firstValue(
      payload.sessionToken,
      payload.SessionToken,
      payload.accessToken,
      payload.AccessToken,
      payload.token,
      payload.Token,
      payload.jwt,
      payload.Jwt,
      rawUser.sessionToken,
      rawUser.SessionToken,
      rawUser.accessToken,
      rawUser.AccessToken,
      rawUser.token,
      rawUser.Token,
    ) ?? '',
  )
  const claims = decodeJwtClaims(sessionToken)
  const role = normalizeRole(firstValue(rawUser.role, rawUser.Role, payload.role, payload.Role, claims.role, claims.Role, claims[ROLE_CLAIM]))
  const fullName =
    rawUser.fullName ??
    rawUser.FullName ??
    rawUser.name ??
    rawUser.Name ??
    payload.fullName ??
    payload.FullName ??
    payload.name ??
    payload.Name ??
    compactName(rawUser.firstName ?? rawUser.FirstName ?? payload.firstName ?? payload.FirstName, rawUser.lastName ?? rawUser.LastName ?? payload.lastName ?? payload.LastName)
  const email = firstValue(rawUser.email, rawUser.Email, payload.email, payload.Email, claims.email, claims.Email, fallbackEmail) ?? ''
  const user: AuthUser = {
    id: firstValue(rawUser.id, rawUser.Id, rawUser.userId, rawUser.UserId, payload.userId, payload.UserId, payload.id, payload.Id, claims.user_id, claims.sub, claims[NAME_ID_CLAIM]) ?? '',
    fullName: fullName || email || 'B612 User',
    email,
    role,
    homePath: String(rawUser.homePath ?? rawUser.HomePath ?? payload.homePath ?? payload.HomePath ?? roleHomePath(role)),
    campus: rawUser.campus ?? rawUser.Campus ?? payload.campus ?? payload.Campus ?? null,
    cohort: rawUser.cohort ?? rawUser.Cohort ?? payload.cohort ?? payload.Cohort ?? null,
    clan: rawUser.clan ?? rawUser.Clan ?? payload.clan ?? payload.Clan ?? null,
    cell: rawUser.cell ?? rawUser.Cell ?? payload.cell ?? payload.Cell ?? null,
  }

  if (!sessionToken || !user.id) {
    throw new Error('Login response is missing session data.')
  }

  return { sessionToken, user }
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = await apiRequest<LoginPayload>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      const session = normalizeSession(payload, email)
      saveSession(session)
      navigate(session.user.homePath || roleHomePath(session.user.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not enter the universe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-v2 login-v2--real">
      <div className="login-v2__art">
        <Link className="brand" to="/"><span>B</span><div>B612<small>Scrum Universe</small></div></Link>
        <div className="login-constellation">
          <div className="login-planet"><Orbit /></div>
          <span className="constellation-dot d1" />
          <span className="constellation-dot d2" />
          <span className="constellation-dot d3" />
        </div>
        <div className="login-quote">
          <span>“</span>
          <p>The universe recognizes your role and opens only your assigned view.</p>
        </div>
      </div>

      <section className="login-v2__panel">
        <Link className="back-link" to="/"><ArrowLeft /> Back to the universe</Link>
        <div className="login-heading">
          <p className="eyebrow">Real B612 access</p>
          <h1>Enter your planet</h1>
          <p>Use your assigned email and password. There is no sign-up flow: your role comes directly from the database.</p>
        </div>

        <form className="real-login-form" onSubmit={submit}>
          <label>
            <span><Mail /> Institutional email</span>
            <input
              autoComplete="email"
              inputMode="email"
              placeholder="tu.correo@b612.dev"
              required
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
          </label>
          <label>
            <span><KeyRound /> Password</span>
            <input
              autoComplete="current-password"
              placeholder="••••••••"
              required
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </label>

          {error && <div className="login-error"><ShieldCheck /> {error}</div>}

          <button className="primary-button login-submit" disabled={loading}>
            {loading ? <Loader2 className="spin" /> : <Sparkles />}
            {loading ? 'Validating orbit...' : 'Enter the universe'}
            {!loading && <ArrowRight />}
          </button>
        </form>

        <div className="login-note login-note--real">
          <ShieldCheck />
          <span>The app queries remote PostgreSQL and redirects by role: admin, TL, or coder.</span>
        </div>
      </section>
    </main>
  )
}
