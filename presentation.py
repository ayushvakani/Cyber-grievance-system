# coding: utf-8
"""
presentation.py
---------------
Live demo of the Graph RAG-based Complaint Retrieval System.

Flow:
  [Complaint Input]
     -> [1] Entity Extraction          (LLMService / llama3.2:3b via Ollama)
     -> [2] Graph Retrieval            (Neo4jGraphService.find_related_complaints)
     -> [3] Semantic Retrieval         (EmbeddingService.semantic_search)
     -> [4] PostgreSQL Text Fetch      (batch IN query - single round trip)
     -> [5] Aggregation + Scoring      (GraphRAGService.retrieve)
     -> [6] CRAG Evaluation            (CorrectiveRAGService.evaluate_retrieval)
     -> [7] Final Recommendation       (CorrectiveRAGService.process)
  [Structured JSON Output]

Model: Configured via MODEL_NAME in .env (default: llama3.2:3b)
"""

import io
import sys
import json
import time
import logging

# Force UTF-8 stdout so Windows cp1252 terminal does not crash
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Suppress noisy third-party loggers
for _noisy in ("httpx", "httpcore", "urllib3", "neo4j", "sentence_transformers", "huggingface_hub"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger("presentation")

# Service imports
from backend.services.llm_service import MistralService
from backend.services.rag_service import GraphRAGService
from backend.services.crag_service import CorrectiveRAGService

DIVIDER = "=" * 80

COMPLAINT_ID   = "DEMO-PRESENTATION-001"
COMPLAINT_TEXT = (
    "I was scammed out of 10,000 INR via a fake trading app link sent on Telegram "
    "by 9876543210. The app asked me to invest more to unlock my funds."
)


def section(title: str, elapsed: float = None) -> None:
    suffix = f"  [{elapsed:.1f}s]" if elapsed is not None else ""
    print(f"\n{DIVIDER}")
    print(f"  {title}{suffix}")
    print(DIVIDER)


def run_presentation() -> None:
    total_start = time.time()

    print(DIVIDER)
    print("  LIVE DEMO: GRAPH RAG-BASED COMPLAINT RETRIEVAL SYSTEM")
    print(DIVIDER)
    print(f"\nComplaint ID : {COMPLAINT_ID}")
    print(f"Complaint    : {COMPLAINT_TEXT}\n")

    # -------------------------------------------------------------------------
    # FIX: Instantiate services ONCE and reuse across all steps.
    # GraphRAGService already owns Neo4jGraphService + EmbeddingService internally.
    # We expose those via .graph_service and .embedding_service attributes.
    # -------------------------------------------------------------------------
    print("Initialising services (once)...")
    t0 = time.time()
    mistral   = MistralService()
    rag_svc   = GraphRAGService()          # owns Neo4j + ChromaDB internally
    crag_svc  = CorrectiveRAGService()
    print(f"  Active LLM model : {mistral.model}")
    print(f"  Services ready in {time.time() - t0:.1f}s\n")

    # ── Step 1: Entity Extraction ─────────────────────────────────────────────
    t0 = time.time()
    section(f"[1/7] ENTITY EXTRACTION  (LLMService: {mistral.model})")
    analysis   = mistral.analyze_complaint(COMPLAINT_TEXT)
    crime_type = analysis.get("crime_type", "N/A")
    severity   = analysis.get("severity",   "N/A")
    confidence = analysis.get("confidence", 0.0)
    entities   = analysis.get("entities",   {})
    elapsed    = time.time() - t0

    print(f"  Crime Type : {crime_type}")
    print(f"  Severity   : {severity}")
    print(f"  Confidence : {confidence}")
    print(f"  Entities   :\n{json.dumps(entities, indent=4)}")
    print(f"  [Step time: {elapsed:.1f}s]")

    # ── Step 2: Graph Retrieval (reuse rag_svc.graph_service) ────────────────
    t0 = time.time()
    section("[2/7] GRAPH RETRIEVAL  (Neo4jGraphService.find_related_complaints)")
    graph_results = rag_svc.graph_service.find_related_complaints(COMPLAINT_ID)
    elapsed = time.time() - t0

    print(f"  Deterministic graph matches found: {len(graph_results)}  [{elapsed:.1f}s]")
    for r in graph_results[:5]:
        print(
            f"  -> {r.get('complaint_id')} | "
            f"Shared: {r.get('shared_entity_type','?')}={r.get('shared_value','?')} | "
            f"Score: {r.get('similarity_score', 0.0):.4f}"
        )

    # ── Step 3: Semantic Retrieval (reuse rag_svc.embedding_service) ─────────
    t0 = time.time()
    section("[3/7] SEMANTIC RETRIEVAL  (EmbeddingService.semantic_search)")
    semantic_results = rag_svc.embedding_service.semantic_search(COMPLAINT_TEXT, n_results=5)
    elapsed = time.time() - t0

    print(f"  Nearest neighbours found: {len(semantic_results)}  [{elapsed:.1f}s]")
    for r in semantic_results:
        dist  = r.get("distance", 0.0)
        score = max(0.0, 1.0 - dist / 2.0)
        print(f"  -> {r.get('complaint_id')} | L2 Distance: {dist:.4f} | Score: {score:.4f}")

    # ── Step 4+5: Postgres batch-fetch + Aggregation ─────────────────────────
    t0 = time.time()
    section("[4+5/7] POSTGRES BATCH FETCH + AGGREGATION  (GraphRAGService.retrieve)")
    agg_docs = rag_svc.retrieve(COMPLAINT_ID, COMPLAINT_TEXT, entities, top_k=7)
    elapsed  = time.time() - t0

    print(f"  Top-{len(agg_docs)} aggregated candidates (60% graph + 40% semantic)  [{elapsed:.1f}s]:")
    for doc in agg_docs:
        print(
            f"  -> {doc['complaint_id']} | "
            f"Graph={doc['graph_score']:.4f} | "
            f"Semantic={doc['semantic_score']:.4f} | "
            f"Final={doc['final_score']:.4f} | "
            f"Source={doc['source']}"
        )

    # ── Step 6: CRAG Evaluation ───────────────────────────────────────────────
    t0 = time.time()
    section("[6/7] CRAG EVALUATION  (CorrectiveRAGService.evaluate_retrieval)")
    eval_result = crag_svc.evaluate_retrieval(COMPLAINT_TEXT, agg_docs)
    elapsed     = time.time() - t0

    verdict   = eval_result.get("verdict",   "N/A")
    avg_score = eval_result.get("avg_score", 0.0)
    print(f"  CRAG Verdict    : {verdict}  [{elapsed:.1f}s]")
    print(f"  Avg Relevance   : {avg_score}")
    print(f"  k_in (snippet)  : {str(eval_result.get('k_in',''))[:200]}...")
    print(f"  k_ex (snippet)  : {str(eval_result.get('k_ex',''))[:200]}...")

    # ── Step 7: Final Recommendation ─────────────────────────────────────────
    t0 = time.time()
    section("[7/7] FINAL RECOMMENDATION  (CorrectiveRAGService.process)")
    final    = crag_svc.process(COMPLAINT_ID, COMPLAINT_TEXT, agg_docs)
    insights = final.get("insights", {})
    elapsed  = time.time() - t0

    print(f"  Complaint ID       : {final.get('complaint_id')}")
    print(f"  CRAG Verdict       : {final.get('crag_verdict')}")
    print(f"  CRAG Avg Score     : {final.get('crag_avg_score')}")
    print(f"  Confidence Score   : {insights.get('confidence_score')}  [{elapsed:.1f}s]")
    print(f"  Fraud Network Alert: {insights.get('fraud_network_alert')}")
    print(f"  Related Case IDs   : {insights.get('related_case_ids')}")
    print("\n  Suggested Actions:")
    for action in insights.get("suggested_actions", []):
        print(f"    - {action}")
    print("\n  Officer Recommendation:")
    print(f"    {insights.get('officer_recommendation')}")

    section(f"END OF DEMONSTRATION  |  Total time: {time.time() - total_start:.1f}s")


if __name__ == "__main__":
    run_presentation()
