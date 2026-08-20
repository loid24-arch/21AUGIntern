import React from 'react'

/**
 * AppShell — shared workspace chrome for every role dashboard.
 *
 * Purely presentational. It renders whatever nav groups / actions it is
 * given and calls the onClick handlers it is passed — all state, data
 * fetching, and business logic stays in the page that uses this shell.
 *
 * navGroups: [{ label?: string, items: [{ key, label, icon, active, onClick, badge? }] }]
 */
export default function AppShell({
  roleLabel,
  identityLabel,
  navGroups,
  onLogout,
  accent = 'teal',
  children,
}) {
  return (
    <div className={`workspace accent-${accent}`}>
      <aside className="workspace-rail">
        <div className="rail-brand">
          <span className="rail-mark">IV</span>
          <div className="rail-brand-text">
            <span className="rail-brand-name">InternVeri</span>
            <span className="rail-brand-role">{roleLabel}</span>
          </div>
        </div>

        <nav className="rail-nav">
          {navGroups.map((group, groupIndex) => (
            <div className="rail-group" key={group.label || `group-${groupIndex}`}>
              {group.label && <div className="rail-group-label">{group.label}</div>}
              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`rail-link ${item.active ? 'active' : ''}`}
                  onClick={item.onClick}
                >
                  <span className="rail-link-icon">{item.icon}</span>
                  <span className="rail-link-label">{item.label}</span>
                  {item.badge ? <span className="rail-link-badge">{item.badge}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="rail-footer">
          <div className="rail-identity">
            <span className="rail-identity-avatar">{(identityLabel || '?').charAt(0).toUpperCase()}</span>
            <span className="rail-identity-name">{identityLabel}</span>
          </div>
          <button type="button" className="rail-logout" onClick={onLogout}>
            <span aria-hidden="true">⏻</span> Sign out
          </button>
        </div>
      </aside>

      <main className="workspace-main">{children}</main>
    </div>
  )
}
