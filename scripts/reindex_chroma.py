import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint
from backend.services.embedding_service import EmbeddingService

def sync_postgres_to_chroma():
    db = SessionLocal()
    embedding_service = EmbeddingService()
    
    complaints = db.query(Complaint).all()
    print(f"Found {len(complaints)} complaints in Postgres.")
    
    count = 0
    for complaint in complaints:
        text = complaint.raw_text or complaint.complaint_text
        if not text:
            continue
            
        metadata = {
            "crime_type": complaint.crime_type or "Unknown",
            "severity": complaint.severity or "Unknown",
            "date": complaint.created_at.isoformat() if complaint.created_at else "Unknown"
        }
        
        try:
            emb = embedding_service.generate_embedding(text)
            embedding_service.store_in_chromadb(complaint.complaint_id, text, emb, metadata)
            count += 1
            print(f"Indexed {complaint.complaint_id} ({count}/{len(complaints)})")
        except Exception as e:
            print(f"Error indexing {complaint.complaint_id}: {e}")
            
    print(f"Successfully synced {count} complaints to ChromaDB.")

if __name__ == "__main__":
    sync_postgres_to_chroma()
