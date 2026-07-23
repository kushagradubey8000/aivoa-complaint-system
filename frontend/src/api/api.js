import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const client = axios.create({ baseURL: API_BASE })

export async function sendChatMessage(message, complaintId) {
  const { data } = await client.post('/ai/chat', {
    message,
    complaint_id: complaintId ?? null,
  })
  return data
}

export async function uploadDocument(file, complaintId) {
  const form = new FormData()
  form.append('file', file)
  if (complaintId) form.append('complaint_id', complaintId)
  const { data } = await client.post('/ai/extract-document', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function fetchComplaint(id) {
  const { data } = await client.get(`/complaints/${id}`)
  return data
}

export async function listComplaints() {
  const { data } = await client.get('/complaints/')
  return data
}
