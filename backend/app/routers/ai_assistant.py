import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pypdf import PdfReader

from app.database import get_db
from app import models, schemas
from app.agents.graph import complaint_agent

router = APIRouter(prefix="/ai", tags=["ai-assistant"])

FORM_FIELDS = [
    "complaint_source", "customer_name", "product_name", "product_strength",
    "batch_number", "manufacturing_date", "expiry_date", "quantity_affected",
    "complaint_type", "complaint_date", "description",
    "initial_severity", "priority",
]


def _complaint_to_dict(complaint: models.Complaint | None) -> dict | None:
    if complaint is None:
        return None
    return {field: getattr(complaint, field) for field in FORM_FIELDS}


def _apply_result_to_db(db: Session, complaint: models.Complaint | None, result: dict) -> models.Complaint:
    merged = result["merged_fields"]
    if complaint is None:
        complaint = models.Complaint()
        db.add(complaint)

    for field in FORM_FIELDS:
        if field in merged and merged[field] is not None:
            setattr(complaint, field, merged[field])

    complaint.risk_assessment = result["risk_assessment"]
    complaint.status = "Pending Triage" if complaint.status is None else complaint.status
    db.commit()
    db.refresh(complaint)
    return complaint


def _run_agent_and_persist(db: Session, message: str, complaint_id: int | None, is_document: bool) -> schemas.ChatResponse:
    complaint = None
    if complaint_id is not None:
        complaint = db.query(models.Complaint).get(complaint_id)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")

    initial_state = {
        "user_message": message,
        "is_document": is_document,
        "existing_complaint": _complaint_to_dict(complaint),
    }
    result = complaint_agent.invoke(initial_state)

    complaint = _apply_result_to_db(db, complaint, result)

    # Persist chat turns for the conversation history panel
    db.add(models.ChatMessage(complaint_id=complaint.id, role="user", content=message))
    db.add(models.ChatMessage(complaint_id=complaint.id, role="assistant", content=result["assistant_message"]))
    db.commit()

    return schemas.ChatResponse(
        assistant_message=result["assistant_message"],
        complaint=schemas.ComplaintOut.model_validate(complaint),
        tool_used=result["tool_used"],
    )


@router.post("/chat", response_model=schemas.ChatResponse)
def chat(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    """Log Complaint tool (no complaint_id) and Edit Complaint tool (with complaint_id)."""
    return _run_agent_and_persist(db, request.message, request.complaint_id, is_document=False)


def _extract_text_from_upload(file: UploadFile, raw_bytes: bytes) -> str:
    filename = (file.filename or "").lower()
    if filename.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(raw_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    # .txt, .eml, .docx-as-text, or anything else: best-effort decode
    try:
        return raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return raw_bytes.decode("latin-1", errors="ignore")


@router.post("/extract-document", response_model=schemas.ChatResponse)
async def extract_document(
    file: UploadFile = File(...),
    complaint_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
):
    """Document Extraction tool: upload a complaint PDF/TXT/EML and auto-fill the form."""
    raw_bytes = await file.read()
    text = _extract_text_from_upload(file, raw_bytes)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the uploaded document")

    return _run_agent_and_persist(db, text, complaint_id, is_document=True)


@router.get("/chat-history/{complaint_id}")
def chat_history(complaint_id: int, db: Session = Depends(get_db)):
    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.complaint_id == complaint_id)
        .order_by(models.ChatMessage.id.asc())
        .all()
    )
    return [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]
