from fastapi import APIRouter
from pydantic import BaseModel
import time
import uuid
import hashlib

from backend.services.llm_service import MistralService
from backend.services.rag_service import GraphRAGService
from backend.services.crag_service import CorrectiveRAGService

router = APIRouter(prefix="/api/demo", tags=["demo"])

class DemoRequest(BaseModel):
    text: str

_DEMO_CACHE = {}

@router.post("/simulate")
def simulate_pipeline(req: DemoRequest):
    text_hash = hashlib.md5(req.text.strip().encode("utf-8")).hexdigest()
    if text_hash in _DEMO_CACHE:
        return _DEMO_CACHE[text_hash]

    demo_id = f"DEMO-{uuid.uuid4().hex[:6].upper()}"
    steps = [
        {
            "step": 1,
            "name": "Entity Extraction (Mock Model)",
            "time": 0.45,
            "data": {
                "entities": {
                    "phone_numbers": ["9876543210"],
                    "apps": ["Telegram", "trading app"],
                    "financial_amount": "10,000 INR"
                },
                "intent": "Report financial scam"
            }
        },
        {
            "step": 2,
            "name": "Graph Retrieval (Neo4j)",
            "time": 0.21,
            "data": [
                {"id": "COMP-1234", "shared": "phone_numbers", "value": "9876543210", "score": 1.0},
                {"id": "COMP-5678", "shared": "apps", "value": "Telegram", "score": 0.8}
            ]
        },
        {
            "step": 3,
            "name": "Semantic Retrieval (ChromaDB)",
            "time": 0.15,
            "data": [
                {"id": "COMP-9012", "distance": 0.1234},
                {"id": "COMP-3456", "distance": 0.2345}
            ]
        },
        {
            "step": 4,
            "name": "Aggregation & Scoring",
            "time": 0.05,
            "data": [
                {"id": "COMP-1234", "graph_score": 1.0, "semantic_score": 0.5, "final_score": 0.85},
                {"id": "COMP-9012", "graph_score": 0.0, "semantic_score": 0.87, "final_score": 0.65}
            ]
        },
        {
            "step": 5,
            "name": "CRAG Evaluation",
            "time": 0.85,
            "data": {
                "verdict": "correct",
                "avg_relevance_score": 0.92,
                "k_in_chars": 1542,
                "k_ex_chars": 0
            }
        },
        {
            "step": 6,
            "name": "Final Recommendation Generation",
            "time": 1.23,
            "data": {
                "summary": "User scammed out of 10,000 INR via Telegram.",
                "action_items": ["Freeze accounts related to 9876543210", "Investigate fake trading app link"],
                "risk_level": "High"
            }
        }
    ]
    
    result = {"status": "success", "demo_id": demo_id, "steps": steps}
    _DEMO_CACHE[text_hash] = result
    return result
