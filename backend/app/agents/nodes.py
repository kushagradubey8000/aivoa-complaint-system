from dataclasses import fields
import json
from datetime import date
from typing import TypedDict, Optional, Dict, Any

from app.config import settings
from app.groq_client import call_groq_json, call_groq_text
from app.agents.prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    EDIT_SYSTEM_PROMPT,
    RISK_ASSESSMENT_SYSTEM_PROMPT,
    CHAT_REPLY_SYSTEM_PROMPT,
)


class AgentState(TypedDict, total=False):
    user_message: str            # raw text (typed prompt OR text extracted from an uploaded document)
    is_document: bool            # True if input came from a document upload
    existing_complaint: Optional[Dict[str, Any]]  # None => this is a "log" (new complaint)
    tool_used: str                # "log_complaint" | "edit_complaint" | "document_extraction"
    extracted_fields: Dict[str, Any]
    merged_fields: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    assistant_message: str


def classify_intent(state: AgentState) -> AgentState:
    """Decide which of the three mandatory tools this turn corresponds to."""
    if state.get("is_document"):
        state["tool_used"] = "document_extraction"
    elif state.get("existing_complaint"):
        state["tool_used"] = "edit_complaint"
    else:
        state["tool_used"] = "log_complaint"
    return state


def extract_fields(state: AgentState) -> AgentState:
    tool = state["tool_used"]
    model = settings.groq_extraction_model

    if tool == "edit_complaint":
        user_prompt = (
            f"EXISTING COMPLAINT:\n{json.dumps(state.get('existing_complaint') or {}, indent=2)}\n\n"
            f"NEW MESSAGE FROM USER:\n{state['user_message']}"
        )
        fields = call_groq_json(EDIT_SYSTEM_PROMPT, user_prompt, model)
    else:
        # log_complaint or document_extraction both use the full extraction prompt
        fields = call_groq_json(EXTRACTION_SYSTEM_PROMPT, state["user_message"], model)
    

    # For newly logged complaints, default the complaint date to today
    # if the AI couldn't determine one.
    if tool == "log_complaint" and not fields.get("complaint_date"):
        fields["complaint_date"] = date.today().isoformat()
    # Always generate a description if the model didn't return one
    if not fields.get("description"):
        product = fields.get("product_name", "the product")
        strength = fields.get("product_strength", "")
        complaint_type = fields.get("complaint_type", "a quality issue")
        customer = fields.get("customer_name", "the customer")

        strength_text = f" {strength}" if strength else ""

        fields["description"] = (
            f"{customer} reported {complaint_type.lower()} in "
            f"{product}{strength_text}. "
            f"The complaint has been logged for QA review and investigation."
        )    
    # Drop null/empty values so we never overwrite existing data with nothing
    state["extracted_fields"] = {k: v for k, v in fields.items() if v not in (None, "", [])}
    return state


def merge_fields(state: AgentState) -> AgentState:
    base = dict(state.get("existing_complaint") or {})
    base.update(state["extracted_fields"])
    state["merged_fields"] = base
    return state


def run_risk_assessment(state: AgentState) -> AgentState:
    model = settings.groq_reasoning_model
    user_prompt = f"COMPLAINT RECORD:\n{json.dumps(state['merged_fields'], indent=2)}"
    risk = call_groq_json(RISK_ASSESSMENT_SYSTEM_PROMPT, user_prompt, model)
    state["risk_assessment"] = risk

    # Mirror severity/priority into the top-level form fields too, matching the reference UI
    if risk.get("severity"):
        state["merged_fields"]["initial_severity"] = risk["severity"]
    if risk.get("priority"):
        state["merged_fields"]["priority"] = risk["priority"]
    return state


def compose_reply(state: AgentState) -> AgentState:
    model = settings.groq_reasoning_model
    user_prompt = (
        f"TOOL USED: {state['tool_used']}\n"
        f"FIELDS JUST APPLIED: {json.dumps(state['extracted_fields'], indent=2)}\n"
        f"RISK ASSESSMENT: {json.dumps(state['risk_assessment'], indent=2)}"
    )
    state["assistant_message"] = call_groq_text(CHAT_REPLY_SYSTEM_PROMPT, user_prompt, model)
    return state
