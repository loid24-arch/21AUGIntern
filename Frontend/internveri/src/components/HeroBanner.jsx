import React from 'react'

/**
 * HeroBanner — the big "command center" header used at the top of a
 * dashboard's overview. Presentational only.
 *
 * ringValue: 0-100 number shown inside the progress ring
 * ringLabel: small label under the ring (e.g. "Readiness")
 * stat: optional { value, label } shown large next to the ring
 * actions: [{ key, label, onClick }] quick-action chips
 */
export default function HeroBanner({
  eyebrow,
  heading,
  subheading,
  ringValue,
  ringCaption,
  actions = [],
  children,
}) {
  const clamped = Math.max(0, Math.min(100, Number(ringValue) || 0))

  return (
    <section className="hero-banner">
      <div className="hero-banner-glow" aria-hidden="true" />

      <div className="hero-banner-main">
        {eyebrow && <div className="hero-eyebrow">{eyebrow}</div>}
        <h1 className="hero-heading">{heading}</h1>
        {subheading && <p className="hero-sub">{subheading}</p>}

        {actions.length > 0 && (
          <div className="hero-actions">
            {actions.map((action) => (
              <button key={action.key} type="button" className="hero-action" onClick={action.onClick}>
                {action.label}
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        )}

        {children}
      </div>

      {ringValue !== undefined && ringValue !== null && (
        <div className="hero-ring-block">
          <div
            className="hero-ring"
            style={{ '--ring-value': `${clamped}%` }}
            aria-label={ringCaption ? `${ringCaption} ${clamped} percent` : `${clamped} percent`}
          >
            <div className="hero-ring-inner">{clamped}</div>
          </div>
          {ringCaption && <span className="hero-ring-caption">{ringCaption}</span>}
        </div>
      )}
    </section>
  )
}
