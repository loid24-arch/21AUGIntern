import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import HeroBanner from '../components/HeroBanner.jsx'
import { EmptyState, StatusChip, StatTile } from '../components/ui.jsx'

export default function CompanyDashboard({ email, userId, onLogout }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [profile, setProfile] = useState(null)
  const [companyInternships, setCompanyInternships] = useState([])
  const [companyApplicants, setCompanyApplicants] = useState([])
  const [companyProjects, setCompanyProjects] = useState([])
  const [apiError, setApiError] = useState('')
    const metrics = useMemo(() => {
    const pending = companyInternships.filter(
      (item) => item.status === 'pending'
    ).length

    const approved = companyInternships.filter(
      (item) => item.status === 'approved'
    ).length

    const rejected = companyInternships.filter(
      (item) => item.status === 'rejected'
    ).length

    const acceptedApplicants = companyApplicants.filter(
      (item) => item.status === 'selected' || item.status === 'accepted'
    ).length

    return [
      {
        label: 'Total internships posted',
        value: companyInternships.length,
        trend: 'From your real internship records',
      },
      {
        label: 'Pending',
        value: pending,
        trend: 'Awaiting T&P verification',
      },
      {
        label: 'Approved',
        value: approved,
        trend: 'Visible to eligible students',
      },
      {
        label: 'Rejected',
        value: rejected,
        trend: 'Requires review before reposting',
      },
      {
        label: 'Total applications',
        value: companyApplicants.length,
        trend: 'Received across your internships',
      },
      {
        label: 'Selected applicants',
        value: acceptedApplicants,
        trend: 'Current successful selections',
      },
    ]
  }, [companyInternships, companyApplicants])


  const recentApplications = useMemo(() => {
    return [...companyApplicants]
      .slice(-5)
      .reverse()
      .map((item) => ({
        student: item.name || `Student #${item.user_id}`,
        internship: item.title || 'Internship',
        date: 'Application submitted',
        status: item.status || 'applied',
      }))
  }, [companyApplicants])

  const hiringScore = useMemo(() => {
    if (companyInternships.length === 0) return 0

    const approvedCount = companyInternships.filter(
      (item) => item.status === 'approved'
    ).length

    const applicationScore = Math.min(companyApplicants.length * 5, 30)
    const approvalScore = Math.round(
      (approvedCount / companyInternships.length) * 50
    )
    const selectionScore = Math.min(
      companyApplicants.filter(
        (item) => item.status === 'selected' || item.status === 'accepted'
      ).length * 10,
      20
    )

    return Math.min(100, approvalScore + applicationScore + selectionScore)
  }, [companyInternships, companyApplicants])

  const tabs = ['Overview', 'Internships', 'Applications', 'Projects', 'Profile']

  const openModal = (type, data = null) => setModal({ type, data })
  const closeModal = () => setModal(null)

  const loadCompanyData = async () => {
    if (!userId) return
    try {
      const profileResponse = await fetch(`/api/company/profile/${userId}`)
      if (profileResponse.ok) setProfile(await profileResponse.json())
      else if (profileResponse.status !== 404) throw new Error('Unable to load company profile')
      const internshipsResponse = await fetch(`/api/company/internships?user_id=${userId}`)
      if (!internshipsResponse.ok && internshipsResponse.status !== 404) throw new Error('Unable to load internships')
      const items = internshipsResponse.ok ? await internshipsResponse.json() : []
      setCompanyInternships(items)
      const applicationLists = await Promise.all(items.map(async (item) => {
        const response = await fetch(`/api/company/internships/${item.id}/applications?user_id=${userId}`)
        return response.ok ? response.json() : []
      }))
      setCompanyApplicants(applicationLists.flat())
      const projectsResponse = await fetch(`/api/company/projects?user_id=${userId}`)
      if (projectsResponse.ok) setCompanyProjects(await projectsResponse.json())
      setApiError('')
    } catch (error) { setApiError(error.message) }
  }
  useEffect(() => { loadCompanyData() }, [userId])

  const updateApplicant = async (applicationId, status) => {
    const response = await fetch(`/api/company/applications/${applicationId}?user_id=${userId}&status=${status}`, { method: 'PUT' })
    if (!response.ok) { setApiError((await response.json()).detail || 'Could not update application'); return }
    closeModal(); loadCompanyData()
  }
  const deleteInternship = async (id) => {
    const response = await fetch(`/api/company/internships/${id}?user_id=${userId}`, { method: 'DELETE' })
    if (!response.ok) { setApiError('Could not delete internship'); return }
    closeModal(); loadCompanyData()
  }
  const saveProfile = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form); payload.user_id = userId
    const response = await fetch(`/api/company/profile${profile ? `/${userId}` : ''}`, { method: profile ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!response.ok) { setApiError((await response.json()).detail || 'Could not save profile'); return }
    closeModal(); loadCompanyData()
  }
  const saveInternship = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const payload = Object.fromEntries(form)
    const existing = modal.data?.id
    const response = await fetch(existing ? `/api/company/internships/${existing}?user_id=${userId}` : `/api/company/internships?user_id=${userId}`, { method: existing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!response.ok) { setApiError((await response.json()).detail || 'Could not save internship'); return }
    closeModal(); loadCompanyData()
  }

  const filteredInternships = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return companyInternships.map((item) => ({ ...item, location: `${item.mode || 'Flexible'} • ${item.location || 'Location not specified'}`, status: item.status?.replace(/^./, (letter) => letter.toUpperCase()), applicants: companyApplicants.filter((app) => app.internship_id === item.id).length })).filter((internship) => {
      const matchesSearch = !term || `${internship.title} ${internship.location}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || internship.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, companyInternships, companyApplicants])

  const filteredApplicants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return companyApplicants.map((item) => ({ ...item, role: item.title, status: item.status?.replace(/^./, (letter) => letter.toUpperCase()) })).filter((applicant) => {
      const matchesSearch = !term || `${applicant.name} ${applicant.role} ${applicant.skills}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || applicant.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, companyApplicants])

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return companyProjects.map((item) => ({ ...item, student: `Student #${item.student_id}`, github: item.github_url, demo: item.project_url, report: item.report_url ? 'Uploaded' : 'Not uploaded', status: item.status?.replace(/^./, (letter) => letter.toUpperCase()) })).filter((project) => {
      const matchesSearch = !term || `${project.student} ${project.title} ${project.description}`.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'All' || project.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, companyProjects])

  const tabIcon = { Overview: '◌', Internships: '▣', Applications: '◎', Projects: '◭', Profile: '◔' }

  const filteredContent = useMemo(() => {
    switch (activeTab) {
      case 'Internships':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">▤</span>Internship Management</div>
              <button type="button" className="btn-primary" onClick={() => openModal('internship', {})}>Post internship</button>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search internship or location"
                  aria-label="Search internships"
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter internships by status"
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredInternships.map((internship) => (
                <div key={internship.id} className="entity-row">
                  <div>
                    <h4>{internship.title}</h4>
                    <p>{internship.location}</p>
                  </div>
                  <div className="entity-meta">{internship.applicants} applicants</div>
                  <StatusChip status={internship.status} />
                  <div className="entity-actions">
                    <button type="button" className="btn-ghost" onClick={() => openModal('internship', internship)}>Edit</button>
                    <button type="button" className="btn-ghost" onClick={() => openModal('delete', internship)}>Delete</button>
                    <button type="button" className="btn-ghost" onClick={() => openModal('details', internship)}>Details</button>
                  </div>
                </div>
              ))}
              {filteredInternships.length === 0 && (
                <EmptyState icon="▤" message="No internships match the current filters." />
              )}
            </div>
          </section>
        )
      case 'Applications':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">◎</span>Applicants</div>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search applicant or skill"
                  aria-label="Search applicants"
                />
              </div>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter applicants by status"
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredApplicants.map((applicant) => (
                <div key={applicant.name} className="entity-card">
                  <div className="entity-head">
                    <div>
                      <h4>{applicant.name}</h4>
                      <p>{applicant.role}</p>
                    </div>
                    <StatusChip status={applicant.status} />
                  </div>

                  <ul className="entity-detail-list">
                    <li><strong>Skills:</strong> {applicant.skills}</li>
                    <li><strong>Resume:</strong> {applicant.resume}</li>
                    <li><strong>GitHub:</strong> {applicant.github}</li>
                    <li><strong>LinkedIn:</strong> {applicant.linkedin}</li>
                  </ul>

                  <div className="entity-actions mt-sm">
                    <button type="button" className="btn-primary" onClick={() => openModal('decision', { ...applicant, action: 'Accept' })}>Accept</button>
                    <button type="button" className="btn-ghost" onClick={() => openModal('decision', { ...applicant, action: 'Reject' })}>Reject</button>
                  </div>
                </div>
              ))}
              {filteredApplicants.length === 0 && (
                <EmptyState icon="◎" message="No applicants match the current filters." />
              )}
            </div>
          </section>
        )
      case 'Projects':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">▣</span>Project Verification</div>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <span className="search-field-icon">⌕</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search project or student"
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
                <option value="Pending Review">Pending Review</option>
                <option value="Approved">Approved</option>
              </select>
            </div>

            <div className="entity-list">
              {filteredProjects.map((project) => (
                <div key={project.title} className="entity-card">
                  <div>
                    <h4>{project.student}</h4>
                    <p className="text-muted text-sm">{project.title}</p>
                  </div>
                  <p className="text-sm mt-sm">{project.description}</p>
                  <ul className="entity-detail-list">
                    <li><strong>GitHub:</strong> {project.github}</li>
                    <li><strong>Demo:</strong> {project.demo}</li>
                    <li><strong>Report:</strong> {project.report}</li>
                  </ul>
                  <div className="entity-head mt-sm">
                    <StatusChip status={project.status} />
                    <div className="entity-actions">
                      <button type="button" className="btn-primary" onClick={() => openModal('projectDecision', { ...project, action: 'Approve' })}>Approve</button>
                      <button type="button" className="btn-ghost" onClick={() => openModal('projectDecision', { ...project, action: 'Reject' })}>Reject</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProjects.length === 0 && (
                <EmptyState icon="▣" message="No projects match the current filters." />
              )}
            </div>
          </section>
        )
      case 'Profile':
        return (
          <section className="surface span-12">
            <div className="surface-header">
              <div className="surface-title"><span className="surface-title-icon">◔</span>Company Profile</div>
              <button type="button" className="btn-ghost" onClick={() => openModal('profile', profile || {})}>{profile ? 'Edit profile' : 'Complete profile'}</button>
            </div>

            <div className="field-grid">
              <div className="field-item"><span>Company name</span><p>{profile?.company_name || 'Profile not completed'}</p></div>
              <div className="field-item"><span>Email</span><p>{profile?.company_email || email}</p></div>
              <div className="field-item"><span>Phone</span><p>{profile?.phone || '—'}</p></div>
              <div className="field-item"><span>Website</span><p>{profile?.website || '—'}</p></div>
              <div className="field-item"><span>Industry</span><p>{profile?.industry || '—'}</p></div>
              <div className="field-item"><span>Location</span><p>{profile?.location || '—'}</p></div>
            </div>

            <div className="field-item mt-lg">
              <span>Description</span>
              <p>{profile?.description || 'Complete your profile to post internships.'}</p>
            </div>
          </section>
        )
      default:
        return (
          <>
            <div className="bento-grid">
              <div className="surface span-7">
                <div className="surface-header">
                  <div className="surface-title"><span className="surface-title-icon">◔</span>Company Profile</div>
                  <button type="button" className="btn-ghost" onClick={() => setActiveTab('Profile')}>Edit profile</button>
                </div>

                <div className="field-grid">
                  <div className="field-item"><span>Company name</span><p>{profile?.company_name || 'Profile not completed'}</p></div>
                  <div className="field-item"><span>Email</span><p>{profile?.company_email || email || 'Not provided'}</p></div>
                  <div className="field-item"><span>Phone</span><p>{profile?.phone || 'Not provided'}</p></div>
                  <div className="field-item"><span>Website</span><p>{profile?.website || 'Not provided'}</p></div>
                  <div className="field-item"><span>Industry</span><p>{profile?.industry || 'Not provided'}</p></div>
                  <div className="field-item"><span>Location</span><p>{profile?.location || 'Not provided'}</p></div>
                </div>
                <div className="field-item mt-md">
                  <span>Description</span>
                  <p>{profile?.description || 'Complete your profile to post internships.'}</p>
                </div>
              </div>

              <div className="surface span-5">
                <div className="surface-header">
                  <div className="surface-title"><span className="surface-title-icon">▣</span>Recent Applications</div>
                </div>

                <div className="stack-sm">
                  {recentApplications.map((item) => (
                    <div key={`${item.student}-${item.date}`} className="entity-card">
                      <div>
                        <h4>{item.student}</h4>
                        <p className="text-muted text-sm">{item.internship}</p>
                      </div>
                      <div className="entity-head mt-sm">
                        <span className="text-muted text-sm">{item.date}</span>
                        <StatusChip status={item.status} />
                      </div>
                    </div>
                  ))}
                  {recentApplications.length === 0 && (
                    <EmptyState icon="▣" message="No applications received yet." />
                  )}
                </div>
              </div>
            </div>

            <div className="stat-tile-row">
              {metrics.map((metric) => (
                <StatTile key={metric.label} icon="◔" label={metric.label} value={metric.value} hint={metric.trend} />
              ))}
            </div>
          </>
        )
    }
  }, [
    activeTab,
    filteredInternships,
    filteredApplicants,
    filteredProjects,
    searchTerm,
    statusFilter,
    profile,
    email,
    metrics,
    recentApplications,
  ])

  const navGroups = [
    {
      label: 'Company Workspace',
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
      roleLabel="Company"
      identityLabel={profile?.company_name || email || 'Company'}
      accent="blue"
      navGroups={navGroups}
      onLogout={onLogout}
    >
      <HeroBanner
        eyebrow="COMPANY OVERVIEW"
        heading={`Welcome back, ${profile?.company_name || email || 'Company'}.`}
        subheading={`You currently have ${companyInternships.length} internship${companyInternships.length === 1 ? '' : 's'} and ${companyApplicants.length} application${companyApplicants.length === 1 ? '' : 's'} in your hiring pipeline.`}
        ringValue={hiringScore}
        ringCaption="Hiring Score"
        actions={[
          { key: 'post', label: 'Post Internship', onClick: () => { setActiveTab('Internships'); openModal('internship', {}) } },
          { key: 'review', label: 'Review Applicants', onClick: () => setActiveTab('Applications') },
        ]}
      >
        <p className="hero-sub mt-sm">
          {companyInternships.length === 0
            ? 'Complete your company profile and post your first internship to start receiving applications.'
            : companyApplicants.length === 0
              ? 'Your internships are live. Applications will appear here as students apply.'
              : `You currently have ${companyApplicants.length} application${companyApplicants.length === 1 ? '' : 's'} to review across ${companyInternships.length} internship${companyInternships.length === 1 ? '' : 's'}.`}
        </p>
      </HeroBanner>

      {filteredContent}

      {apiError && <div className="empty-card mt-md"><p>{apiError}</p></div>}

      {modal && (
        <div className="modal-scrim" onClick={closeModal}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-panel-header">
              <h3>
                {modal.type === 'profile' && 'Edit Company Profile'}
                {modal.type === 'internship' && 'Edit Internship'}
                {modal.type === 'delete' && 'Delete Internship'}
                {modal.type === 'details' && 'Internship Details'}
                {modal.type === 'decision' && `${modal.data?.action} Applicant`}
                {modal.type === 'projectDecision' && `${modal.data?.action} Project`}
              </h3>
              <button type="button" className="modal-close-btn" onClick={closeModal}>×</button>
            </div>

            {modal.type === 'profile' && (
              <form className="form-grid" onSubmit={saveProfile}>
                <label>Company name<input name="company_name" required defaultValue={modal.data?.company_name || ''} /></label>
                <label>Email<input name="company_email" type="email" required defaultValue={modal.data?.company_email || email} /></label>
                <label>Phone<input name="phone" placeholder="Phone" defaultValue={modal.data?.phone || ''} /></label>
                <label>Website<input name="website" defaultValue={modal.data?.website || ''} /></label>
                <label>Industry<input name="industry" defaultValue={modal.data?.industry || ''} /></label>
                <label>Location<input name="location" defaultValue={modal.data?.location || ''} /></label>
                <label>Description<textarea name="description" defaultValue={modal.data?.description || ''} rows="4" /></label>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">Save changes</button>
                </div>
              </form>
            )}

            {modal.type === 'internship' && (
              <form className="form-grid" onSubmit={saveInternship}>
                <label>Title<input name="title" required defaultValue={modal.data?.title || ''} /></label>
                <label>Location<input name="location" defaultValue={modal.data?.location || ''} /></label>
                <label>Description<textarea name="description" defaultValue={modal.data?.description || ''} /></label>
                <label>Mode<input name="mode" defaultValue={modal.data?.mode || ''} /></label>
                <label>Duration<input name="duration" defaultValue={modal.data?.duration || ''} /></label>
                <label>Stipend<input name="stipend" defaultValue={modal.data?.stipend || ''} /></label>
                <label>Skills<input name="skills_required" defaultValue={modal.data?.skills_required || ''} /></label>
                <label>Deadline<input name="deadline" defaultValue={modal.data?.deadline || ''} /></label>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">Save internship</button>
                </div>
              </form>
            )}

            {modal.type === 'delete' && (
              <div className="form-grid">
                <p>Are you sure you want to delete <strong>{modal.data?.title}</strong>? This action cannot be undone.</p>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal}>Keep</button>
                  <button type="button" className="btn-danger" onClick={() => deleteInternship(modal.data.id)}>Delete</button>
                </div>
              </div>
            )}

            {modal.type === 'details' && (
              <div className="form-grid">
                <p><strong>Role:</strong> {modal.data?.title}</p>
                <p><strong>Location:</strong> {modal.data?.location}</p>
                <p><strong>Status:</strong> {modal.data?.status}</p>
                <p><strong>Applicants:</strong> {modal.data?.applicants}</p>
                <div className="form-actions">
                  <button type="button" className="btn-primary" onClick={closeModal}>Close</button>
                </div>
              </div>
            )}

            {(modal.type === 'decision' || modal.type === 'projectDecision') && (
              <div className="form-grid">
                <p>
                  {modal.type === 'decision'
                    ? `Confirm ${modal.data?.action.toLowerCase()} for ${modal.data?.name}?`
                    : `Confirm ${modal.data?.action.toLowerCase()} for ${modal.data?.student}'s project?`}
                </p>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={() => modal.type === 'decision' ? updateApplicant(modal.data.id, modal.data.action === 'Accept' ? 'accepted' : 'rejected') : closeModal()}>Confirm</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
