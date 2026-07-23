import { createSlice } from '@reduxjs/toolkit'

const emptyComplaint = {
  id: null,
  complaint_source: null,
  customer_name: null,
  product_name: null,
  product_strength: null,
  batch_number: null,
  manufacturing_date: null,
  expiry_date: null,
  quantity_affected: null,
  complaint_type: null,
  complaint_date: null,
  description: null,
  initial_severity: null,
  priority: null,
  status: null,
  risk_assessment: null,
}

const complaintSlice = createSlice({
  name: 'complaint',
  initialState: emptyComplaint,
  reducers: {
    setComplaint(state, action) {
      return { ...state, ...action.payload }
    },
    resetComplaint() {
      return emptyComplaint
    },
  },
})

export const { setComplaint, resetComplaint } = complaintSlice.actions
export default complaintSlice.reducer
