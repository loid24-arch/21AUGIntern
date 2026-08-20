import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import HeroBanner from '../components/HeroBanner.jsx'
import { EmptyState, StatusChip, StatTile } from '../components/ui.jsx'

export default function MentorDashboard({ email, userId, onLogout }) {
  const [tab, setTab] = useState('Students')
  const [profile, setProfile] = useState(null)
  const [students, setStudents] = useState([])
  const [internships, setInternships] = useState([])
  const [certificates, setCertificates] = useState([])
  const [projects, setProjects] = useState([])
  const [dailyReports, setDailyReports] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [error, setError] = useState('')
  const [reviewingReport, setReviewingReport] = useState(null)
  const [reviewStatus, setReviewStatus] = useState('reviewed')
  const [mentorComment, setMentorComment] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)

  const load = async () => {
    try {
      const [p, s, i, c, pr, a, dr] = await Promise.all([
        fetch(`/api/teacher/profile/${userId}`), fetch('/api/teacher/students'), fetch('/api/teacher/internships'),
        fetch('/api/teacher/certificates'), fetch('/api/teacher/projects'), fetch('/api/teacher/analytics'),
        fetch('/api/teacher/daily-reports'),
      ])
      if (p.ok) setProfile(await p.json())
      setStudents(s.ok ? await s.json() : [])
      setInternships(i.ok ? await i.json() : [])
      setCertificates(c.ok ? await c.json() : [])
      setProjects(pr.ok ? await pr.json() : [])
      setAnalytics(a.ok ? await a.json() : {})
      const dailyData = dr.ok ? await dr.json() : { reports: [] }
      setDailyReports(dailyData.reports || [])
      setError('')
    } catch { setError('Could not load mentor data') }
  }

  useEffect(() => { load() }, [userId])

  const review = async (kind, id, status) => {
    const response = await fetch(`/api/teacher/${kind}/${id}?status=${status}`, { method: 'PUT' })
    if (!response.ok) { setError('Could not update review'); return }
    load()
  }

  const submitDailyReportReview = async () => {
    if (!reviewingReport?.id) return
    try {
      setReviewLoading(true); setError('')
      const response = await fetch(`/api/teacher/daily-reports/${reviewingReport.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: reviewStatus, mentor_comment: mentorComment.trim() || null }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'Could not review daily report')
      setReviewingReport(null); setReviewStatus('reviewed'); setMentorComment('')
      await load()
    } catch (err) { setError(err.message || 'Could not review daily report') }
    finally { setReviewLoading(false) }
  }

  const nav = ['Students', 'Internships', 'Certificates', 'Projects', 'Daily Reports']
  const tabIcon = { Students: '◌', Internships: '▣', Certificates: '✉', Projects: '◭', 'Daily Reports': '▤' }

  const content = useMemo(() => {
    if (tab === 'Students') return students.map((s) => (
      <article className="entity-card" key={s.id || s.user_id}>
        <h4>{s.full_name || `Student #${s.user_id}`}</h4>
        <p className="text-muted text-sm">{s.college || 'College not added'} • {s.department || 'Department not added'}</p>
        <p className="text-sm mt-sm">Skills: {s.skills || '—'} • CGPA: {s.cgpa || '—'}</p>
      </article>
    ))
    if (tab === 'Internships') return internships.map((i) => (
      <article className="entity-card" key={i.id}>
        <div className="entity-head">
          <div>
            <h4>{i.title}</h4>
            <p>{i.company} • {i.location || 'Location not specified'}</p>
          </div>
          <StatusChip status={i.status} />
        </div>
      </article>
    ))
    if (tab === 'Certificates') return certificates.map((c) => (
      <article className="entity-card" key={c.id}>
        <div className="entity-head">
          <div>
            <h4>Certificate #{c.id}</h4>
            <p>Student #{c.student_id} • {c.certificate_url || 'No link attached'}</p>
          </div>
        </div>
        <div className="entity-actions mt-sm">
          <button type="button" className="btn-primary" onClick={() => review('certificate', c.id, 'verified')}>Verify</button>
          <button type="button" className="btn-ghost" onClick={() => review('certificate', c.id, 'rejected')}>Reject</button>
        </div>
      </article>
    ))
    if (tab === 'Projects') return projects.map((p) => (
      <article className="entity-card" key={p.id}>
        <div className="entity-head">
          <div>
            <h4>{p.title}</h4>
            <p>Student #{p.student_id} • {p.description || 'No description'}</p>
          </div>
        </div>
        <p className="text-sm text-muted mt-sm">{p.github_url || p.project_url || 'No project link'}</p>
        <div className="entity-actions mt-sm">
          <button type="button" className="btn-primary" onClick={() => review('project', p.id, 'approved')}>Approve</button>
          <button type="button" className="btn-ghost" onClick={() => review('project', p.id, 'rejected')}>Reject</button>
        </div>
      </article>
    ))
    if (tab === 'Daily Reports') return dailyReports.map((r) => (
      <article className="entity-card" key={r.id}>
        <div className="entity-head">
          <div>
            <h4>{r.student_name || `Student #${r.student_id}`}</h4>
            <p>{r.report_date || 'Date unavailable'} • {r.hours_worked != null ? `${r.hours_worked} hours worked` : 'Hours not specified'}</p>
          </div>
          <StatusChip status={r.status || 'submitted'} />
        </div>
        <p className="text-sm mt-sm"><strong>Work done:</strong> {r.work_done || 'No work details provided.'}</p>
        {r.challenges && <p className="text-sm"><strong>Challenges:</strong> {r.challenges}</p>}
        {r.mentor_comment && <p className="text-sm"><strong>Current feedback:</strong> {r.mentor_comment}</p>}

        {reviewingReport?.id === r.id ? (
          <div className="form-grid mt-md">
            <label>
              Review status
              <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                <option value="reviewed">Reviewed</option>
                <option value="needs_revision">Needs revision</option>
              </select>
            </label>
            <label>
              Mentor feedback
              <textarea
                rows="5"
                value={mentorComment}
                onChange={(e) => setMentorComment(e.target.value)}
                placeholder="Add constructive feedback..."
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setReviewingReport(null)
                  setReviewStatus('reviewed')
                  setMentorComment('')
                }}
                disabled={reviewLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={submitDailyReportReview}
                disabled={reviewLoading}
              >
                {reviewLoading ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-ghost mt-sm"
            onClick={() => {
              setReviewingReport(r)
              setReviewStatus(r.status === 'needs_revision' ? 'needs_revision' : 'reviewed')
              setMentorComment(r.mentor_comment || '')
            }}
          >
            Review Report
          </button>
        )}
      </article>
    ))
    return []
  }, [
    tab,
    students,
    internships,
    certificates,
    projects,
    dailyReports,
    reviewingReport,
    reviewStatus,
    mentorComment,
    reviewLoading,
  ])

  const navGroups = [
    {
      label: 'Mentor Workspace',
      items: nav.map((item) => ({
        key: item,
        label: item,
        icon: tabIcon[item],
        active: tab === item,
        onClick: () => setTab(item),
      })),
    },
  ]

  return (
    <AppShell
      roleLabel="Mentor"
      identityLabel={profile?.full_name || email || 'Mentor'}
      accent="amber"
      navGroups={navGroups}
      onLogout={onLogout}
    >
      <HeroBanner
        eyebrow="MENTOR OVERVIEW"
        heading={`Welcome back, ${profile?.full_name || email || 'Mentor'}.`}
        subheading="Review student profiles, internship activity, certificates, projects, and daily internship reports."
        ringValue={Math.min(100, (analytics.total_students || 0) * 4)}
        ringCaption="Students"
      />

      <div className="stat-tile-row">
        <StatTile icon="◌" label="Students" value={analytics.total_students || 0} />
        <StatTile icon="▣" label="Internships" value={analytics.total_internships || 0} />
        <StatTile icon="✉" label="Pending Certificates" value={analytics.pending_certificates || 0} />
        <StatTile icon="◭" label="Pending Projects" value={analytics.pending_projects || 0} />
        <StatTile icon="▤" label="Daily Reports" value={dailyReports.length} />
      </div>

      <section className="surface span-12">
        <div className="surface-header">
          <div className="surface-title"><span className="surface-title-icon">{tabIcon[tab]}</span>{tab}</div>
        </div>

        {content.length ? (
          <div className="entity-list">{content}</div>
        ) : (
          <EmptyState icon={tabIcon[tab]} message={`No ${tab.toLowerCase()} available yet.`} />
        )}
      </section>

      {error && <div className="empty-card mt-md"><p>{error}</p></div>}
    </AppShell>
  )
}
