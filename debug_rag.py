import asyncio
from backend.services.rag_service import GraphRAGService
from backend.services.crag_service import CorrectiveRAGService
from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint

def test():
    db = SessionLocal()
    # Find any complaint
    complaint = db.query(Complaint).first()
    if not complaint:
        print("No complaints in DB.")
        return
        
    complaint_id = complaint.complaint_id
    complaint_text = complaint.raw_text or complaint.complaint_text or ""
    
    print(f"Complaint ID: {complaint_id}")
    print(f"Complaint Text length: {len(complaint_text)}")
    
    rag = GraphRAGService()
    docs = rag.retrieve(complaint_id, complaint_text, entities=[])
    print(f"Retrieved docs count: {len(docs)}")
    for d in docs:
        print(f"Doc ID: {d.get('complaint_id')} - Source: {d.get('source')} - Text length: {len(d.get('text', ''))}")
        
    crag = CorrectiveRAGService()
    eval_res = crag.evaluate_retrieval(complaint_text, docs)
    print(f"CRAG Eval Result: {eval_res['verdict']} - Avg Score: {eval_res['avg_score']}")

if __name__ == "__main__":
    test()
