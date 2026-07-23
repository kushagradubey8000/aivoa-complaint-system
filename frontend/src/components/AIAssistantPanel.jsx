import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setComplaint } from '../store/complaintSlice'
import { addMessage, setProcessing, setExtractionProgress } from '../store/chatSlice'
import { sendChatMessage, uploadDocument } from '../api/api'
import ChatMessage from './ChatMessage'
import LangGraphExecutionPanel from "./LangGraphExecutionPanel"



export default function AIAssistantPanel() {
  const [currentNode, setCurrentNode] = useState(null)
  const [completedNodes, setCompletedNodes] = useState([])
  const [executionTrace, setExecutionTrace] = useState([])
  const dispatch = useDispatch()
  const complaintId = useSelector((state) => state.complaint.id)
  const { messages, isProcessing, extractionProgress } = useSelector((state) => state.chat)
  const [input, setInput] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [showPasteBox, setShowPasteBox] = useState(false)
  const fileInputRef = useRef(null)

  const applyResult = (result) => {
    
    dispatch(setComplaint(result.complaint))
    dispatch(addMessage({ role: 'assistant', content: result.assistant_message }))
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isProcessing) return
    dispatch(addMessage({ role: 'user', content: text }))
    setInput('')
    dispatch(setProcessing(true))
    setCompletedNodes([])
    setCurrentNode("classify_intent")
    

// 👇 Existing API call
    try {
      // Tool routing happens server-side (LangGraph classify_intent node):
      // no existing complaintId -> Log Complaint tool
      // existing complaintId -> Edit Complaint tool
      const result = await sendChatMessage(text, complaintId)
      
      // Use the REAL LangGraph execution trace from the backend
      setExecutionTrace(result.execution_trace || [])

      setCompletedNodes(
        (result.execution_trace || []).map(step => step.node)
      )
      setCurrentNode(null)

      applyResult(result)
    } catch (err) {
      dispatch(addMessage({ role: 'assistant', content: `Something went wrong: ${err.message}` }))
    } finally {
      dispatch(setProcessing(false))
    }
  }

  const handleFileSelected = async (file) => {
    if (!file) return
    dispatch(addMessage({ role: 'user', content: `📄 Uploaded document: ${file.name}` }))
    dispatch(setProcessing(true))
    dispatch(setExtractionProgress(10))

    // Simulated progress ticks purely for UX; the real work happens server-side.
    const ticker = setInterval(() => {
      dispatch(setExtractionProgress((p) => Math.min(p + 15, 90)))
    }, 400)

    try {
      const result = await uploadDocument(file, complaintId)
      dispatch(setExtractionProgress(100))
      applyResult(result)
    } catch (err) {
      dispatch(addMessage({ role: 'assistant', content: `Document extraction failed: ${err.message}` }))
    } finally {
      clearInterval(ticker)
      dispatch(setProcessing(false))
      setTimeout(() => dispatch(setExtractionProgress(0)), 800)
    }
  }

  const handlePastedSubmit = async () => {
    if (!pastedText.trim()) return
    const blob = new Blob([pastedText], { type: 'text/plain' })
    const file = new File([blob], 'pasted-complaint.txt', { type: 'text/plain' })
    setShowPasteBox(false)
    setPastedText('')
    await handleFileSelected(file)
  }

  return (
    <div className="panel ai-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">✨ AI Complaint Intake Assistant</h2>
          <p className="panel-subtitle">Powered by Groq + LangGraph</p>
        </div>
        <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
          BETA
        </span>
      </div>

      <div
        className="upload-zone"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFileSelected(e.dataTransfer.files[0])
        }}
      >
        ⬆️ Drag &amp; drop complaint document here
        <br />
        or <strong>click to browse</strong>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf,.txt,.eml,.docx"
          onChange={(e) => handleFileSelected(e.target.files[0])}
        />
      </div>

      <div className="divider-or">OR</div>

      {!showPasteBox ? (
        <button className="btn btn-secondary" onClick={() => setShowPasteBox(true)}>
          📋 Paste Complaint Text / Email
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            rows={4}
            placeholder="Paste complaint email or text here..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            style={{ borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handlePastedSubmit}>
              Extract
            </button>
            <button className="btn btn-secondary" onClick={() => setShowPasteBox(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        Supported formats: PDF, DOCX, TXT, EML · Max file size 10MB
      </div>

      {extractionProgress > 0 && (
        <>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${extractionProgress}%` }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Analyzing document content and extracting key details... {extractionProgress}%
          </div>
        </>
      )}

      <div className="chat-thread">
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}
        {isProcessing && <ChatMessage role="assistant" content="Thinking..." />}
      </div>

      <div className="chat-input-row">
        <input
          placeholder="Ask me anything about this complaint..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={isProcessing}>
          ➤
        </button>
      </div>
      <div className="disclaimer">AI responses may contain errors. Please verify information.</div>
      {/* NEW: LangGraph Execution */}
      <LangGraphExecutionPanel
        currentNode={currentNode}
        completedNodes={completedNodes}
        executionTrace={executionTrace}
      />
    </div>
  )
}
