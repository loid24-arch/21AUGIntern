import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import HeroBanner from '../components/HeroBanner.jsx'
import { EmptyState, StatusChip, StatTile } from '../components/ui.jsx'

export default function TraningPlacementDashboard({ email, userId, onLogout }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [analytics, setAnalytics] = useState([])
  const [verificationQueue, setVerificationQueue] = useState([])
  const [companyList, setCompanyList] = useState([])
  const [students, setStudents] = useState([])
  const [applications, setApplications] = useState([])
  const [projects, setProjects] = useState([])
  const [consentLetters, setConsentLetters] = useState([])
  const [dailyReports, setDailyReports] = useState([])
  const [apiError, setApiError] = useState('')

  const tabs = ['Overview', 'Internship Verification', 'Companies', 'Students', 'Applications', 'Projects', 'Consent Letters', 'Daily Reports']

  const openModal = (type, data = null) => setModal({ type, data })
  const closeModal = () => setModal(null)

  const titleStatus = (value) => value ? value.replace(/^./, (letter) => letter.toUpperCase()) : 'Pending'
  const loadTnpData = async () => {
    try {
      const [
        dashboard,
        internships,
        companies,
        studentData,
        applicationData,
        projectData,
        consentLetterData,
        dailyReportData,
      ] = await Promise.all([
        fetch('/api/tnp/dashboard'),
        fetch('/api/tnp/internships'),
        fetch('/api/tnp/companies'),
        fetch('/api/tnp/students'),
        fetch('/api/tnp/applications'),
        fetch('/api/tnp/projects'),
        fetch('/api/consent-letters'),
        fetch('/api/tnp/daily-reports'),
      ])

      if (!dashboard.ok) {
        throw new Error('Could not load placement dashboard')
      }

      const stats = await dashboard.json()

      setAnalytics([
        ['Total students', stats.total_students],
        ['Total companies', stats.total_companies],
        ['Total internships', stats.total_internships],
        ['Pending internships', stats.pending_internships],
        ['Approved internships', stats.approved_internships],
        ['Rejected internships', stats.rejected_internships],
        ['Total applications', stats.total_applications],
      ].map(([label, value]) => ({
        label,
        value: value ?? 0,
        note: 'Live data',
      })))

      const internshipList = internships.ok
        ? await internships.json()
        : []

      setVerificationQueue(
        internshipList.map((item) => ({
          ...item,
          internship: item.title,
          status: titleStatus(item.status),
        }))
      )

      const companyData = companies.ok
        ? await companies.json()
        : []

      setCompanyList(
        companyData.map((item) => ({
          ...item,
          name: item.company_name || 'Company',
          profile:
            item.industry ||
            item.location ||
            'Company profile',
          internships: item.internships ?? 0,
          activity: item.activity || 'Active',
        }))
      )

      const studentList = studentData.ok
        ? await studentData.json()
        : []

      setStudents(
        studentList.map((item) => ({
          ...item,
          name: item.full_name || `Student #${item.user_id}`,
          skills: item.skills || '—',
          cgpa: item.cgpa || '—',
          internships: item.internships ?? '—',
          applications: item.applications ?? '—',
        }))
      )

      const applicationList = applicationData.ok
        ? await applicationData.json()
        : []

      setApplications(
        applicationList.map((item) => ({
          ...item,
          student: item.student_name || `Student #${item.user_id}`,
          company: item.company || `Internship #${item.internship_id}`,
          internship: item.internship_title || `Internship #${item.internship_id}`,
          date: item.created_at || '',
          status: titleStatus(item.status),
        }))
      )

      const projectList = projectData.ok
        ? await projectData.json()
        : []

      setProjects(
        projectList.map((item) => ({
          ...item,
          student: item.student_name || `Student #${item.student_id}`,
          company: item.company || '',
          internship: item.internship_title || '',
          project: item.title || 'Untitled project',
          status: titleStatus(item.status),
        }))
      )

      const consentResponse = consentLetterData.ok
         ? await consentLetterData.json()
         : { consent_letters: [] }

      const consentList = consentResponse.consent_letters || []

      setConsentLetters(
        consentList.map((item) => ({
          ...item,
          student: item.student_name || `Student #${item.student_id}`,
          internship: item.internship_title || `Internship #${item.internship_id}`,
          status: titleStatus(item.status),
          reason: item.reason || 'No reason provided',
          letter_content: item.letter_content || 'No consent letter content available.',
        }))
      )

      const dailyReportResponse = dailyReportData.ok ? await dailyReportData.json() : { reports: [] }
      setDailyReports((dailyReportResponse.reports || []).map((item) => ({
        ...item,
        student: item.student_name || `Student #${item.student_id}`,
        status: titleStatus(item.status),
      })))

      setApiError('')
    } catch (error) {
      console.error(error)
      setApiError('Could not load placement data')
    }
  }

  useEffect(() => { loadTnpData() }, [userId])
  const decideInternship = async () => {
    const item = modal?.data
    if (!item?.id) return

    const action =
      item.action === 'Approve'
        ? 'approve'
        : 'reject'

    const response = await fetch(
      `/api/tnp/internships/${item.id}/${action}`,
      { method: 'PUT' }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      setApiError(
        error.detail ||
        'Could not update internship'
      )
      return
    }

    closeModal()
    await loadTnpData()
  }

  const decideConsentLetter = async () => {
    const item = modal?.data
    if (!item?.id) return

    const status = item.action === 'Approve' ? 'approved' : 'rejected'

    try {
      const response = await fetch(
        `/api/consent-letters/${item.id}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        setApiError(error.detail || 'Could not update consent letter')
        return
      }

      closeModal()
      await loadTnpData()
    } catch (error) {
      console.error(error)
      setApiError('Could not update consent letter')
    }
  }

  const filteredDailyReports = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return dailyReports.filter((item) => {
      const matchesSearch = !term || `${item.student} ${item.work_done || ''} ${item.challenges || ''}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, dailyReports])

  const filteredConsentLetters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return consentLetters.filter((item) => {
      const matchesSearch = !term || `${item.student} ${item.internship} ${item.reason}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, consentLetters])

  const filteredVerificationQueue = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return verificationQueue.filter((item) => {
      const matchesSearch = !term || `${item.company} ${item.internship} ${item.location}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, verificationQueue])

  const filteredCompanies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return companyList.filter((company) => {
      const matchesSearch = !term || `${company.name} ${company.profile}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || company.activity === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, companyList])

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return students.filter((student) => {
      const matchesSearch = !term || `${student.name} ${student.college} ${student.skills}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || Number(student.cgpa) >= Number(statusFilter)
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, students])

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return applications.filter((item) => {
      const matchesSearch = !term || `${item.student} ${item.company} ${item.internship}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, applications])

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return projects.filter((project) => {
      const matchesSearch = !term || `${project.student} ${project.company} ${project.project}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || project.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, projects])

  const tabIcon = {
    Overview: '◌',
    'Internship Verification': '▣',
    Companies: '◎',
    Students: '◌',
    Applications: '◭',
    Projects: '▤',
    'Consent Letters': '✉',
    'Daily Reports': '▤',
  }

  const filteredContent = useMemo(() => {
    switch (activeTab) {
      case 'Internship Verification':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">▣</span>Internship Verification</div>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search company, internship, or location"
                  aria-label="Search internship verification"
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter internship verification by status"
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredVerificationQueue.map((item) => (
                <div key={`${item.company}-${item.internship}`} className="entity-row">
                  <div>
                    <h4>{item.company}</h4>
                    <p>{item.internship}</p>
                  </div>
                  <div className="entity-meta">
                    <span>{item.location}</span>
                    <span>Deadline: {item.deadline}</span>
                  </div>
                  <StatusChip status={item.status} />
                  <div className="entity-actions">
                    <button type="button" className="btn-ghost" onClick={() => openModal('review', item)}>Review</button>
                    {item.status === 'Pending' && (
                      <>
                        <button type="button" className="btn-primary" onClick={() => openModal('decision', { ...item, action: 'Approve' })}>Approve</button>
                        <button type="button" className="btn-ghost" onClick={() => openModal('decision', { ...item, action: 'Reject' })}>Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {filteredVerificationQueue.length === 0 && (
                <EmptyState icon="▣" message="No internship records match the current filters." />
              )}
            </div>
          </section>
        )
      case 'Companies':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">◎</span>Companies</div>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search company or profile"
                  aria-label="Search companies"
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter companies by activity"
              >
                <option value="All">All activity</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredCompanies.map((company) => (
                <div key={company.name} className="entity-card">
                  <div className="entity-head">
                    <div>
                      <h4>{company.name}</h4>
                      <p>{company.profile}</p>
                    </div>
                    <StatusChip status={company.activity}>{company.activity} activity</StatusChip>
                  </div>
                  <p className="text-sm text-muted mt-sm">{company.internships} internships</p>
                </div>
              ))}
              {filteredCompanies.length === 0 && (
                <EmptyState icon="◎" message="No companies match the current filters." />
              )}
            </div>
          </section>
        )
      case 'Students':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">◌</span>Students</div>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search student, college, or skill"
                  aria-label="Search students"
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter students by CGPA"
              >
                <option value="All">All CGPA</option>
                <option value="9">9.0+</option>
                <option value="8">8.0+</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredStudents.map((student) => (
                <div key={student.name} className="entity-card">
                  <div className="entity-head">
                    <div>
                      <h4>{student.name}</h4>
                      <p>{student.college}</p>
                    </div>
                    <span className="text-sm text-muted">CGPA {student.cgpa}</span>
                  </div>
                  <p className="text-sm mt-sm">Skills: {student.skills}</p>
                  <p className="text-sm text-muted">Internships: {student.internships} • Applications: {student.applications}</p>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <EmptyState icon="◌" message="No students match the current filters." />
              )}
            </div>
          </section>
        )
      case 'Applications':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">◭</span>Applications</div>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search student, company, or internship"
                  aria-label="Search applications"
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter applications by status"
              >
                <option value="All">All statuses</option>
                <option value="Applied">Applied</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredApplications.map((item) => (
                <div key={`${item.student}-${item.company}`} className="entity-card">
                  <div className="entity-head">
                    <div>
                      <h4>{item.student}</h4>
                      <p>{item.company} • {item.internship}</p>
                    </div>
                    <StatusChip status={item.status} />
                  </div>
                  <p className="text-sm text-muted mt-sm">{item.date}</p>
                </div>
              ))}
              {filteredApplications.length === 0 && (
                <EmptyState icon="◭" message="No applications match the current filters." />
              )}
            </div>
          </section>
        )
      case 'Daily Reports':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">▤</span>Daily Reports</div>
              <StatusChip status="info">{dailyReports.length} total</StatusChip>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search student, work, or challenge" />
              </div>
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Needs_revision">Needs revision</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredDailyReports.map((item) => (
                <article key={item.id} className="entity-card">
                  <div className="entity-head">
                    <div>
                      <h4>{item.student}</h4>
                      <p>{item.report_date || 'Report date unavailable'} • {item.hours_worked != null ? `${item.hours_worked} hours` : 'Hours not specified'}</p>
                    </div>
                    <StatusChip status={item.status} />
                  </div>
                  <p className="text-sm mt-sm"><strong>Work:</strong> {item.work_done}</p>
                  {item.challenges && <p className="text-sm"><strong>Challenges:</strong> {item.challenges}</p>}
                  {item.mentor_comment && <p className="text-sm"><strong>Mentor feedback:</strong> {item.mentor_comment}</p>}
                </article>
              ))}
              {filteredDailyReports.length === 0 && <EmptyState icon="▤" message="No daily reports match the current filters." />}
            </div>
          </section>
        )

      case 'Consent Letters':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">✉</span>Consent Letters</div>
              <StatusChip status="warn">{consentLetters.filter((item) => item.status === 'Pending').length} pending</StatusChip>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search student, internship, or reason"
                  aria-label="Search consent letters"
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter consent letters by status"
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredConsentLetters.map((item) => (
                <div key={item.id} className="entity-card">
                  <div className="entity-head">
                    <div>
                      <h4>{item.student}</h4>
                      <p>{item.internship}</p>
                    </div>
                    <StatusChip status={item.status} />
                  </div>

                  <p className="text-sm mt-sm"><strong>Reason:</strong> {item.reason}</p>

                  <div className="entity-actions mt-sm">
                    <button type="button" className="btn-ghost" onClick={() => openModal('consent-review', item)}>View Letter</button>
                    {item.status === 'Pending' && (
                      <>
                        <button type="button" className="btn-primary" onClick={() => openModal('consent-decision', { ...item, action: 'Approve' })}>Approve</button>
                        <button type="button" className="btn-ghost" onClick={() => openModal('consent-decision', { ...item, action: 'Reject' })}>Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {filteredConsentLetters.length === 0 && (
                <EmptyState icon="✉" message="No consent letters match the current filters." />
              )}
            </div>
          </section>
        )

      case 'Projects':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">▤</span>Projects</div>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search project title or student"
                  aria-label="Search projects"
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter projects by status"
              >
                <option value="All">All statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredProjects.map((item) => (
                <div key={item.project} className="entity-card">
                  <div className="entity-head">
                    <div>
                      <h4>{item.student}</h4>
                      <p>{item.company} • {item.internship}</p>
                    </div>
                    <StatusChip status={item.status} />
                  </div>
                  <p className="text-sm mt-sm">{item.project}</p>
                </div>
              ))}
              {filteredProjects.length === 0 && (
                <EmptyState icon="▤" message="No projects match the current filters." />
              )}
            </div>
          </section>
        )
      default:
        return (
          <>
            <div className="stat-tile-row">
              {analytics.map((item) => (
                <StatTile key={item.label} icon="◔" label={item.label} value={item.value} hint={item.note} />
              ))}
            </div>

            <div className="bento-grid">
              <div className="surface span-6">
                <div className="surface-header">
                  <div className="surface-title"><span className="surface-title-icon">◎</span>Companies</div>
                </div>

                <div className="stack-sm">
                  {companyList.map((company) => (
                    <div key={company.name} className="entity-card">
                      <div className="entity-head">
                        <div>
                          <h4>{company.name}</h4>
                          <p>{company.profile}</p>
                        </div>
                      </div>
                      <div className="entity-head mt-sm">
                        <span className="text-sm text-muted">{company.internships} internships</span>
                        <strong className="text-sm">{company.activity} activity</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface span-6">
                <div className="surface-header">
                  <div className="surface-title"><span className="surface-title-icon">◌</span>Students</div>
                  <button type="button" className="btn-ghost" onClick={() => setActiveTab('Students')}>View all</button>
                </div>

                <div className="stack-sm">
                  {students.map((student) => (
                    <div key={student.name} className="entity-card">
                      <div className="entity-head">
                        <div>
                          <h4>{student.name}</h4>
                          <p>{student.college}</p>
                        </div>
                      </div>
                      <div className="entity-head mt-sm">
                        <span className="text-sm text-muted">Skills: {student.skills}</span>
                        <strong className="text-sm">CGPA: {student.cgpa}</strong>
                      </div>
                      <p className="text-sm text-muted mt-sm">Internships: {student.internships} • Applications: {student.applications}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )
    }
  }, [activeTab, filteredVerificationQueue, filteredCompanies, filteredStudents, filteredApplications, filteredProjects, filteredConsentLetters, filteredDailyReports, consentLetters, dailyReports, searchTerm, statusFilter, email])

  const navGroups = [
    {
      label: 'Placement Workspace',
      items: [
        { key: 'Overview', label: 'Dashboard', icon: tabIcon.Overview, active: activeTab === 'Overview', onClick: () => setActiveTab('Overview') },
        ...tabs.filter((tab) => tab !== 'Overview').map((tab) => ({
          key: tab,
          label: tab,
          icon: tabIcon[tab],
          active: activeTab === tab,
          onClick: () => setActiveTab(tab),
        })),
      ],
    },
  ]

  return (
    <AppShell
      roleLabel="Training & Placement"
      identityLabel={email || 'Placement Team'}
      accent="violet"
      navGroups={navGroups}
      onLogout={onLogout}
    >
      <HeroBanner
        eyebrow="TRAINING & PLACEMENT"
        heading={`Welcome back, ${email || 'Placement Team'}.`}
        subheading="Monitor live internship verification, companies, students, applications, and project activity from one dashboard."
        ringValue={Math.min(100, analytics.find((item) => item.label === 'Approved internships')?.value || 0)}
        ringCaption="Approved"
        actions={[
          { key: 'verify', label: 'Review pending internships', onClick: () => setActiveTab('Internship Verification') },
          { key: 'companies', label: 'Browse companies', onClick: () => setActiveTab('Companies') },
        ]}
      />

      {filteredContent}

      {apiError && <div className="empty-card mt-md"><p>{apiError}</p></div>}

      {modal && (
        <div className="modal-scrim" onClick={closeModal}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-panel-header">
              <h3>
                {modal.type === 'review' && 'Review Internship'}
                {modal.type === 'decision' && `${modal.data?.action} Internship`}
                {modal.type === 'consent-review' && 'Consent Letter'}
                {modal.type === 'consent-decision' && `${modal.data?.action} Consent Letter`}
              </h3>
              <button type="button" className="modal-close-btn" onClick={closeModal}>×</button>
            </div>

            {modal.type === 'review' && (
              <div className="form-grid">
                <p><strong>Company:</strong> {modal.data?.company}</p>
                <p><strong>Internship:</strong> {modal.data?.internship}</p>
                <p><strong>Location:</strong> {modal.data?.location}</p>
                <p><strong>Deadline:</strong> {modal.data?.deadline}</p>
                <label>
                  Review Notes
                  <textarea rows="4" defaultValue="This internship aligns with industry standards and has a clear learning scope for students." />
                </label>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={closeModal}>Submit review</button>
                </div>
              </div>
            )}

            {modal.type === 'decision' && (
              <div className="form-grid">
                <p>Confirm {modal.data?.action.toLowerCase()} for <strong>{modal.data?.company}</strong> - {modal.data?.internship}?</p>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={decideInternship}>Confirm</button>
                </div>
              </div>
            )}

            {modal.type === 'consent-review' && (
              <div className="form-grid">
                <p><strong>Student:</strong> {modal.data?.student}</p>
                <p><strong>Internship:</strong> {modal.data?.internship}</p>
                <p><strong>Reason:</strong> {modal.data?.reason}</p>
                <p><strong>Status:</strong> {modal.data?.status}</p>
                <label>
                  Generated Consent Letter
                  <textarea rows="14" readOnly value={modal.data?.letter_content || ''} />
                </label>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal}>Close</button>
                </div>
              </div>
            )}

            {modal.type === 'consent-decision' && (
              <div className="form-grid">
                <p>
                  Confirm {modal.data?.action.toLowerCase()} for the consent letter submitted by{' '}
                  <strong>{modal.data?.student}</strong>?
                </p>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={decideConsentLetter}>Confirm</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
