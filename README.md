# AIVOA — AI-Powered Customer Complaint Management System

A Customer Complaint Management module for pharmaceutical (API & FDF)
manufacturing, built for the AIVOA Round 1 Full Stack Developer assessment.

The **left panel** ("Log Customer Complaint") is a read-only QMS form. The
**right panel** ("AI Complaint Intake Assistant") is a chat + upload copilot
that is the *only* way to fill or edit the form — exactly as shown in the
demo video.

## Tech Stack (as mandated)

| Layer          | Choice                                             |
|----------------|-----------------------------------------------------|
| Frontend       | React 18 + Redux Toolkit                            |
| Backend        | Python + FastAPI                                    |
| AI Agent       | LangGraph                                            |
| LLMs           | Groq — `gemma2-9b-it` (extraction), `llama-3.3-70b-versatile` (reasoning) |
| Database       | PostgreSQL (works with MySQL too via the SQLAlchemy URL) |
| Font           | Google Inter                                         |

## The Three Mandatory AI Tools

All three are implemented by **one LangGraph agent** (`backend/app/agents/graph.py`)
that is invoked from a single `/ai/chat` (text) and `/ai/extract-document`
(file) pair of endpoints. The graph itself decides which "tool" the turn is:

```
classify_intent -> extract_fields -> merge_fields -> assess_risk -> compose_reply
```

1. **Log Complaint Tool** — free-text prompt, no existing complaint yet.
   `classify_intent` routes to `log_complaint`; `extract_fields` calls Groq
   (`gemma2-9b-it`) with a structured-extraction prompt and populates a brand
   new complaint record + risk assessment.

2. **Edit Complaint Tool** — free-text prompt referencing an existing
   `complaint_id`. Routes to `edit_complaint`; the extraction prompt is given
   the existing record as context and returns **only the changed fields**,
   which are merged in — all previously-filled fields are preserved.

3. **Document Extraction Tool** — a PDF/TXT/EML is uploaded via
   `/ai/extract-document`. Text is pulled out with `pypdf` (or decoded
   directly for text/eml), then run through the same extraction → risk →
   reply pipeline. You can keep chatting afterward (e.g. "the batch number is
   CHG260712A") and it will hit the Edit Complaint path since a
   `complaint_id` now exists.

After every extraction/edit, `assess_risk` calls Groq
(`llama-3.3-70b-versatile`) to reason over the current record and produce:
`severity`, `priority`, `next_action`, `root_cause_suggestion`,
`capa_recommendation`, `risk_classification`, and a `summary` — this is the
**AI Co-pilot Risk Assessment** shown under the form.

### Bonus AI features implemented
- **AI Risk Classification** — `risk_classification` field
- **Root Cause Recommendation** — `root_cause_suggestion`
- **CAPA Recommendation** — `capa_recommendation`
- **Complaint Summary** — `summary`
- **Complaint Completeness** — implicit: fields the model isn't confident
  about are left `null` so the form visibly shows "Awaiting AI extraction..."

## Project Structure

```
backend/
  app/
    main.py              FastAPI app, CORS, router registration
    config.py             Settings (env vars)
    database.py            SQLAlchemy engine/session
    models.py               Complaint, ChatMessage ORM models
    schemas.py                Pydantic request/response models
    groq_client.py             Thin Groq SDK wrapper (JSON + text calls)
    agents/
      prompts.py                 All LLM system prompts
      nodes.py                     LangGraph node functions
      graph.py                       Graph assembly (StateGraph)
    routers/
      complaints.py                   Plain CRUD (list/get/delete)
      ai_assistant.py                  /ai/chat, /ai/extract-document
  sample_data/
    sample_complaint_email.txt          Metformin HCl API complaint (paste-in demo)
    sample_complaint_amoxicillin.pdf     Amoxicillin capsules complaint (upload demo)

frontend/
  src/
    App.jsx
    store/                 Redux slices: complaint, chat
    components/
      ComplaintForm.jsx       Left panel (read-only, AI-filled)
      RiskAssessmentPanel.jsx  AI risk assessment card
      AIAssistantPanel.jsx      Right panel: upload / paste / chat
      ChatMessage.jsx
    api/api.js               Axios calls to the backend
```

## Setup

### 1. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env:
#   GROQ_API_KEY=<your key from https://console.groq.com>
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aivoa_complaints
#   (or use sqlite for a zero-setup demo: sqlite:///./aivoa.db)

# create the Postgres DB first if using Postgres:
#   createdb aivoa_complaints

uvicorn app.main:app --reload --port 8000
```

Tables are auto-created on startup via `Base.metadata.create_all`. API docs
available at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. It talks to the backend at
`http://localhost:8000` by default (override with `VITE_API_BASE_URL` in a
`.env` file if needed).

### 3. Try it

- **Log Complaint**: type `Apollo Pharmacy reported discolored capsules in
  Amoxicillin Capsules 500 mg` in the chat box and press enter.
- **Edit Complaint**: after that, type `the batch number is AMX24602 and the
  affected quantity is 48 capsules`.
- **Document Extraction**: drag `backend/sample_data/sample_complaint_amoxicillin.pdf`
  into the upload zone, or click "Paste Complaint Text / Email" and paste in
  the contents of `backend/sample_data/sample_complaint_email.txt`.

## Design Decisions

- **One agent, three tools.** Rather than three separate LangGraph graphs,
  a single graph with a `classify_intent` entry node keeps the reasoning
  pipeline (extract → merge → assess risk → reply) consistent, and it's
  what a real production agent would look like — routing logic is just
  another node, not a different service.
- **Never overwrite with nulls.** The extraction/edit prompts are told to
  return `null` for anything not mentioned, and the merge step drops those
  before updating the record, so a follow-up edit message can never
  accidentally blank out a field the user didn't mention.
- **Severity/priority live in two places on purpose.** They're both a
  top-level form field (matching the reference UI's "Initial Assessment &
  Priority" section) and part of the richer `risk_assessment` JSON blob, so
  the simple form stays simple while the co-pilot panel can show the full
  reasoning.
- **Form is intentionally read-only.** The assignment/video are explicit
  that the left form must only ever be populated via the AI assistant, so
  the inputs are `readOnly` — this also makes it obvious in the UI which
  fields the AI has and hasn't filled yet (unfilled fields keep the "Awaiting
  AI extraction..." placeholder).
- **JSON-mode Groq calls with a regex fallback.** `groq_client.call_groq_json`
  requests `response_format={"type": "json_object"}` and additionally
  strips code fences / regex-extracts a `{...}` block if the model still
  wraps its answer in prose, so a single malformed response degrades
  gracefully instead of crashing the whole request.

## Notes

- No human-written code was hand-typed field-by-field without review — this
  scaffold was generated with AI assistance and reviewed/adapted to match
  the demo video's workflow, per the assignment's allowance.
- Production-grade OCR is intentionally out of scope, per the assignment;
  `pypdf` handles the provided sample PDF's embedded text.
