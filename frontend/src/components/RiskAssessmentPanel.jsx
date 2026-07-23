function severityClass(severity) {
  if (!severity) return 'default'
  const s = severity.toLowerCase()
  if (s.includes('critical')) return 'severity-critical'
  if (s.includes('major')) return 'severity-major'
  if (s.includes('minor')) return 'severity-minor'
  return 'default'
}

export default function RiskAssessmentPanel({ riskAssessment }) {
  const ra = riskAssessment || {}
  return (
    <div className="risk-panel">
      <div className="risk-row">
        <span className="risk-label">Severity</span>
        <span className={`pill ${severityClass(ra.severity)}`}>{ra.severity || '—'}</span>
      </div>
      <div className="risk-row">
        <span className="risk-label">Priority</span>
        <span>{ra.priority || '—'}</span>
      </div>
      <div className="risk-row">
        <span className="risk-label">Risk Classification</span>
        <span>{ra.risk_classification || '—'}</span>
      </div>
      <div className="risk-row">
        <span className="risk-label">Next Action</span>
        <span style={{ textAlign: 'right', maxWidth: 220 }}>{ra.next_action || '—'}</span>
      </div>
      <div className="risk-row">
        <span className="risk-label">Root Cause Suggestion</span>
        <span style={{ textAlign: 'right', maxWidth: 220 }}>{ra.root_cause_suggestion || '—'}</span>
      </div>
      <div className="risk-row">
        <span className="risk-label">CAPA Recommendation</span>
        <span style={{ textAlign: 'right', maxWidth: 220 }}>{ra.capa_recommendation || '—'}</span>
      </div>
      {ra.summary && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>
          <strong>Summary:</strong> {ra.summary}
        </div>
      )}
    </div>
  )
}
