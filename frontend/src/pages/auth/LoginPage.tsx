import { ArrowLeft, ArrowRight, KeyRound, Loader2, Mail, Orbit, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../shared/api/httpClient'
import { roleHomePath, saveSession, type AuthSession } from '../../shared/auth/session'

type LoginResponse = AuthSession

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
      const session = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
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
