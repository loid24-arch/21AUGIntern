import { useState } from 'react'
import StudentDashboard from './pages/StudentDashboard.jsx'
import MentorDashboard from './pages/MentorDashboard.jsx'
import CompanyDashboard from './pages/CompanyDashboard.jsx'
import TraningPlacementDashboard from './pages/Traning&PlacementDashboard.jsx'

function App() {
  const [navOpen, setNavOpen] = useState(false)
  const savedSession = JSON.parse(localStorage.getItem('internveri_session') || 'null')
  const [role, setRole] = useState(savedSession?.role || 'student')
  const [isRegister, setIsRegister] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(savedSession))

  const [email, setEmail] = useState(savedSession?.email || '')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState(savedSession?.user_id || null)

  const toggleNav = () => {
    setNavOpen((value) => !value)
  }

  const roleLabel =
    role === 'student'
      ? 'Student'
      : role === 'company'
        ? 'Company'
        : role === 'training'
          ? 'Training & Placement'
          : 'Mentor'

  const roleDescription =
    role === 'student'
      ? 'Sign in to manage applications, deadlines, and internship progress.'
      : role === 'company'
        ? 'Sign in to manage internships, applications, and candidate reviews.'
        : role === 'training'
          ? 'Sign in to verify internships, companies, students, and project submissions.'
          : 'Sign in to review assignments, mentor students, and track internship activities.'

  const handleLogin = async (event) => {
    event.preventDefault()
    setMessage('Logging in...')

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      })

      let data = null
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        data = await response.json()
      }

      if (response.ok) {
        setMessage(data?.message || 'Login successful')

        const nextRole = (data?.role || role).toLowerCase()

        setRole(nextRole)
        setEmail(data?.email || email)
        setUserId(data?.user_id || null)
        const session = { user_id: data?.user_id, email: data?.email || email, role: nextRole }
        localStorage.setItem('internveri_session', JSON.stringify(session))
        setIsLoggedIn(true)
      } else {
        const messageFromResponse = data?.detail || data?.message

        const statusMessage =
          response.status === 502
            ? 'Cannot connect to backend. Start the API server at http://127.0.0.1:8000.'
            : response.statusText

        setMessage(
          messageFromResponse || statusMessage || 'Login failed'
        )
      }
    } catch (error) {
      console.error(error)
      setMessage('Cannot connect to backend')
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setMessage('Creating account...')

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      })

      let data = null
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        data = await response.json()
      }

      if (response.ok) {
        setMessage(
          'Registration successful! You can now login.'
        )

        setIsRegister(false)
        setPassword('')
      } else {
        const messageFromResponse = data?.detail || data?.message

        const statusMessage =
          response.status === 502
            ? 'Cannot connect to backend. Start the API server at http://127.0.0.1:8000.'
            : response.statusText

        setMessage(
          messageFromResponse ||
            statusMessage ||
            'Registration failed'
        )
      }
    } catch (error) {
      console.error(error)
      setMessage('Cannot connect to backend')
    }
  }

  const openRegister = () => {
    setIsRegister(true)
    setMessage('')
  }

  const openLogin = () => {
    setIsRegister(false)
    setMessage('')
  }

  const handleLogout = () => {
    localStorage.removeItem('internveri_session')
    setIsLoggedIn(false)
    setEmail('')
    setPassword('')
    setUserId(null)
    setMessage('')
    setIsRegister(false)
    setRole('student')
  }

  if (isLoggedIn && role === 'student') {
    return (
      <StudentDashboard
        email={email}
        userId={userId}
        onLogout={handleLogout}
      />
    )
  }

  if (isLoggedIn && role === 'mentor') {
    return (
      <MentorDashboard
        email={email}
        userId={userId}
        onLogout={handleLogout}
      />
    )
  }

  if (isLoggedIn && role === 'company') {
    return (
      <CompanyDashboard
        email={email}
        userId={userId}
        onLogout={handleLogout}
      />
    )
  }

  if (isLoggedIn && role === 'training') {
    return (
      <TraningPlacementDashboard
        email={email}
        userId={userId}
        onLogout={handleLogout}
      />
    )
  }

  const roleIcon =
    role === 'student' ? '◫' : role === 'company' ? '◭' : role === 'training' ? '▣' : '◍'

  return (
    <div className="landing">
      <header className="landing-topbar">
        <div className="landing-brand">
          <span className="landing-mark">IV</span>

          <div>
            <div className="landing-brand-name">InternVeri</div>
            <div className="landing-brand-tag">Verify. Connect. Grow.</div>
          </div>
        </div>

        <nav className={`landing-nav ${navOpen ? 'active' : ''}`}>
          <a href="#home" className="landing-nav-link">Home</a>
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#about" className="landing-nav-link">About</a>
          <a href="#contact" className="landing-nav-link">Contact</a>
        </nav>

        <button
          className="landing-nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={navOpen}
          onClick={toggleNav}
        >
          ☰
        </button>
      </header>

      <main className="landing-shell">
        <section className="landing-pitch" id="home">
          <span className="landing-badge">◔ Now live for four campus roles</span>

          <h1>Your internship journey, verified end to end.</h1>

          <p>
            InternVeri brings students, mentors, companies, and the Training &amp; Placement
            cell onto one connected platform — real applications, real reporting, real
            progress, with an AI mentor along the way.
          </p>

          <div className="landing-highlights" id="features">
            <div className="landing-highlight">
              <span className="landing-highlight-icon">◎</span>
              <div>
                <strong>One dashboard per role</strong>
                <span>Purpose-built workspaces for students, mentors, companies, and T&amp;P.</span>
              </div>
            </div>
            <div className="landing-highlight">
              <span className="landing-highlight-icon">◍</span>
              <div>
                <strong>Mentor AI, built in</strong>
                <span>Career guidance, roadmaps, and support without leaving the platform.</span>
              </div>
            </div>
            <div className="landing-highlight">
              <span className="landing-highlight-icon">✉</span>
              <div>
                <strong>Verified paperwork</strong>
                <span>Daily reports, certificates, and consent letters — tracked automatically.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="login-section" id="login">
          <div className="auth-card">
            <div className="auth-roles" role="tablist" aria-label="User roles">
              <button
                type="button"
                className={`auth-role-btn ${role === 'student' ? 'active' : ''}`}
                onClick={() => setRole('student')}
              >
                Student
              </button>

              <button
                type="button"
                className={`auth-role-btn ${role === 'company' ? 'active' : ''}`}
                onClick={() => setRole('company')}
              >
                Company
              </button>

              <button
                type="button"
                className={`auth-role-btn ${role === 'training' ? 'active' : ''}`}
                onClick={() => setRole('training')}
              >
                Training
              </button>

              <button
                type="button"
                className={`auth-role-btn ${role === 'mentor' ? 'active' : ''}`}
                onClick={() => setRole('mentor')}
              >
                Mentor
              </button>
            </div>

            <h2>
              {roleIcon} {isRegister ? `Create ${roleLabel} Account` : `Login as ${roleLabel}`}
            </h2>

            <p>
              {isRegister
                ? `Create your ${roleLabel.toLowerCase()} account on InternVeri.`
                : roleDescription}
            </p>

            <form
              className="auth-form"
              onSubmit={isRegister ? handleRegister : handleLogin}
            >
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button type="submit" className="auth-submit">
                {isRegister ? 'Create Account' : `Login as ${roleLabel}`}
              </button>

              {!isRegister ? (
                <p className="auth-switch">
                  New here?{' '}
                  <button type="button" onClick={openRegister}>
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="auth-switch">
                  Already have an account?{' '}
                  <button type="button" onClick={openLogin}>
                    Login
                  </button>
                </p>
              )}

              {message && <p className="auth-message">{message}</p>}
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App  
