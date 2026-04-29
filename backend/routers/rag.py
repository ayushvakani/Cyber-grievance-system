from fastapi import APIRouter, Response
from typing import Dict, Any
from backend.services.crag_service import CorrectiveRAGService
from backend.services.rag_service import GraphRAGService
from backend.services.cache_service import crag_cache
from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/complaint", tags=["RAG Insights"])
crag_service = CorrectiveRAGService()
rag_service = GraphRAGService()

@router.get("/{complaint_id}/insights")
def get_complaint_insights(complaint_id: str, response: Response):
    """
    Day 76 / Day 90: GET /api/complaint/{id}/insights
    Day 90: Returns cached result immediately if available (no Ollama re-run).
    Adds X-Cache header: HIT or MISS for transparency.
    """
    # ── Day 90: Check TTL cache first ──────────────────────────────────────
    cached = crag_cache.get(complaint_id)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        response.headers["X-Cache-TTL"] = str(crag_cache._ttl)
        return cached

    response.headers["X-Cache"] = "MISS"

    # ── Cache MISS: run full CRAG pipeline ─────────────────────────────────
    db = SessionLocal()
    try:
        complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
        if not complaint:
            return {"error": "Complaint not found"}
        complaint_text = complaint.raw_text or complaint.complaint_text or ""
    finally:
        db.close()

    # Retrieve documents using GraphRAG (Neo4j + Chroma)
    retrieved_docs = rag_service.retrieve(complaint_id, complaint_text, entities=[])

    # Process through Corrective RAG (CRAG)
    result = crag_service.process(complaint_id, complaint_text, retrieved_docs)

    # ── Store in TTL cache ─────────────────────────────────────────────────
    crag_cache.set(complaint_id, result)

    return result


@router.delete("/{complaint_id}/insights/cache")
def invalidate_complaint_cache(complaint_id: str):
    """
    Day 90: Manually invalidate the cached result for a complaint.
    Useful after re-processing or manual review updates.
    """
    removed = crag_cache.invalidate(complaint_id)
    return {"invalidated": removed, "complaint_id": complaint_id}


@router.get("/cache/stats")
def get_cache_stats():
    """
    Day 90: Returns cache health metrics — hits, misses, hit_rate, active entries.
    """
    evicted = crag_cache.evict_expired()
    stats = crag_cache.stats()
    stats["evicted_this_call"] = evicted
    return stats
