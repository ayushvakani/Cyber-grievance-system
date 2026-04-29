"""
Day 78: Dashboard Stats API
GET /api/dashboard/stats  - PostgreSQL aggregate stats
"""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint
from backend.services.embedding_service import EmbeddingService
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
embedding_service = EmbeddingService()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns aggregate complaint statistics for the Dashboard stat cards.
    """
    try:
        total = db.query(func.count(Complaint.id)).scalar() or 0

        high_severity = db.query(func.count(Complaint.id)).filter(
            Complaint.severity.in_(["High", "Critical"])
        ).scalar() or 0

        resolved = db.query(func.count(Complaint.id)).filter(
            Complaint.status == "resolved"
        ).scalar() or 0

        pending = db.query(func.count(Complaint.id)).filter(
            Complaint.status == "pending"
        ).scalar() or 0

        # Crime type distribution for charts
        crime_distribution = (
            db.query(Complaint.crime_type, func.count(Complaint.id).label("count"))
            .filter(Complaint.crime_type.isnot(None))
            .group_by(Complaint.crime_type)
            .all()
        )

        # Severity distribution
        severity_distribution = (
            db.query(Complaint.severity, func.count(Complaint.id).label("count"))
            .filter(Complaint.severity.isnot(None))
            .group_by(Complaint.severity)
            .all()
        )

        return {
            "total_complaints": total,
            "high_severity": high_severity,
            "resolved": resolved,
            "pending": pending,
            "crime_distribution": [
                {"crime_type": r.crime_type, "count": r.count}
                for r in crime_distribution
            ],
            "severity_distribution": [
                {"severity": r.severity, "count": r.count}
                for r in severity_distribution
            ],
        }
    except Exception as e:
        logger.error(f"[Dashboard] Stats query failed: {e}")
        return {
            "total_complaints": 0,
            "high_severity": 0,
            "resolved": 0,
            "pending": 0,
            "crime_distribution": [],
            "severity_distribution": [],
        }


@router.get("/recent")
def get_recent_complaints(
    limit: int = 50, 
    query: Optional[str] = None,
    crime_type: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Day 87: Returns the most recent complaints, supporting semantic search and filters.
    """
    db_query = db.query(Complaint)

    # 1. Semantic Search via ChromaDB
    if query:
        try:
            # Query the existing ChromaDB collection
            results = embedding_service.collection.query(
                query_texts=[query],
                n_results=limit * 2 # fetch more to allow for SQL filtering
            )
            # Flatten list of IDs
            if results["ids"] and len(results["ids"]) > 0:
                matched_ids = results["ids"][0]
                db_query = db_query.filter(Complaint.complaint_id.in_(matched_ids))
            else:
                # Semantic search returned 0 matches, return empty list
                return []
        except Exception as e:
            logger.warning(f"[Dashboard] Semantic search failed: {e}")
            pass

    # 2. SQL Filters
    if crime_type and crime_type != "All":
        db_query = db_query.filter(Complaint.crime_type == crime_type)
    if severity and severity != "All":
        db_query = db_query.filter(Complaint.severity == severity)

    complaints = (
        db_query
        .order_by(Complaint.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "complaint_id": c.complaint_id,
            "citizen_name": c.citizen_name,
            "crime_type": c.crime_type,
            "severity": c.severity,
            "status": c.status,
            "summary": c.summary,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in complaints
    ]
