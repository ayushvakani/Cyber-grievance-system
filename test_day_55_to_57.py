import logging
import json
import time
import random
from backend.services.graph_service import Neo4jGraphService
from backend.services.embedding_service import EmbeddingService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_day_55_semantic_search():
    logger.info("\n=== Testing Day 55: Semantic Search (Phishing Variation) ===")
    emb_service = EmbeddingService()
    
    # Insert phishing complaint
    phishing_text = "I received a phishing email that looked exactly like my bank login. I entered my password and they drained my account."
    emb_service.store_in_chromadb(
        complaint_id="CMP-PHISH-001",
        text=phishing_text,
        embedding=emb_service.generate_embedding(phishing_text),
        metadata={"crime_type": "Phishing", "severity": "High", "date": "2023-11-01"}
    )
    
    # Query with different wording
    query = "fake website stole bank details"
    results = emb_service.semantic_search(query, n_results=1)
    
    logger.info(f"Query: '{query}'")
    if results:
        logger.info(f"Top Result ID: {results[0]['complaint_id']} | Distance: {results[0]['distance']:.4f}")
        logger.info(f"Matched Text: {results[0]['text']}")
        if results[0]['complaint_id'] == "CMP-PHISH-001":
            logger.info("Day 55 Test SUCCESS: Semantic search retrieved the correct complaint despite different wording.")
        else:
            logger.warning("Day 55 Test FAILED: Did not retrieve the expected complaint.")
    else:
        logger.warning("Day 55 Test FAILED: No results returned.")


def test_day_56_cross_entity_linking():
    logger.info("\n=== Testing Day 56: Cross-Entity Linking ===")
    graph_service = Neo4jGraphService()
    
    c_a = {
        "id": "CMP-MULTI-A",
        "entities": {
            "phone_numbers": ["+919999999999"],
            "urls_domains": ["scam.com"],
            "location": "Delhi"
        }
    }
    c_b = {
        "id": "CMP-MULTI-B",
        "entities": {
            "phone_numbers": ["+919999999999"],
            "urls_domains": ["scam.com"],
            "location": "Delhi"
        }
    }
    
    graph_service.build_complaint_graph(c_a["id"], "Multiple", "High", c_a["entities"])
    graph_service.build_complaint_graph(c_b["id"], "Multiple", "High", c_b["entities"])
    
    logger.info("Inserted Complaint A and Complaint B sharing Phone, Domain, and Location.")
    
    related = graph_service.find_related_complaints("CMP-MULTI-A")
    logger.info(f"Related to CMP-MULTI-A: {json.dumps(related, indent=2)}")
    
    if related and related[0]["complaint_id"] == "CMP-MULTI-B":
        shared_types = [ent["type"] for ent in related[0]["shared_entities"]]
        logger.info(f"Shared entity types: {shared_types}")
        if "PhoneNumber" in shared_types and "UrlDomain" in shared_types and "Location" in shared_types:
            logger.info("Day 56 Test SUCCESS: All multi-entity links established correctly.")
        else:
            logger.warning("Day 56 Test FAILED: Missing some entity links.")
    else:
        logger.warning("Day 56 Test FAILED: CMP-MULTI-B not found as related.")


def test_day_57_performance():
    logger.info("\n=== Testing Day 57: Performance Benchmarks (50 Complaints) ===")
    graph_service = Neo4jGraphService()
    emb_service = EmbeddingService()
    
    neo4j_times = []
    chroma_times = []
    
    logger.info("Generating and inserting 50 dummy complaints...")
    
    for i in range(50):
        c_id = f"CMP-PERF-{i}"
        text = f"This is a dummy complaint text number {i} about a cyber crime involving fake calls."
        entities = {"phone_numbers": [f"+91{random.randint(1000000000, 9999999999)}"]}
        metadata = {"crime_type": "Dummy", "severity": "Low", "date": "2023-11-10"}
        
        # Measure Neo4j
        t0 = time.time()
        graph_service.build_complaint_graph(c_id, "Dummy", "Low", entities)
        neo4j_times.append(time.time() - t0)
        
        # Measure ChromaDB + Embedding
        t0 = time.time()
        emb = emb_service.generate_embedding(text)
        emb_service.store_in_chromadb(c_id, text, emb, metadata)
        chroma_times.append(time.time() - t0)
        
    avg_neo4j = sum(neo4j_times) / len(neo4j_times)
    avg_chroma = sum(chroma_times) / len(chroma_times)
    
    logger.info(f"Average Neo4j Write Time: {avg_neo4j:.4f} seconds/complaint")
    logger.info(f"Average ChromaDB Generate+Insert Time: {avg_chroma:.4f} seconds/complaint")
    
    # Measure Semantic Search
    search_times = []
    for _ in range(5):
        t0 = time.time()
        emb_service.semantic_search("fake calls cyber crime", n_results=5)
        search_times.append(time.time() - t0)
    
    avg_search = sum(search_times) / len(search_times)
    logger.info(f"Average Semantic Search Time: {avg_search:.4f} seconds/query")
    
    if avg_neo4j < 2.0 and avg_chroma < 2.0 and avg_search < 2.0:
        logger.info("Day 57 Test SUCCESS: All performance benchmarks met (< 2 seconds).")
    else:
        logger.warning("Day 57 Test FAILED: Some operations exceeded 2 seconds.")


if __name__ == "__main__":
    test_day_55_semantic_search()
    test_day_56_cross_entity_linking()
    test_day_57_performance()
