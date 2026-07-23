import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { resetComplaint } from '../store/complaintSlice'
import { resetChat } from '../store/chatSlice'
import RiskAssessmentPanel from './RiskAssessmentPanel'

// The left-hand "Log Customer Complaint" form.
// Per the assignment's demo video, fields here are populated ONLY by the
// AI assistant (right panel) — they are intentionally read-only inputs.
function Field({ label, value, type = 'text', unit }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type={type}
        readOnly
        value={value ?? ''}
        placeholder="Awaiting AI extraction..."
        className={value ? 'ai-filled' : ''}
      />
      {unit && <span style={{ fontSize: 11, color: '#9aa0ab' }}>{unit}</span>}
    </div>
  )
}

export default function ComplaintForm() {
  const complaint = useSelector((state) => state.complaint)
  const dispatch = useDispatch()
  const [saved, setSaved] = useState(false)

  const handleReset = () => {
    dispatch(resetComplaint())
    dispatch(resetChat())
    setSaved(false)
  }   
  const handleSave = ()=>{
    if(!complaint.id) return
    
    setSaved(true)

    setTimeout(()=>{
      setSaved(false)
    }, 3000)
  }
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Log Customer Complaint</h2>
          <p className="panel-subtitle">API &amp; FDF Quality Assurance Module</p>
        </div>
        <span className="badge">{complaint.status || 'Pending Triage'}</span>
      </div>

      <div className="section-title">1. Origin &amp; Customer Details</div>
      <div className="field-grid">
        <Field label="Complaint Source" value={complaint.complaint_source} />
        <Field label="Customer Name" value={complaint.customer_name} />
      </div>

      <div className="section-title">2. Product &amp; Batch Identification</div>
      <div className="field-grid">
        <Field label="Product Name" value={complaint.product_name} />
        <Field label="Product Strength / Grade" value={complaint.product_strength} />
        <Field label="Batch / Lot Number" value={complaint.batch_number} />
        <Field label="Manufacturing Date" value={complaint.manufacturing_date} type="date" />
        <Field label="Expiry Date" value={complaint.expiry_date} type="date" />
        <Field label="Quantity Affected" value={complaint.quantity_affected} />
      </div>

      <div className="section-title">3. Complaint Details</div>
      <div className="field-grid">
        <Field label="Complaint Type" value={complaint.complaint_type} />
        <Field label="Complaint Date" value={complaint.complaint_date} type="date" />
        <div className="field full">
          <label>Detailed Complaint Description</label>
          <textarea readOnly rows={3} value={complaint.description ?? ''} placeholder="Awaiting AI extraction..." className={complaint.description ? 'ai-filled' : ''} />
        </div>
      </div>

      <div className="section-title">4. Initial Assessment &amp; Priority</div>
      <div className="field-grid">
        <Field label="Initial Severity" value={complaint.initial_severity} />
        <Field label="Priority" value={complaint.priority} />
      </div>

      {complaint.risk_assessment && (
        <>
          <div className="section-title">AI Co-pilot Risk Assessment</div>
          <RiskAssessmentPanel riskAssessment={complaint.risk_assessment} />
        </>
      )}

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={handleReset}>
          Reset Form
        </button>
        <button
          className="btn btn-primary"
          disabled={!complaint.id}
           onClick={handleSave}
          >
            Save Complaint
        </button>
      </div>
      {saved && (
  <div
    style={{
      marginTop: '15px',
      padding: '12px',
      borderRadius: '8px',
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
      fontWeight: '600'
    }}
    >
    ✅ Complaint saved successfully.
    </div>
      )}
    </div>
  )
}
