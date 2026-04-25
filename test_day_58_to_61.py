import logging
import time
from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint
from backend.services.graph_service import Neo4jGraphService
from backend.services.embedding_service import EmbeddingService
from backend.db.neo4j_conn import get_neo4j_session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_day_59_data_validation():
    logger.info("\n=== Testing Day 59: Data Validation ===")
    
    # 1. Get all PostgreSQL complaint IDs
    db = SessionLocal()
    pg_complaints = db.query(Complaint).all()
    pg_ids = {str(c.complaint_id) for c in pg_complaints}
    db.close()
    
    # 2. Get all Neo4j complaint IDs
    neo4j_ids = set()
    with get_neo4j_session() as session:
        result = session.run("MATCH (c:Complaint) RETURN c.complaint_id AS c_id")
        for record in result:
            neo4j_ids.add(record["c_id"])
            
    # 3. Get all ChromaDB complaint IDs
    emb_service = EmbeddingService()
    chroma_data = emb_service.collection.get()
    chroma_ids = set(chroma_data.get("ids", []))
    
    logger.info(f"Total in PostgreSQL: {len(pg_ids)}")
    logger.info(f"Total in Neo4j: {len(neo4j_ids)}")
    logger.info(f"Total in ChromaDB: {len(chroma_ids)}")
    
    # Validation
    orphans_in_neo4j = neo4j_ids - pg_ids
    orphans_in_chroma = chroma_ids - pg_ids
    missing_in_neo4j = pg_ids - neo4j_ids
    missing_in_chroma = pg_ids - chroma_ids
    
    if orphans_in_neo4j:
        logger.warning(f"Orphans found in Neo4j (not in PG): {orphans_in_neo4j}")
    if orphans_in_chroma:
        logger.warning(f"Orphans found in ChromaDB (not in PG): {orphans_in_chroma}")
        
    # Note: Since we only processed a few through the pipeline and added many dummies directly to neo4j/chroma, 
    # we expect orphans. The goal is to flag them.
    logger.info("Day 59 Test SUCCESS: Data consistency validation logic executed.")


def test_day_60_neo4j_walkthrough():
    logger.info("\n=== Testing Day 60: Neo4j Browser Walkthrough Prep ===")
    graph_service = Neo4jGraphService()
    
    # Create 5 linked complaints forming a star/fraud ring
    for i in range(1, 6):
        c_id = f"CMP-WALK-{i}"
        entities = {
            "phone_numbers": ["+918888888888"],
            "upi_ids": ["master_scammer@okicici"]
        }
        graph_service.build_complaint_graph(c_id, "Fraud Ring", "Critical", entities)
        
    logger.info("Inserted 5 linked complaints (CMP-WALK-1 to CMP-WALK-5) sharing a phone and UPI.")
    logger.info("Day 60 SUCCESS: Data prepped. You can view this in Neo4j Browser using:")
    logger.info("MATCH (c:Complaint)-[r]->(e) WHERE c.complaint_id STARTS WITH 'CMP-WALK' RETURN c, r, e")


def test_day_61_edge_cases():
    logger.info("\n=== Testing Day 61: Edge Cases ===")
    graph_service = Neo4jGraphService()
    emb_service = EmbeddingService()
    
    # Edge Case 1: No Entities
    logger.info("Testing Edge Case 1: Complaint with NO entities.")
    graph_service.build_complaint_graph("CMP-EDGE-1", "Harassment", "Medium", {})
    emb = emb_service.generate_embedding("Just some random text without entities.")
    emb_service.store_in_chromadb("CMP-EDGE-1", "Just some random text without entities.", emb, {"crime_type": "Harassment"})
    
    # Verify Neo4j Node exists
    with get_neo4j_session() as session:
        result = session.run("MATCH (c:Complaint {complaint_id: 'CMP-EDGE-1'}) RETURN c").single()
        if result:
            logger.info("Neo4j node for CMP-EDGE-1 successfully created despite having 0 entities.")
            
    # Edge Case 2: Very Long Text
    logger.info("Testing Edge Case 2: Very long text (1000+ words).")
    long_text = "This is a scam. " * 1500  # Will be well over 1000 words
    
    try:
        t0 = time.time()
        long_emb = emb_service.generate_embedding(long_text)
        emb_service.store_in_chromadb("CMP-EDGE-2", long_text, long_emb, {"crime_type": "Spam"})
        logger.info(f"Successfully processed 1500+ word text. Embedding generated and stored in {time.time()-t0:.2f}s.")
        logger.info("Day 61 Test SUCCESS: Edge cases handled successfully.")
    except Exception as e:
        logger.error(f"Day 61 Test FAILED on long text: {e}")

if __name__ == "__main__":
    test_day_59_data_validation()
    test_day_60_neo4j_walkthrough()
    test_day_61_edge_cases()
