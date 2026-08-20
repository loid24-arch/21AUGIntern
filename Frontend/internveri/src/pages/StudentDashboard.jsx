import React, { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import HeroBanner from '../components/HeroBanner.jsx'
import { EmptyState, StatusChip, StatTile } from '../components/ui.jsx'


export default function StudentDashboard({
  email,
  userId,
  onLogout,
}) {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [internships, setInternships] = useState([])
  const [savedInternships, setSavedInternships] = useState([])
  const [progress, setProgress] = useState([])
  const [deadlines, setDeadlines] = useState([])
  const [showExplorer, setShowExplorer] = useState(false)
  const [explorerQuery, setExplorerQuery] = useState('')
  const [showMentorAI, setShowMentorAI] = useState(false)
  const [showDailyReports, setShowDailyReports] = useState(false)
  const [showMyInternship, setShowMyInternship] = useState(false)
  const [internshipSummary, setInternshipSummary] = useState(null)
  const [internshipSummaryLoading, setInternshipSummaryLoading] = useState(false)
  const [internshipSummaryError, setInternshipSummaryError] = useState('')
  const [dailyReports, setDailyReports] = useState([])
  const [dailyReportLoading, setDailyReportLoading] = useState(false)
  const [dailyReportError, setDailyReportError] = useState('')
  const [dailyReportForm, setDailyReportForm] = useState({ work_done: '', challenges: '', hours_worked: '' })

  // ROADMAPS
  const [showRoadmaps, setShowRoadmaps] = useState(false)
  const [roadmaps, setRoadmaps] = useState([])
  const [selectedRoadmap, setSelectedRoadmap] = useState(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [roadmapError, setRoadmapError] = useState('')

  // RESOURCES
  const [showResources, setShowResources] = useState(false)
  const [resources, setResources] = useState([])
  const [savedResources, setSavedResources] = useState([])
  const [resourceLoading, setResourceLoading] = useState(false)
  const [resourceError, setResourceError] = useState('')
  const [showSavedResources, setShowSavedResources] = useState(false)

  // AUTO CONSENT LETTER
  const [showConsent, setShowConsent] = useState(false)
  const [consentLetters, setConsentLetters] = useState([])
  const [consentLoading, setConsentLoading] = useState(false)
  const [consentError, setConsentError] = useState('')
  const [rejectingApplication, setRejectingApplication] = useState(null)
  const [rejectReason, setRejectReason] = useState('')


  // PROFILE
  const [showProfile, setShowProfile] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  // --------------------------------
  // FETCH STUDENT DASHBOARD
  // --------------------------------

  const fetchDashboard = async () => {


  console.log("fetchDashboard CALLED");
    if (!userId) return

    try {

      console.log("Dashboard userId:", userId);

      const response = await fetch(
  `/api/student/dashboard?user_id=${userId}`
)

      if (!response.ok) {
        throw new Error('Failed to load dashboard')
      }

      const data = await response.json()

      console.log('STUDENT DASHBOARD DATA:', data)

      console.log("STUDENT DEADLINES:", data.deadlines)

      setDeadlines(data.deadlines || [])


      const progressResponse = await fetch(
        `/api/student/internship-progress/all?user_id=${userId}`
      )

      console.log("PROGRESS API STATUS:", progressResponse.status)

      if (progressResponse.ok) {
        const progressData = await progressResponse.json()

        console.log('STUDENT PROGRESS:', progressData)

        setProgress(progressData)
      }

      const savedResponse = await fetch(
       `/api/student/saved-internships?user_id=${userId}`
      )

      if (savedResponse.ok) {
        const savedData = await savedResponse.json()

        console.log('SAVED INTERNSHIPS:', savedData)

        setSavedInternships(
          savedData.map(item => item.internship_id)
        )
      }

      setDashboardData(data)
      setError('')
    } catch (err) {
      console.error(err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------
  // LOAD DASHBOARD
  // --------------------------------

  useEffect(() => {
    fetchDashboard()
  }, [userId])

  // --------------------------------
  // FETCH INTERNSHIPS
  // --------------------------------

  useEffect(() => {
    const fetchInternships = async () => {
      try {
        const response = await fetch('/api/internships')

        if (!response.ok) {
          throw new Error('Failed to load internships')
        }

        const data = await response.json()

        console.log('INTERNSHIPS:', data)

        setInternships(data)
      } catch (err) {
        console.error(err)
      }
    }

    fetchInternships()
  }, [])

  // --------------------------------
  // ROADMAPS
  // --------------------------------

  const fetchRoadmaps = async () => {
    try {
      setRoadmapLoading(true)
      setRoadmapError('')

      const response = await fetch('/api/roadmaps')

      if (!response.ok) {
        throw new Error('Failed to load roadmaps')
      }

      const data = await response.json()
      setRoadmaps(Array.isArray(data) ? data : data.roadmaps || [])
    } catch (err) {
      console.error('Roadmap fetch error:', err)
      setRoadmapError(err.message || 'Failed to load roadmaps')
    } finally {
      setRoadmapLoading(false)
    }
  }

  const openRoadmap = async (roadmapId) => {
    try {
      setRoadmapLoading(true)
      setRoadmapError('')

      const response = await fetch(`/api/roadmaps/${roadmapId}`)

      if (!response.ok) {
        throw new Error('Failed to load roadmap details')
      }

      const data = await response.json()
      setSelectedRoadmap(data.roadmap || data)
    } catch (err) {
      console.error('Roadmap detail error:', err)
      setRoadmapError(err.message || 'Failed to load roadmap details')
    } finally {
      setRoadmapLoading(false)
    }
  }


  // --------------------------------
  // RESOURCES
  // --------------------------------

  const fetchResources = async () => {
    try {
      setResourceLoading(true)
      setResourceError('')

      const response = await fetch('/api/resources')
      if (!response.ok) throw new Error('Failed to load resources')

      const data = await response.json()
      setResources(Array.isArray(data) ? data : data.resources || [])
    } catch (err) {
      console.error('Resource fetch error:', err)
      setResourceError(err.message || 'Failed to load resources')
    } finally {
      setResourceLoading(false)
    }
  }

  const fetchSavedResources = async () => {
    try {
      setResourceLoading(true)
      setResourceError('')

      const response = await fetch(`/api/resources/saved/${userId}`)
      if (!response.ok) throw new Error('Failed to load saved resources')

      const data = await response.json()
      setSavedResources(Array.isArray(data) ? data : data.resources || data.saved_resources || [])
    } catch (err) {
      console.error('Saved resource fetch error:', err)
      setResourceError(err.message || 'Failed to load saved resources')
    } finally {
      setResourceLoading(false)
    }
  }

  const saveResource = async (resourceId) => {
    try {
      const response = await fetch('/api/resources/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          resource_id: resourceId,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Failed to save resource')

      alert('Resource saved successfully')
    } catch (err) {
      console.error('Save resource error:', err)
      alert(err.message || 'Failed to save resource')
    }
  }

  // --------------------------------
  // MY INTERNSHIP
  // --------------------------------
  const fetchMyInternship = async () => {
    if (!userId) return
    try {
      setInternshipSummaryLoading(true)
      setInternshipSummaryError('')
      const response = await fetch(`/api/student/my-internship?user_id=${userId}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'Failed to load internship tracker')
      setInternshipSummary(data)
    } catch (err) {
      setInternshipSummaryError(err.message || 'Failed to load internship tracker')
    } finally {
      setInternshipSummaryLoading(false)
    }
  }

  // --------------------------------
  // MENTOR AI - n8n CHAT
  // --------------------------------
  useEffect(() => {
    if (!showMentorAI) return

    const styleId = 'n8n-chat-style'
    if (!document.getElementById(styleId)) {
      const link = document.createElement('link')
      link.id = styleId
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css'
      document.head.appendChild(link)
    }

    let cancelled = false

    const startMentorAI = async () => {
      try {
        const { createChat } = await import(
          /* @vite-ignore */
          'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js'
        )

        if (cancelled) return

        const host = document.getElementById('mentor-ai-chat')
        if (!host || cancelled) return

        // Clear any stale widget markup before mounting.
        host.innerHTML = ''

        createChat({
          webhookUrl: 'https://sararaddy.app.n8n.cloud/webhook/922a6edf-7a90-4384-a032-e9b83b3aba95/chat',
          target: '#mentor-ai-chat',

          // "window" creates only the floating bubble. "fullscreen"
          // renders the complete chat UI inside our Mentor AI page.
          mode: 'fullscreen',

          showWelcomeScreen: true,
          allowFileUploads: true,
        })
      } catch (err) {
        console.error('Mentor AI failed to load:', err)
      }
    }

    startMentorAI()

    return () => {
      cancelled = true
    }
  }, [showMentorAI])

  // --------------------------------
  // DAILY REPORTS
  // --------------------------------
  const fetchDailyReports = async () => {
    if (!userId) return
    try {
      setDailyReportLoading(true); setDailyReportError('')
      const response = await fetch(`/api/student/daily-reports?user_id=${userId}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'Failed to load daily reports')
      setDailyReports(Array.isArray(data) ? data : data.reports || [])
    } catch (err) {
      setDailyReportError(err.message || 'Failed to load daily reports')
    } finally { setDailyReportLoading(false) }
  }

  const submitDailyReport = async (event) => {
    event.preventDefault()
    if (!dailyReportForm.work_done.trim()) { setDailyReportError('Please describe the work you completed today.'); return }
    try {
      setDailyReportLoading(true); setDailyReportError('')
      const response = await fetch('/api/student/daily-reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: userId,
          work_done: dailyReportForm.work_done.trim(),
          challenges: dailyReportForm.challenges.trim() || null,
          hours_worked: dailyReportForm.hours_worked === '' ? null : Number(dailyReportForm.hours_worked),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'Failed to submit daily report')
      setDailyReportForm({ work_done: '', challenges: '', hours_worked: '' })
      await fetchDailyReports()
    } catch (err) {
      setDailyReportError(err.message || 'Failed to submit daily report')
    } finally { setDailyReportLoading(false) }
  }

  // --------------------------------
  // AUTO CONSENT LETTER
  // --------------------------------

  const fetchConsentLetters = async () => {
    try {
      setConsentLoading(true)
      setConsentError('')

      const response = await fetch(`/api/consent-letters/student/${userId}`)
      if (!response.ok) throw new Error('Failed to load consent letters')

      const data = await response.json()
      setConsentLetters(Array.isArray(data) ? data : data.consent_letters || [])
    } catch (err) {
      console.error('Consent letter fetch error:', err)
      setConsentError(err.message || 'Failed to load consent letters')
    } finally {
      setConsentLoading(false)
    }
  }

  const submitOfferRejection = async () => {
    if (!rejectingApplication) return

    try {
      setConsentLoading(true)

      const response = await fetch('/api/applications/reject-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: rejectingApplication.application_id || rejectingApplication.id,
          reason: rejectReason || 'Personal reasons',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to reject offer')
      }

      alert('Offer rejected and consent letter generated successfully.')
      setRejectingApplication(null)
      setRejectReason('')
      await Promise.all([fetchConsentLetters(), fetchDashboard()])
    } catch (err) {
      console.error('Reject offer error:', err)
      alert(err.message || 'Failed to reject offer')
    } finally {
      setConsentLoading(false)
    }
  }

  // --------------------------------
  // APPLY FOR INTERNSHIP
  // --------------------------------

  const handleApply = async (internshipId) => {
    try {
      const response = await fetch(
        `/api/student/applications?user_id=${userId}&internship_id=${internshipId}`,
        {
          method: 'POST',
        }
      )

      const data = await response.json()

      if (response.ok) {
        alert('Application submitted successfully!')

        await fetchDashboard()
      } else {
        alert(data.detail || 'Failed to apply')
      }
    } catch (error) {
      console.error(error)
      alert('Cannot connect to backend')
    }
  }





  const handleSave = async (internshipId) => {
  try {
    const response = await fetch(
      `/api/student/saved-internships?user_id=${userId}&internship_id=${internshipId}`,
      {
        method: 'POST',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to save internship')
    }

    console.log('Internship saved:', data)

    setSavedInternships((prev) => [...new Set([...prev, internshipId])])
   } catch (error) {
    console.error('Save internship error:', error)
   }
  }


  // --------------------------------
  // SAVE STUDENT PROFILE
  // --------------------------------

  const saveStudentProfile = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form)
    payload.user_id = userId

    try {
      const response = await fetch(`/api/student/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save profile')
      }

      setProfileError('')
      setEditingProfile(false)
      await fetchDashboard()
    } catch (error) {
      console.error('Save profile error:', error)
      setProfileError(error.message || 'Failed to save profile')
    }
  }



  // --------------------------------
  // STUDENT SKILLS
  // --------------------------------

  const studentSkills =
    dashboardData?.profile?.skills
      ? dashboardData.profile.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
      : []

  // --------------------------------
  // PROFILE DATA
  // --------------------------------

  const profile = dashboardData?.profile

  // --------------------------------
  // DERIVED REAL-DATA METRICS
  // --------------------------------

  const applications = dashboardData?.applications || []

  const applicationStages = ['applied', 'shortlisted', 'interview', 'accepted']

  const readinessScore = useMemo(() => {
    let score = 0
    if (profile?.full_name) score += 15
    if (profile?.phone) score += 10
    if (profile?.college) score += 10
    if (profile?.department) score += 10
    if (profile?.cgpa) score += 15
    if (studentSkills.length > 0) score += 15
    if (profile?.github) score += 5
    if (profile?.linkedin) score += 5
    if (profile?.resume) score += 15
    return Math.min(score, 100)
  }, [profile, studentSkills])

  const applicationActivity = useMemo(() => {
    const cells = Array(35).fill(0)
    applications.forEach((application, index) => {
      cells[Math.max(0, cells.length - 1 - index)] = 1
    })
    return cells
  }, [applications])

  // --------------------------------
  // LOADING
  // --------------------------------

  if (loading) {
    return (
      <div className="workspace accent-teal">
        <main className="workspace-main">
          <div className="empty-card">
            <span className="empty-card-icon">◔</span>
            <h4>Loading your dashboard…</h4>
            <p>Pulling your applications, progress, and activity.</p>
          </div>
        </main>
      </div>
    )
  }

  // --------------------------------
  // NAVIGATION MODEL (presentation only — every handler below is unchanged)
  // --------------------------------

  const activeSection = showMyInternship
    ? 'my-internship'
    : showMentorAI
      ? 'mentor-ai'
      : showProfile
        ? 'profile'
        : showDailyReports
          ? 'daily-reports'
          : showResources
            ? 'resources'
            : showConsent
              ? 'consent'
              : showRoadmaps
                ? 'roadmaps'
                : showExplorer
                  ? 'explorer'
                  : 'dashboard'

  const goToDashboard = () => {
    setShowExplorer(false)
    setShowMentorAI(false)
    setShowMyInternship(false)
    setShowDailyReports(false)
    setShowProfile(false)
    setShowRoadmaps(false)
    setShowResources(false)
    setShowConsent(false)
  }

  const goToExplorer = () => {
    setShowExplorer(true)
    setShowProfile(false)
    setShowRoadmaps(false)
    setShowResources(false)
    setShowConsent(false)
  }

  const goToMentorAI = () => {
    setShowMentorAI(true)
    setShowMyInternship(false)
    setShowExplorer(false)
    setShowDailyReports(false)
    setShowProfile(false)
    setShowRoadmaps(false)
    setShowResources(false)
    setShowConsent(false)
  }

  const goToRoadmaps = () => {
    setShowRoadmaps(true)
    setShowExplorer(false)
    setShowProfile(false)
    setSelectedRoadmap(null)
    fetchRoadmaps()
  }

  const goToResources = () => {
    setShowResources(true)
    setShowRoadmaps(false)
    setShowExplorer(false)
    setShowProfile(false)
    setShowConsent(false)
    setShowSavedResources(false)
    fetchResources()
  }

  const goToMyInternship = () => {
    setShowMyInternship(true)
    setShowExplorer(false)
    setShowMentorAI(false)
    setShowDailyReports(false)
    setShowRoadmaps(false)
    setShowResources(false)
    setShowConsent(false)
    setShowProfile(false)
    fetchMyInternship()
  }

  const goToDailyReports = () => {
    setShowDailyReports(true)
    setShowMyInternship(false)
    setShowMentorAI(false)
    setShowExplorer(false)
    setShowRoadmaps(false)
    setShowResources(false)
    setShowConsent(false)
    setShowProfile(false)
    fetchDailyReports()
  }

  const goToConsent = () => {
    setShowConsent(true)
    setShowRoadmaps(false)
    setShowResources(false)
    setShowExplorer(false)
    setShowProfile(false)
    fetchConsentLetters()
  }

  const goToProfile = () => {
    setShowProfile(true)
    setShowExplorer(false)
    setShowRoadmaps(false)
    setShowResources(false)
    setShowConsent(false)
  }

  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: '◫', active: activeSection === 'dashboard', onClick: goToDashboard },
        { key: 'explorer', label: 'Explorer', icon: '◌', active: activeSection === 'explorer', onClick: goToExplorer },
        { key: 'mentor-ai', label: 'Mentor AI', icon: '◍', active: activeSection === 'mentor-ai', onClick: goToMentorAI },
        { key: 'my-internship', label: 'My Internship', icon: '◈', active: activeSection === 'my-internship', onClick: goToMyInternship },
        { key: 'tracker', label: 'Tracker', icon: '◭', active: false, onClick: undefined },
        { key: 'coding-streak', label: 'Coding Streak', icon: '◧', active: activeSection === 'my-internship', onClick: goToMyInternship },
      ],
    },
    {
      label: 'Growth',
      items: [
        { key: 'roadmaps', label: 'Roadmaps', icon: '▣', active: activeSection === 'roadmaps', onClick: goToRoadmaps },
        { key: 'resources', label: 'Resources', icon: '▤', active: activeSection === 'resources', onClick: goToResources },
      ],
    },
    {
      label: 'Reports & Docs',
      items: [
        { key: 'daily-reports', label: 'Daily Reports', icon: '▤', active: activeSection === 'daily-reports', onClick: goToDailyReports },
        { key: 'consent', label: 'Consent Letters', icon: '✉', active: activeSection === 'consent', onClick: goToConsent },
      ],
    },
    {
      label: 'Account',
      items: [
        { key: 'profile', label: 'Profile', icon: '◎', active: activeSection === 'profile', onClick: goToProfile },
      ],
    },
  ]

  const filteredExplorerInternships = internships.filter((item) => {
    const term = explorerQuery.trim().toLowerCase()
    if (!term) return true
    return `${item.title || ''} ${item.company || ''} ${item.location || ''}`.toLowerCase().includes(term)
  })

  // --------------------------------
  // MAIN DASHBOARD
  // --------------------------------

  return (
    <AppShell
      roleLabel="Student"
      identityLabel={profile?.full_name || email || 'Student'}
      accent="teal"
      navGroups={navGroups}
      onLogout={onLogout}
    >
      {error && (
        <div className="empty-card" style={{ marginBottom: 18 }}>
          <p>{error}</p>
        </div>
      )}

      {showMyInternship ? (

        /* =================================
            MY INTERNSHIP — command center
        ================================= */

        <>
          <HeroBanner
            eyebrow="INTERNSHIP COMMAND CENTER"
            heading="My Internship"
            subheading="Track internship progress, reporting consistency, activity, and your work journey in one place."
            actions={[{ key: 'back', label: 'Back to Dashboard', onClick: () => setShowMyInternship(false) }]}
          />

          {internshipSummaryLoading ? (
            <EmptyState icon="◔" title="Loading your internship tracker…" />
          ) : internshipSummaryError ? (
            <EmptyState icon="⚠" title="Couldn't load your tracker" message={internshipSummaryError} action={{ label: 'Retry', onClick: fetchMyInternship }} />
          ) : internshipSummary ? (
            <>
              <div className="stat-tile-row">
                <StatTile icon="◈" label="Active Internships" value={internshipSummary.active_internships || 0} />
                <StatTile icon="🔥" label="Current Streak" value={internshipSummary.current_streak || 0} />
                <StatTile icon="◔" label="Longest Streak" value={internshipSummary.longest_streak || 0} />
                <StatTile icon="▤" label="Reports Submitted" value={internshipSummary.total_reports || 0} />
              </div>

              <div className="bento-grid">
                <section className="surface span-7">
                  <div className="surface-header">
                    <div className="surface-title"><span className="surface-title-icon">◈</span>Internship Progress</div>
                  </div>
                  <p className="surface-subtext">Your internship applications and progress status.</p>

                  {internshipSummary.internships?.length ? (
                    <div className="entity-list mt-md">
                      {internshipSummary.internships.map((item) => (
                        <article className="entity-card" key={item.internship_id}>
                          <div className="entity-head">
                            <div>
                              <h4>{item.title || `Internship #${item.internship_id}`}</h4>
                              <p>{item.company || 'Company not available'}</p>
                            </div>
                            <StatusChip status={item.status || 'not_started'} />
                          </div>
                          <div className="mt-sm">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                              <span className="text-muted">Progress</span><strong>{item.progress || 0}%</strong>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${Math.min(Math.max(item.progress || 0, 0), 100)}%` }} />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="◈" message="No internship progress is available yet. Apply to an internship to start tracking it." />
                  )}
                </section>

                <section className="surface span-5">
                  <div className="surface-header">
                    <div className="surface-title"><span className="surface-title-icon">▣</span>Reporting Activity</div>
                  </div>
                  <p className="surface-subtext">Last 35 days of internship report activity.</p>

                  <div className="heatmap">
                    {(internshipSummary.activity || []).map((day) => (
                      <div
                        key={day.date}
                        title={`${day.date}${day.active ? ' — Report submitted' : ' — No report'}`}
                        className={`heatmap-cell ${day.active ? 'on' : ''}`}
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>

                  <p className="text-muted text-sm mt-md">
                    {internshipSummary.current_streak > 0
                      ? <>🔥 You're on a <strong>{internshipSummary.current_streak}-day reporting streak</strong>.</>
                      : 'Submit your first internship report to start your streak.'}
                  </p>

                  <button type="button" className="btn-primary mt-md" onClick={goToDailyReports}>
                    Submit / View Reports
                  </button>
                </section>
              </div>
            </>
          ) : null}
        </>

      ) : showMentorAI ? (

        /* =================================
            MENTOR AI — flagship feature
        ================================= */

        <>
          <div className="hero-eyebrow" style={{ color: 'var(--brand-700)', background: 'var(--brand-50)', marginBottom: 14 }}>AI CAREER MENTOR</div>

          <div className="ai-feature">
            <div className="ai-feature-header">
              <div className="ai-feature-title">
                <span className="ai-feature-badge">◍</span>
                <div>
                  <h2>Mentor AI</h2>
                  <p>Your AI mentor for internships, skills, projects, career guidance, and learning support.</p>
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setShowMentorAI(false)}>Back to Dashboard</button>
            </div>

            <div id="mentor-ai-chat" className="ai-feature-frame" />

            <p className="ai-feature-footnote">You can also upload files when supported by the Mentor AI workflow.</p>
          </div>
        </>

      ) : showProfile ? (

        /* =================================
            PROFILE
        ================================= */

        <>
          <HeroBanner
            eyebrow="ACCOUNT"
            heading="Student Profile"
            subheading="Keep your profile complete so recruiters and mentors see the best version of you."
            actions={[
              { key: 'edit', label: editingProfile ? 'Cancel Editing' : 'Edit Profile', onClick: () => { setProfileError(''); setEditingProfile((value) => !value) } },
              { key: 'back', label: 'Back to Dashboard', onClick: () => { setShowProfile(false); setShowExplorer(false); setEditingProfile(false) } },
            ]}
          />

          <section className="surface span-12">
            {profileError && <div className="empty-card" style={{ marginBottom: 16 }}><p>{profileError}</p></div>}

            {editingProfile ? (
              <form className="form-grid" onSubmit={saveStudentProfile}>
                <label>Full name<input name="full_name" defaultValue={profile?.full_name || ''} /></label>
                <label>Phone<input name="phone" defaultValue={profile?.phone || ''} /></label>
                <label>College<input name="college" defaultValue={profile?.college || ''} /></label>
                <label>Department<input name="department" defaultValue={profile?.department || ''} /></label>
                <label>Year<input name="year" defaultValue={profile?.year || ''} /></label>
                <label>CGPA<input name="cgpa" defaultValue={profile?.cgpa || ''} /></label>
                <label>Skills (comma separated)<input name="skills" defaultValue={profile?.skills || ''} /></label>
                <label>GitHub<input name="github" defaultValue={profile?.github || ''} /></label>
                <label>LinkedIn<input name="linkedin" defaultValue={profile?.linkedin || ''} /></label>
                <label>Resume link<input name="resume" defaultValue={profile?.resume || ''} /></label>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={() => setEditingProfile(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save profile</button>
                </div>
              </form>
            ) : (
              <>
                <div className="profile-hero">
                  <div className="profile-avatar-lg">{(profile?.full_name || email || 'S').charAt(0).toUpperCase()}</div>
                  <div>
                    <h2>{profile?.full_name || 'Student'}</h2>
                    <p className="text-muted">{email}</p>
                  </div>
                </div>

                <div className="field-grid">
                  <div className="field-item"><span>Full Name</span><strong>{profile?.full_name || 'Not provided'}</strong></div>
                  <div className="field-item"><span>Email</span><strong>{email || 'Not provided'}</strong></div>
                  <div className="field-item"><span>Phone</span><strong>{profile?.phone || 'Not provided'}</strong></div>
                  <div className="field-item"><span>College</span><strong>{profile?.college || 'Not provided'}</strong></div>
                  <div className="field-item"><span>Department</span><strong>{profile?.department || 'Not provided'}</strong></div>
                  <div className="field-item"><span>Year</span><strong>{profile?.year || 'Not provided'}</strong></div>
                  <div className="field-item"><span>CGPA</span><strong>{profile?.cgpa || 'Not provided'}</strong></div>
                  <div className="field-item"><span>GitHub</span><strong>{profile?.github || 'Not provided'}</strong></div>
                  <div className="field-item"><span>LinkedIn</span><strong>{profile?.linkedin || 'Not provided'}</strong></div>
                </div>

                <div className="mt-lg">
                  <h3>Skills</h3>
                  {studentSkills.length > 0 ? (
                    <div className="tag-row">
                      {studentSkills.map((skill) => <span className="tag-chip" key={skill}>{skill}</span>)}
                    </div>
                  ) : <p className="text-muted">No skills added yet.</p>}
                </div>

                <div className="mt-lg">
                  <h3>Resume</h3>
                  <p className="text-muted">{profile?.resume || 'No resume added yet.'}</p>
                </div>
              </>
            )}
          </section>
        </>

      ) : showDailyReports ? (

        /* =================================
            DAILY REPORTS — work log
        ================================= */

        <>
          <HeroBanner
            eyebrow="WORK LOG"
            heading="Daily Internship Reports"
            subheading="Submit today's work update and track mentor feedback."
            actions={[{ key: 'back', label: 'Back to Dashboard', onClick: () => setShowDailyReports(false) }]}
          />

          <div className="bento-grid">
            <section className="surface span-5">
              <div className="surface-header">
                <div className="surface-title"><span className="surface-title-icon">▤</span>Today's Report</div>
              </div>

              <form className="form-grid" onSubmit={submitDailyReport}>
                <label>
                  Work completed today
                  <textarea rows="4" value={dailyReportForm.work_done} onChange={(e) => setDailyReportForm((p) => ({ ...p, work_done: e.target.value }))} placeholder="Describe what you worked on today..." required />
                </label>
                <label>
                  Challenges / blockers
                  <textarea rows="3" value={dailyReportForm.challenges} onChange={(e) => setDailyReportForm((p) => ({ ...p, challenges: e.target.value }))} placeholder="Optional: mention challenges or support needed" />
                </label>
                <label>
                  Hours worked
                  <input type="number" min="0" step="0.5" value={dailyReportForm.hours_worked} onChange={(e) => setDailyReportForm((p) => ({ ...p, hours_worked: e.target.value }))} placeholder="e.g. 6" />
                </label>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={dailyReportLoading}>
                    {dailyReportLoading ? 'Submitting...' : "Submit Today's Report"}
                  </button>
                </div>
              </form>

              {dailyReportError && <div className="empty-card mt-md"><p>{dailyReportError}</p></div>}
            </section>

            <section className="surface span-7">
              <div className="surface-header">
                <div className="surface-title"><span className="surface-title-icon">◔</span>My Report History</div>
              </div>

              {dailyReportLoading && dailyReports.length === 0 ? (
                <EmptyState icon="◔" title="Loading reports…" />
              ) : dailyReports.length > 0 ? (
                <div className="entity-list">
                  {dailyReports.map((report) => (
                    <article className="entity-card" key={report.id}>
                      <div className="entity-head">
                        <div>
                          <h4>{report.report_date || 'Daily Report'}</h4>
                          <p>{report.hours_worked != null ? `${report.hours_worked} hours worked` : 'Hours not specified'}</p>
                        </div>
                        <StatusChip status={report.status || 'submitted'} />
                      </div>
                      <p className="text-sm mt-sm"><strong>Work done:</strong> {report.work_done}</p>
                      {report.challenges && <p className="text-sm"><strong>Challenges:</strong> {report.challenges}</p>}
                      {report.mentor_comment && (
                        <div className="field-item mt-sm">
                          <span>Mentor feedback</span>
                          <strong>{report.mentor_comment}</strong>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon="▤" message="No daily reports submitted yet." />
              )}
            </section>
          </div>
        </>

      ) : showResources ? (

        /* =================================
            RESOURCES
        ================================= */

        <>
          <HeroBanner
            eyebrow="GROWTH"
            heading={showSavedResources ? 'Saved Resources' : 'Learning Resources'}
            subheading="Discover useful resources and save the ones you want to revisit."
            actions={[{
              key: 'back',
              label: showSavedResources ? '← All Resources' : 'Back to Dashboard',
              onClick: () => {
                if (showSavedResources) { setShowSavedResources(false); fetchResources() }
                else { setShowResources(false) }
              },
            }]}
          />

          <div className="segment-row">
            <button type="button" className={`segment-btn ${!showSavedResources ? 'active' : ''}`} onClick={() => { setShowSavedResources(false); fetchResources() }}>All Resources</button>
            <button type="button" className={`segment-btn ${showSavedResources ? 'active' : ''}`} onClick={() => { setShowSavedResources(true); fetchSavedResources() }}>Saved Resources</button>
          </div>

          {resourceLoading ? (
            <EmptyState icon="◔" title="Loading resources…" />
          ) : resourceError ? (
            <EmptyState icon="⚠" title="Couldn't load resources" message={resourceError} action={{ label: 'Try Again', onClick: showSavedResources ? fetchSavedResources : fetchResources }} />
          ) : (showSavedResources ? savedResources : resources).length > 0 ? (
            <div className="discovery-grid">
              {(showSavedResources ? savedResources : resources).map((resource) => {
                const title = resource.title || resource.name || 'Untitled Resource'
                const description = resource.description || 'Learning resource'
                const link = resource.url || resource.link || resource.resource_url
                const resourceId = resource.resource_id || resource.id

                return (
                  <article key={resourceId} className="discovery-card">
                    <div className="discovery-icon">▤</div>
                    <h4>{title}</h4>
                    <p className="discovery-sub">{description}</p>

                    <div className="discovery-meta">
                      {resource.category && <span>{resource.category}</span>}
                      {(resource.resource_type || resource.type) && <span>{resource.resource_type || resource.type}</span>}
                    </div>

                    <div className="discovery-footer">
                      {link ? <a href={link} target="_blank" rel="noreferrer" className="btn-link">Open Resource →</a> : <span>Resource</span>}
                      {!showSavedResources && resourceId && (
                        <button type="button" className="btn-primary" onClick={() => saveResource(resourceId)}>Save</button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState icon="▤" message={showSavedResources ? 'No saved resources yet.' : 'No resources available yet.'} />
          )}
        </>

      ) : showConsent ? (

        /* =================================
            AUTO CONSENT LETTERS
        ================================= */

        <>
          <HeroBanner
            eyebrow="DOCUMENTS"
            heading="Auto Consent Letters"
            subheading="Manage internship offer rejections and automatically generated consent letters."
            actions={[{ key: 'back', label: 'Back to Dashboard', onClick: () => setShowConsent(false) }]}
          />

          {consentLoading ? (
            <EmptyState icon="◔" title="Loading…" />
          ) : consentError ? (
            <EmptyState icon="⚠" message={consentError} />
          ) : (
            <>
              {rejectingApplication && (
                <section className="surface span-12" style={{ marginBottom: 18 }}>
                  <div className="surface-header">
                    <div className="surface-title">Reject Internship Offer</div>
                  </div>
                  <p className="text-muted">
                    You are about to reject <strong>{rejectingApplication.title || 'this internship offer'}</strong>.
                    A consent letter will be generated automatically.
                  </p>

                  <div className="form-grid mt-md">
                    <label>
                      Reason
                      <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                        <option value="">Select a reason</option>
                        <option value="Received a better opportunity">Received a better opportunity</option>
                        <option value="Higher studies">Higher studies</option>
                        <option value="Personal reasons">Personal reasons</option>
                        <option value="Location issues">Location issues</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>

                    <label>
                      Specific reason (optional)
                      <textarea
                        value={rejectReason === 'Other' ? '' : rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="You may also type a specific reason here..."
                        rows="3"
                      />
                    </label>

                    <div className="form-actions">
                      <button type="button" className="btn-ghost" onClick={() => { setRejectingApplication(null); setRejectReason('') }}>Cancel</button>
                      <button type="button" className="btn-danger" onClick={submitOfferRejection}>Confirm Rejection</button>
                    </div>
                  </div>
                </section>
              )}

              <div className="bento-grid">
                <section className="surface span-6">
                  <div className="surface-header"><div className="surface-title">Current Offers</div></div>

                  {applications.filter((a) => ['offered', 'accepted'].includes(String(a.status).toLowerCase())).length > 0 ? (
                    <div className="entity-list">
                      {applications
                        .filter((a) => ['offered', 'accepted'].includes(String(a.status).toLowerCase()))
                        .map((application) => (
                          <div className="entity-card" key={application.application_id || application.id}>
                            <div className="entity-head">
                              <div>
                                <h4>{application.title || `Internship #${application.internship_id}`}</h4>
                                <p>{application.company || 'Company not available'}</p>
                              </div>
                              <button type="button" className="btn-ghost" onClick={() => setRejectingApplication(application)}>Reject Offer</button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <EmptyState icon="✉" message="No internship offers available for rejection." />
                  )}
                </section>

                <section className="surface span-6">
                  <div className="surface-header"><div className="surface-title">My Consent Letters</div></div>

                  {consentLetters.length > 0 ? (
                    <div className="entity-list">
                      {consentLetters.map((letter) => (
                        <article className="entity-card" key={letter.id}>
                          <div className="entity-head">
                            <div>
                              <h4>Consent Letter #{letter.id}</h4>
                              <p>Reason: {letter.reason || 'Not specified'}</p>
                            </div>
                            <StatusChip status={letter.status || 'pending'} />
                          </div>
                          <div className="text-sm mt-sm" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                            {letter.letter_content}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="✉" message="No consent letters generated yet." />
                  )}
                </section>
              </div>
            </>
          )}
        </>

      ) : showRoadmaps ? (

        /* =================================
            ROADMAPS
        ================================= */

        <>
          <HeroBanner
            eyebrow="GROWTH"
            heading={selectedRoadmap ? selectedRoadmap.title : 'Learning Roadmaps'}
            subheading={selectedRoadmap
              ? 'Follow the roadmap step by step and track your learning journey.'
              : 'Choose a structured roadmap and start learning step by step.'}
            actions={[{
              key: 'back',
              label: selectedRoadmap ? '← All Roadmaps' : 'Back to Dashboard',
              onClick: () => {
                if (selectedRoadmap) { setSelectedRoadmap(null); fetchRoadmaps() }
                else { setShowRoadmaps(false) }
              },
            }]}
          />

          {roadmapLoading ? (
            <EmptyState icon="◔" title="Loading roadmaps…" />
          ) : roadmapError ? (
            <EmptyState icon="⚠" title="Couldn't load roadmaps" message={roadmapError} action={{ label: 'Try Again', onClick: fetchRoadmaps }} />
          ) : selectedRoadmap ? (
            <section className="surface span-12">
              {selectedRoadmap.description && (
                <div className="field-item" style={{ marginBottom: 16 }}>
                  <span>About this roadmap</span>
                  <p>{selectedRoadmap.description}</p>
                </div>
              )}

              <div className="tag-row" style={{ marginBottom: 18 }}>
                {selectedRoadmap.category && <StatusChip status="info">{selectedRoadmap.category}</StatusChip>}
                {selectedRoadmap.difficulty && <StatusChip status="info">{selectedRoadmap.difficulty}</StatusChip>}
                {selectedRoadmap.estimated_duration && <StatusChip status="info">{selectedRoadmap.estimated_duration}</StatusChip>}
              </div>

              {selectedRoadmap.steps?.length > 0 ? (
                <div className="entity-list">
                  {[...selectedRoadmap.steps]
                    .sort((a, b) => (a.step_number || 0) - (b.step_number || 0))
                    .map((step, index) => (
                      <article key={step.id || index} className="entity-card">
                        <div className="entity-head">
                          <div>
                            <h4>Step {step.step_number || index + 1}: {step.title}</h4>
                            <p>{step.description || 'No description provided.'}</p>
                          </div>
                          {step.duration && <StatusChip status="info">{step.duration}</StatusChip>}
                        </div>
                      </article>
                    ))}
                </div>
              ) : (
                <EmptyState icon="▣" message="No steps have been added to this roadmap yet." />
              )}
            </section>
          ) : roadmaps.length > 0 ? (
            <div className="discovery-grid">
              {roadmaps.map((roadmap) => (
                <article key={roadmap.id} className="discovery-card">
                  <div className="discovery-icon">▣</div>
                  <h4>{roadmap.title}</h4>
                  <p className="discovery-sub">{roadmap.description || 'Structured learning roadmap'}</p>

                  <div className="discovery-meta">
                    <span>{roadmap.category || 'General'}</span>
                    <span>{roadmap.difficulty || 'All levels'}</span>
                  </div>

                  <div className="discovery-footer">
                    <span>{roadmap.estimated_duration || 'Self paced'}</span>
                    <button type="button" className="btn-primary" onClick={() => openRoadmap(roadmap.id)}>View Roadmap →</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon="▣" message="No roadmaps available yet." action={{ label: 'Refresh', onClick: fetchRoadmaps }} />
          )}
        </>

      ) : showExplorer ? (

        /* =================================
            EXPLORER
        ================================= */

        <>
          <HeroBanner
            eyebrow="DISCOVER"
            heading="Internship Explorer"
            subheading="Browse open internships and apply directly from your dashboard."
            actions={[{ key: 'back', label: 'Back to Dashboard', onClick: () => setShowExplorer(false) }]}
          />

          <div className="search-toolbar">
            <div className="search-field">
              <span className="search-field-icon">⌕</span>
              <input
                type="text"
                value={explorerQuery}
                onChange={(event) => setExplorerQuery(event.target.value)}
                placeholder="Search by title, company, or location"
                aria-label="Search internships"
              />
            </div>
          </div>

          {filteredExplorerInternships.length > 0 ? (
            <div className="discovery-grid">
              {filteredExplorerInternships.map((internship) => (
                <article key={internship.id} className="discovery-card">
                  <div className="discovery-icon">▣</div>
                  <h4>{internship.title}</h4>
                  <p className="discovery-sub">{internship.company}</p>

                  <div className="discovery-meta">
                    <span>{internship.location || 'Location not specified'}</span>
                    <span>{internship.mode || 'Mode not specified'}</span>
                  </div>

                  <div className="discovery-footer">
                    <span>{internship.stipend || 'Stipend not specified'}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn-ghost" onClick={() => handleSave(internship.id)}>
                        {savedInternships.includes(internship.id) ? 'Saved' : 'Save'}
                      </button>
                      <button type="button" className="btn-primary" onClick={() => handleApply(internship.id)}>Apply Now</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon="◌" message="No internships match your search right now." />
          )}
        </>

      ) : (

        /* =================================
            DASHBOARD OVERVIEW
        ================================= */

        <>
          <HeroBanner
            eyebrow="DASHBOARD OVERVIEW"
            heading={`Welcome, ${dashboardData?.profile?.full_name || email?.split('@')[0] || 'Student'}.`}
            subheading="Your internship dashboard is ready. Explore internships, track your applications, and manage your progress."
            ringValue={readinessScore}
            ringCaption="Readiness"
            actions={[
              { key: 'explore', label: 'Explore Internships', onClick: () => setShowExplorer(true) },
              { key: 'profile', label: 'Complete Profile', onClick: () => { setShowProfile(true); setShowExplorer(false) } },
            ]}
          />

          <div className="stat-tile-row">
            <StatTile icon="◭" label="Applications" value={applications.length} />
            <StatTile icon="◈" label="Saved Internships" value={savedInternships.length} />
            <StatTile icon="✉" label="Deadlines" value={deadlines?.length || 0} />
            <StatTile icon="▣" label="Tracked Progress" value={progress?.length || 0} />
          </div>

          <div className="bento-grid">
            <section className="surface span-7">
              <div className="surface-header">
                <div className="surface-title"><span className="surface-title-icon">◭</span>Current Applications</div>
              </div>

              {applications.length > 0 ? (
                <div className="entity-list">
                  {applications.map((application) => {
                    const currentStageIndex = applicationStages.indexOf(application.status)
                    return (
                      <div className="entity-card" key={application.application_id}>
                        <div className="entity-head">
                          <div>
                            <h4>{application.title || `Internship #${application.internship_id}`}</h4>
                            <p>
                              {application.company || 'Company not available'}
                              {application.location ? ` • ${application.location}` : ''}
                            </p>
                          </div>
                          <StatusChip status={application.status} />
                        </div>

                        <div className="journey">
                          {applicationStages.map((stage, index) => (
                            <div key={stage} className={`journey-step ${index <= currentStageIndex ? 'active' : ''}`}>
                              <span className="journey-dot" />
                              <span className="journey-label">{stage.charAt(0).toUpperCase() + stage.slice(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon="◭" message="No internship applications yet. Open Explorer and apply for an internship to see it here." action={{ label: 'Open Explorer', onClick: () => setShowExplorer(true) }} />
              )}
            </section>

            <section className="surface span-5">
              <div className="surface-header">
                <div className="surface-title"><span className="surface-title-icon">◍</span>Mentor AI Insight</div>
              </div>

              <p className="surface-subtext">
                {internships.length > 0
                  ? `There are currently ${internships.length} internship${internships.length === 1 ? '' : 's'} available in the internship explorer.`
                  : 'No internship recommendations are available yet. Complete your profile and check back when companies post opportunities.'}
              </p>

              <div className="stack-sm mt-md">
                <button type="button" className="btn-ghost" style={{ justifyContent: 'space-between', display: 'flex' }} onClick={() => setShowExplorer(true)}>
                  Explore Internships <span>→</span>
                </button>
                <button type="button" className="btn-ghost" style={{ justifyContent: 'space-between', display: 'flex' }} onClick={() => { setShowProfile(true); setShowExplorer(false) }}>
                  Complete Profile <span>→</span>
                </button>
                <button type="button" className="btn-ghost" style={{ justifyContent: 'space-between', display: 'flex' }} onClick={goToMentorAI}>
                  Chat with Mentor AI <span>→</span>
                </button>
              </div>
            </section>
          </div>

          <div className="bento-grid">
            <section className="surface span-6">
              <div className="surface-header">
                <div className="surface-title"><span className="surface-title-icon">◎</span>Skill Competency</div>
              </div>

              {studentSkills.length > 0 ? (
                <div className="stack-sm">
                  {studentSkills.map((skill) => (
                    <div key={skill}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.87rem', marginBottom: 6 }}>
                        <span>{skill}</span>
                        <small className="text-muted">Profile skill</small>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: profile?.skills ? '100%' : '0%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="◎" message="No skills added yet." action={{ label: 'Add skills', onClick: goToProfile }} />
              )}
            </section>

            <section className="surface span-6">
              <div className="surface-header">
                <div className="surface-title"><span className="surface-title-icon">▣</span>Activity Streak</div>
                <StatusChip status="info">{applications.length} Application{applications.length === 1 ? '' : 's'}</StatusChip>
              </div>

              <div className="heatmap" aria-label="Recent activity grid">
                {applicationActivity.map((cell, index) => (
                  <span key={`${cell}-${index}`} className={`heatmap-cell ${cell === 1 ? 'on' : ''}`} />
                ))}
              </div>

              <p className="text-muted text-sm mt-md">
                {applications.length > 0 ? 'Activity based on your applications' : 'No application activity yet'}
              </p>
            </section>
          </div>

          <div className="bento-grid">
            <section className="surface span-8">
              <div className="surface-header">
                <div className="surface-title"><span className="surface-title-icon">▣</span>Recommended for You</div>
                <button type="button" className="btn-link" onClick={() => setShowExplorer(true)}>View All →</button>
              </div>

              {internships.length > 0 ? (
                <div className="discovery-grid">
                  {internships.slice(0, 3).map((item) => (
                    <article key={item.id} className="discovery-card">
                      <div className="discovery-icon">▣</div>
                      <h4>{item.title}</h4>
                      <p className="discovery-sub">{item.company}</p>

                      <div className="discovery-meta">
                        <span>{item.stipend || 'Stipend not specified'}</span>
                        <span>{item.location || 'Location not specified'}</span>
                      </div>

                      <div className="discovery-footer">
                        <span>{item.deadline || 'No deadline'}</span>
                        <button type="button" className="btn-primary" onClick={() => handleApply(item.id)}>Apply Now</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon="▣" message="No internships available right now." />
              )}
            </section>

            <section className="surface span-4">
              <div className="surface-header">
                <div className="surface-title"><span className="surface-title-icon">✉</span>Deadlines</div>
              </div>

              {deadlines?.length > 0 ? (
                <div className="entity-list">
                  {deadlines.map((item) => (
                    <div className="entity-card" key={item.id}>
                      <div className="entity-head">
                        <h4>{item.title}</h4>
                        <span className="text-muted text-sm">{item.deadline}</span>
                      </div>
                      <p className="text-sm text-muted mt-sm">{item.description || 'No description'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="✉" message="No deadlines available yet." />
              )}
            </section>
          </div>

          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">◈</span>Internship Progress</div>
            </div>

            {progress?.length > 0 ? (
              <div className="entity-list">
                {progress.map((item) => (
                  <div className="entity-card" key={item.id}>
                    <div className="entity-head">
                      <div>
                        <h4>
                          {dashboardData?.applications?.find((app) => app.internship_id === item.internship_id)?.title
                            || `Internship #${item.internship_id}`}
                        </h4>
                        <p>
                          {dashboardData?.applications?.find((app) => app.internship_id === item.internship_id)?.company
                            || 'Company not available'}
                        </p>
                      </div>
                      <span>{item.progress}%</span>
                    </div>

                    <div className="progress-track mt-sm">
                      <div className="progress-fill" style={{ width: `${item.progress}%` }} />
                    </div>

                    <p className="text-sm text-muted mt-sm">Status: {item.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="◈" message="No internship progress available yet." />
            )}
          </section>
        </>
      )}
    </AppShell>
  )
}
