from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func

from app.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)

    # 1. Origin & customer details
    complaint_source = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)

    # 2. Product & batch identification
    product_name = Column(String, nullable=True)
    product_strength = Column(String, nullable=True)
    batch_number = Column(String, nullable=True)
    manufacturing_date = Column(String, nullable=True)  # stored as ISO string, kept flexible
    expiry_date = Column(String, nullable=True)
    quantity_affected = Column(String, nullable=True)

    # 3. Complaint details
    complaint_type = Column(String, nullable=True)
    complaint_date = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    # 4. Initial assessment & priority (also mirrored inside risk_assessment)
    initial_severity = Column(String, nullable=True)
    priority = Column(String, nullable=True)

    # AI Co-pilot risk assessment (free-form JSON so the agent can extend it)
    risk_assessment = Column(JSON, nullable=True, default=dict)

    status = Column(String, default="Pending Triage")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, nullable=True)
    role = Column(String)  # "user" | "assistant"
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
