from sqlalchemy import Column, Integer, String, Text, ForeignKey
from backend.db.postgres import Base
from pydantic import BaseModel
from typing import Optional, List

# SQLAlchemy ORM model
class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String, ForeignKey("complaints.complaint_id"), index=True)
    entity_type = Column(String, nullable=False)
    entity_value = Column(Text, nullable=False)

# Pydantic schemas
class EntitySchema(BaseModel):
    phone_numbers: List[str] = []
    upi_ids: List[str] = []
    bank_names: List[str] = []
    urls_domains: List[str] = []
    social_handles: List[str] = []
    crypto_wallets: List[str] = []
    ip_addresses: List[str] = []
    amount_lost: Optional[str] = None
    suspect_name: Optional[str] = None
    platform: Optional[str] = None
    location: Optional[str] = None

class ComplaintCreate(BaseModel):
    citizen_name: str
    phone: str
    complaint_text: Optional[str] = None
    location: Optional[str] = None
    date_of_incident: Optional[str] = None

class ComplaintResponse(BaseModel):
    complaint_id: str
    crime_type: Optional[str]
    severity: Optional[str]
    confidence: Optional[float]
    summary: Optional[str]
    status: str

    class Config:
        from_attributes = True
