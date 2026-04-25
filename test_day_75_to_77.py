import logging
import json
from backend.services.rag_service import GraphRAGService
from backend.services.crag_service import CorrectiveRAGService
from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

def run_tests():
    db = SessionLocal()
    rag_service = GraphRAGService()
    crag_service = CorrectiveRAGService()
    
    try:
        # We need to test the 3 paths. 
        # 1. CORRECT path: A complaint highly similar to existing ones.
        # We can pick CMP-PERF-1 as the target.
        c1 = db.query(Complaint).filter(Complaint.complaint_id == "CMP-PERF-1").first()
        if c1:
            logger.info("=== Testing CORRECT Path ===")
            docs = rag_service.retrieve(c1.complaint_id, c1.raw_text, [])
            res = crag_service.process(c1.complaint_id, c1.raw_text, docs)
            logger.info(f"Verdict: {res.get('crag_verdict')}")
            logger.info(f"Recommendation: {json.dumps(res.get('insights'), indent=2)}")
            
        # 2. AMBIGUOUS path: A complaint with partial match.
        logger.info("=== Testing AMBIGUOUS Path ===")
        ambiguous_text = "My mobile was hacked and money was deducted, but it was via an unknown app downloaded from the internet. The scammer called me and asked to install it."
        docs = rag_service.retrieve("TEST-AMBIG", ambiguous_text, [])
        res = crag_service.process("TEST-AMBIG", ambiguous_text, docs)
        logger.info(f"Verdict: {res.get('crag_verdict')}")
        logger.info(f"Recommendation: {json.dumps(res.get('insights'), indent=2)}")
        
        # 3. INCORRECT path: A completely unrelated or novel complaint.
        logger.info("=== Testing INCORRECT Path ===")
        novel_text = "I received a phone call from an AI voice scammer pretending to be my grandson asking for bail money. The voice was perfectly cloned using deepfake."
        docs = rag_service.retrieve("TEST-NOVEL", novel_text, [])
        res = crag_service.process("TEST-NOVEL", novel_text, docs)
        logger.info(f"Verdict: {res.get('crag_verdict')}")
        logger.info(f"Recommendation: {json.dumps(res.get('insights'), indent=2)}")
        
    finally:
        db.close()
        
if __name__ == "__main__":
    run_tests()
