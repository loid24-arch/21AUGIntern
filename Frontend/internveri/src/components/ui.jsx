import React from 'react'

/** Friendly placeholder for empty lists / not-yet-loaded sections. */
export function EmptyState({ icon = '◌', title, message, action }) {
  return (
    <div className="empty-card">
      <span className="empty-card-icon" aria-hidden="true">{icon}</span>
      {title && <h4>{title}</h4>}
      {message && <p>{message}</p>}
      {action && (
        <button type="button" className="btn-ghost" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

/** Small colored status pill. Maps common status words to a color family. */
export function StatusChip({ status, children }) {
  const value = (status || '').toString().toLowerCase().trim()

  const positive = ['approved', 'accepted', 'active', 'completed', 'verified', 'reviewed', 'selected', 'strong', 'high']
  const warn = ['pending', 'under review', 'under-review', 'submitted', 'medium', 'in-progress', 'pending review', 'not_started', 'applied']
  const negative = ['rejected', 'low', 'shortlisted', 'overdue', 'closed', 'needs_revision']

  let tone = 'info'
  if (positive.some((word) => value.includes(word))) tone = 'success'
  else if (warn.some((word) => value.includes(word))) tone = 'warn'
  else if (negative.some((word) => value.includes(word))) tone = 'danger'

  return <span className={`chip chip-${tone}`}>{children || status}</span>
}

/** Compact metric tile used in bento-style stat rows. */
export function StatTile({ icon, label, value, hint }) {
  return (
    <div className="stat-tile">
      {icon && <span className="stat-tile-icon">{icon}</span>}
      <div className="stat-tile-body">
        <span className="stat-tile-label">{label}</span>
        <strong className="stat-tile-value">{value}</strong>
        {hint && <span className="stat-tile-hint">{hint}</span>}
      </div>
    </div>
  )
}
