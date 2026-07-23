from typing import Optional, Any, Dict
from pydantic import BaseModel
from typing import Any


class ComplaintFields(BaseModel):
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity_affected: Optional[str] = None
    complaint_type: Optional[str] = None
    complaint_date: Optional[str] = None
    description: Optional[str] = None
    initial_severity: Optional[str] = None
    priority: Optional[str] = None


class ComplaintOut(ComplaintFields):
    id: int
    status: Optional[str] = None
    risk_assessment: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    complaint_id: Optional[int] = None  # None => create a new complaint (Log tool)


class ChatResponse(BaseModel):
    assistant_message: str
    complaint: ComplaintOut
    tool_used: str
    execution_trace: list[dict[str, Any]]
