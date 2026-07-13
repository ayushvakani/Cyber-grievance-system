from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Enum
from sqlalchemy.sql import func
from backend.db.postgres import Base
import enum

class SeverityLevel(enum.Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"
    Critical = "Critical"

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String, unique=True, index=True, nullable=False)
    citizen_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    complaint_text = Column(Text, nullable=True)
    image_path = Column(String, nullable=True)
    location = Column(String, nullable=True)
    date_of_incident = Column(String, nullable=True)
    raw_text = Column(Text, nullable=True)
    crime_type = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    severity_reason = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    recommended_sections = Column(Text, nullable=True)
    reply_text = Column(Text, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
