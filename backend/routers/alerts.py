from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/alerts", tags=["alerts"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/count")
def get_anomalies_count(db: Session = Depends(get_db)):
    try:
        count = db.query(Complaint).filter((Complaint.confidence < 0.5) | (Complaint.severity == "Critical")).count()
        return {"count": count}
    except Exception as e:
        logger.error(f"[Alerts] Count query failed: {e}")
        return {"count": 0}

@router.get("/anomalies")
def get_anomalies(db: Session = Depends(get_db)):
    """
    Day 88: Returns complaints with low confidence (simulating INCORRECT CRAG path)
    or where severity is Critical.
    """
    try:
        anomalies = (
            db.query(Complaint)
            .filter((Complaint.confidence < 0.5) | (Complaint.severity == "Critical"))
            .order_by(Complaint.created_at.desc())
            .all()
        )
        return [
            {
                "complaint_id": c.complaint_id,
                "citizen_name": c.citizen_name,
                "crime_type": c.crime_type,
                "severity": c.severity,
                "confidence": c.confidence,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "summary": c.summary
            }
            for c in anomalies
        ]
    except Exception as e:
        logger.error(f"[Alerts] Anomalies query failed: {e}")
        return []
