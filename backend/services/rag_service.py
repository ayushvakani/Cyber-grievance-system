from typing import Dict, List, Any
from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint
from backend.services.graph_service import Neo4jGraphService
from backend.services.embedding_service import EmbeddingService
import logging

logger = logging.getLogger(__name__)


class GraphRAGService:
    def __init__(self):
        self.graph_service = Neo4jGraphService()
        self.embedding_service = EmbeddingService()

    def _batch_fetch_texts(self, complaint_ids: List[str]) -> Dict[str, str]:
        """
        FIX: Fetch ALL complaint texts in ONE query using IN clause
        instead of one query per ID (was N round-trips to Postgres).
        Returns dict: {complaint_id -> text}
        """
        if not complaint_ids:
            return {}
        db = SessionLocal()
        try:
            rows = (
                db.query(Complaint.complaint_id, Complaint.raw_text, Complaint.complaint_text)
                .filter(Complaint.complaint_id.in_(complaint_ids))
                .all()
            )
            result = {}
            for row in rows:
                text = row.raw_text or row.complaint_text or ""
                result[row.complaint_id] = text
            return result
        finally:
            db.close()

    def retrieve(
        self,
        complaint_id: str,
        complaint_text: str,
        entities: list,
        top_k: int = 7,
    ) -> List[Dict[str, Any]]:
        # ── 1. Neo4j graph retrieval ─────────────────────────────────────────
        graph_related = self.graph_service.find_related_complaints(complaint_id)
        graph_dict: Dict[str, Dict] = {}
        for related in graph_related:
            rel_id = related.get("complaint_id")
            if rel_id:
                graph_dict[rel_id] = {
                    "graph_score": related.get("similarity_score", 0.0),
                    "shared_entities": related.get("shared_entities", []),
                }

        # ── 2. ChromaDB semantic retrieval ───────────────────────────────────
        semantic_related = self.embedding_service.semantic_search(complaint_text, n_results=10)
        semantic_dict: Dict[str, Dict] = {}
        for res in semantic_related:
            rel_id = res.get("complaint_id")
            if rel_id:
                distance = res.get("distance", 0.0)
                semantic_score = max(0.0, 1.0 - (distance / 2.0))
                semantic_dict[rel_id] = {
                    "semantic_score": semantic_score,
                    "chroma_text": res.get("text"),  # ChromaDB may embed text
                }

        # ── 3. FIX: Batch-fetch all needed texts in ONE Postgres query ───────
        all_ids = list(set(graph_dict.keys()) | set(semantic_dict.keys()))
        texts_map = self._batch_fetch_texts(all_ids)

        # ── 4. Merge, deduplicate, weighted score ────────────────────────────
        merged: Dict[str, Dict] = {}
        for c_id in all_ids:
            g_data = graph_dict.get(c_id)
            s_data = semantic_dict.get(c_id)

            if g_data and s_data:
                source = "both"
            elif g_data:
                source = "graph"
            else:
                source = "semantic"

            # Prefer Postgres text; fall back to ChromaDB embedded text
            text = texts_map.get(c_id) or (s_data.get("chroma_text") if s_data else "") or ""
            g_score = g_data["graph_score"] if g_data else 0.0
            s_score = s_data["semantic_score"] if s_data else 0.0
            shared_entities = g_data["shared_entities"] if g_data else []

            final_score = (0.6 * g_score) + (0.4 * s_score)

            merged[c_id] = {
                "complaint_id": c_id,
                "text": text,
                "source": source,
                "shared_entities": shared_entities,
                "graph_score": round(g_score, 4),
                "semantic_score": round(s_score, 4),
                "final_score": round(final_score, 4),
            }

        ranked = sorted(merged.values(), key=lambda x: x["final_score"], reverse=True)
        return ranked[:top_k]
