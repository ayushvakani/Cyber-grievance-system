import logging
import json
from backend.services.graph_service import Neo4jGraphService
from backend.services.embedding_service import EmbeddingService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_fraud_ring():
    logger.info("=== Testing Day 54: Fraud Ring Detection ===")
    graph_service = Neo4jGraphService()
    
    # 3 Complaints sharing the same UPI ID
    complaints = [
        {
            "id": "CMP-FRAUD-1",
            "entities": {"upi_id": ["fraudster@ybl"]}
        },
        {
            "id": "CMP-FRAUD-2",
            "entities": {"upi_id": ["fraudster@ybl"]}
        },
        {
            "id": "CMP-FRAUD-3",
            "entities": {"upi_id": ["fraudster@ybl"]}
        }
    ]
    
    # Submit to Neo4j
    for c in complaints:
        graph_service.build_complaint_graph(c["id"], "UPI Fraud", "High", c["entities"])
        
    logger.info("Inserted 3 complaints linked to fraudster@ybl.")
    
    # Query Neo4j to check if they are linked
    related = graph_service.find_related_complaints("CMP-FRAUD-1")
    logger.info(f"Related complaints for CMP-FRAUD-1 (Fraud Ring): {json.dumps(related, indent=2)}")


def test_semantic_search():
    logger.info("\n=== Testing Day 52: Semantic Search ===")
    emb_service = EmbeddingService()
    query = "Someone scammed me using a QR code"
    results = emb_service.semantic_search(query, n_results=3)
    logger.info(f"Semantic search results for '{query}': {json.dumps(results, indent=2)}")


if __name__ == "__main__":
    test_fraud_ring()
    test_semantic_search()
