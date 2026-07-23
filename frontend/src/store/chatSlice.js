import { createSlice } from '@reduxjs/toolkit'

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [
      {
        role: 'assistant',
        content:
          'Upload a complaint document, or just type a complaint in plain English and I will fill out the form for you.',
      },
    ],
    isProcessing: false,
    extractionProgress: 0,
  },
  reducers: {
    addMessage(state, action) {
      state.messages.push(action.payload)
    },
    setProcessing(state, action) {
      state.isProcessing = action.payload
    },
    setExtractionProgress(state, action) {
      state.extractionProgress = action.payload
    },
    resetChat(state) {
      state.messages = []
      state.isProcessing = false
      state.extractionProgress = 0
    },
  },
})

export const { addMessage, setProcessing, setExtractionProgress, resetChat } = chatSlice.actions
export default chatSlice.reducer
