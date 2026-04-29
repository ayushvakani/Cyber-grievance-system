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

    mistral = MistralService()
    rag_svc = GraphRAGService()
    crag_svc = CorrectiveRAGService()
    
    steps = []
    demo_id = f"DEMO-{uuid.uuid4().hex[:6].upper()}"
    
    # STEP 1
    t0 = time.time()
    analysis = mistral.analyze_complaint(req.text)
    steps.append({
        "step": 1,
        "name": f"Entity Extraction ({mistral.model})",
        "time": round(time.time() - t0, 2),
        "data": analysis
    })
    
    # STEP 2
    t0 = time.time()
    graph_results = rag_svc.graph_service.find_related_complaints(demo_id)
    steps.append({
        "step": 2,
        "name": "Graph Retrieval (Neo4j)",
        "time": round(time.time() - t0, 2),
        "data": [
            {"id": r.get("complaint_id"), "shared": r.get("shared_entity_type"), "value": r.get("shared_value"), "score": r.get("similarity_score")} 
            for r in graph_results[:4]
        ]
    })
    
    # STEP 3
    t0 = time.time()
    semantic_results = rag_svc.embedding_service.semantic_search(req.text, n_results=4)
    steps.append({
        "step": 3,
        "name": "Semantic Retrieval (ChromaDB)",
        "time": round(time.time() - t0, 2),
        "data": [
            {"id": r.get("complaint_id"), "distance": round(r.get("distance", 0), 4)} 
            for r in semantic_results
        ]
    })
    
    # STEP 4
    t0 = time.time()
    entities = analysis.get("entities", {})
    agg_docs = rag_svc.retrieve(demo_id, req.text, entities, top_k=5)
    steps.append({
        "step": 4,
        "name": "Aggregation & Scoring",
        "time": round(time.time() - t0, 2),
        "data": [
            {"id": d.get("complaint_id"), "graph_score": round(d.get("graph_score",0),3), "semantic_score": round(d.get("semantic_score",0),3), "final_score": round(d.get("final_score",0),3)} 
            for d in agg_docs
        ]
    })
    
    # STEP 5
    t0 = time.time()
    eval_result = crag_svc.evaluate_retrieval(req.text, agg_docs)
    steps.append({
        "step": 5,
        "name": "CRAG Evaluation",
        "time": round(time.time() - t0, 2),
        "data": {
            "verdict": eval_result.get("verdict"),
            "avg_relevance_score": round(eval_result.get("avg_score", 0), 3),
            "k_in_chars": len(eval_result.get("k_in", "")),
            "k_ex_chars": len(eval_result.get("k_ex", ""))
        }
    })
    
    # STEP 6
    t0 = time.time()
    final = crag_svc.process(demo_id, req.text, agg_docs)
    steps.append({
        "step": 6,
        "name": "Final Recommendation Generation",
        "time": round(time.time() - t0, 2),
        "data": final.get("insights", {})
    })
    
    result = {"status": "success", "demo_id": demo_id, "steps": steps}
    _DEMO_CACHE[text_hash] = result
    return result
