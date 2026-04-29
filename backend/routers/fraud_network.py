"""
Day 79: Fraud Network API
GET /api/dashboard/fraud-network  - Neo4j graph data for frontend visualization
"""
import logging
from fastapi import APIRouter
from backend.services.graph_service import Neo4jGraphService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_graph_svc = None

def _get_graph():
    global _graph_svc
    if _graph_svc is None:
        _graph_svc = Neo4jGraphService()
    return _graph_svc


@router.get("/fraud-network")
def get_fraud_network():
    """
    Day 79: Returns all complaint nodes + shared-entity edges from Neo4j.
    Format: { nodes: [...], edges: [...] } — ready for frontend graph rendering.
    """
    graph = _get_graph()
    nodes = []
    edges = []

    try:
        with graph.driver.session() as session:
            # ── Fetch all complaint nodes ────────────────────────────────────
            node_result = session.run(
                """
                MATCH (c:Complaint)
                RETURN c.complaint_id AS id,
                       c.crime_type   AS crime_type,
                       c.severity     AS severity
                LIMIT 200
                """
            )
            node_ids = set()
            for record in node_result:
                cid = record["id"]
                if cid and cid not in node_ids:
                    nodes.append({
                        "id":         cid,
                        "crime_type": record.get("crime_type", "Unknown"),
                        "severity":   record.get("severity", "Unknown"),
                    })
                    node_ids.add(cid)

            # ── Fetch shared-entity edges ────────────────────────────────────
            edge_result = session.run(
                """
                MATCH (c1:Complaint)-[r:SHARES_ENTITY]->(c2:Complaint)
                RETURN c1.complaint_id AS source,
                       c2.complaint_id AS target,
                       r.entity_type   AS entity_type,
                       r.entity_value  AS entity_value
                LIMIT 500
                """
            )
            for record in edge_result:
                src = record.get("source")
                tgt = record.get("target")
                if src and tgt:
                    edges.append({
                        "source":       src,
                        "target":       tgt,
                        "entity_type":  record.get("entity_type", ""),
                        "entity_value": record.get("entity_value", ""),
                    })

    except Exception as e:
        logger.error(f"[FraudNetwork] Neo4j query failed: {e}")

    return {"nodes": nodes, "edges": edges, "node_count": len(nodes), "edge_count": len(edges)}
