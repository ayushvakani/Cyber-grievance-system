import json
import logging
import asyncio
from typing import Dict, Any
from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint
from backend.models.entities import Entity
from backend.services.llm_service import MistralService
from backend.services.graph_service import Neo4jGraphService
from backend.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

class ProcessingPipeline:
    def __init__(self):
        """
        Initializes the ProcessingPipeline by instantiating the required services:
        - MistralService (for LLM analysis)
        - Neo4jGraphService (for Fraud Network graph generation)
        - EmbeddingService (for ChromaDB semantic vectors)
        """
        self.llm = MistralService()
        self.graph_service = Neo4jGraphService()
        self.emb_service = EmbeddingService()

    def process(self, complaint_record_id: int) -> Dict[str, Any]:
        """
        Runs the end-to-end processing for a single complaint.
        1. Fetches complaint from PostgreSQL.
        2. Analyzes text using local Mistral LLM.
        3. Enriches and validates entities via regex.
        4. Updates PostgreSQL with parsed data and entities.
        5. Spawns parallel tasks to generate/store Chroma embeddings and Neo4j graph nodes.
        
        Args:
            complaint_record_id (int): The primary key ID of the complaint in PostgreSQL.
            
        Returns:
            Dict[str, Any]: Processing status and the extracted AI data payload.
        """
        db = SessionLocal()
        complaint = None
        try:
            # 1. Fetch Complaint
            complaint = db.query(Complaint).filter(Complaint.id == complaint_record_id).first()
            if not complaint:
                logger.error(f"[Pipeline] Complaint record {complaint_record_id} not found.")
                return {"status": "error", "message": "Not found"}

            text = complaint.raw_text or complaint.complaint_text
            if not text:
                logger.warning(f"[Pipeline] No text content for ID {complaint_record_id}.")
                complaint.status = "failed"
                db.commit()
                return {"status": "error", "message": "No text content"}

            logger.info(f"[Pipeline] Processing ID {complaint_record_id} (CID: {complaint.complaint_id})")

            # 2. Mistral AI Analysis (JSON)
            ai_data = self.llm.analyze_complaint(text)

            # 3. Regex Enrichment
            entities = self.llm.validate_entities(text, ai_data.get('entities', {}))

            # 4. Update Complaint Table
            complaint.crime_type = ai_data.get('crime_type')
            complaint.severity = ai_data.get('severity')
            complaint.severity_reason = ai_data.get('severity_reason')
            complaint.confidence = ai_data.get('confidence')
            complaint.summary = ai_data.get('summary')
            
            # Sections stored as comma-separated or JSON
            sections = ai_data.get('recommended_sections', [])
            complaint.recommended_sections = ", ".join(sections) if sections else None
            
            # 5. Populate Entities Table
            # Clear existing mapped entities for this ID to avoid duplicates on re-processing
            db.query(Entity).filter(Entity.complaint_id == complaint.complaint_id).delete()

            for e_type, e_value in entities.items():
                if not e_value:
                    continue
                
                # If list (like phone_numbers), add each
                if isinstance(e_value, list):
                    for val in e_value:
                        if val:
                            new_entity = Entity(
                                complaint_id=complaint.complaint_id,
                                entity_type=e_type,
                                entity_value=str(val)
                            )
                            db.add(new_entity)
                else:
                    # Single value (like amount_lost)
                    new_entity = Entity(
                        complaint_id=complaint.complaint_id,
                        entity_type=e_type,
                        entity_value=str(e_value)
                    )
                    db.add(new_entity)

            # Day 53: Pipeline Integration
            # Call graph_service and embedding_service in parallel using asyncio.gather
            metadata = {
                "crime_type": complaint.crime_type,
                "severity": complaint.severity,
                "date": str(getattr(complaint, 'created_at', 'Unknown'))
            }
            
            async def parallel_store():
                emb = self.emb_service.generate_embedding(text)
                await asyncio.gather(
                    asyncio.to_thread(self.graph_service.build_complaint_graph, complaint.complaint_id, complaint.crime_type, complaint.severity, entities),
                    asyncio.to_thread(self.emb_service.store_in_chromadb, complaint.complaint_id, text, emb, metadata)
                )

            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop is None:
                asyncio.run(parallel_store())
            else:
                self.graph_service.build_complaint_graph(complaint.complaint_id, complaint.crime_type, complaint.severity, entities)
                emb = self.emb_service.generate_embedding(text)
                self.emb_service.store_in_chromadb(complaint.complaint_id, text, emb, metadata)

            complaint.status = "processed"
            db.commit()
            logger.info(f"[Pipeline] Successfully processed complaint {complaint.complaint_id}")
            return {"status": "success", "data": ai_data}

        except Exception as e:
            logger.error(f"[Pipeline] Critical failure for record {complaint_record_id}: {str(e)}")
            if complaint:
                try:
                    complaint.status = "failed"
                    db.commit()
                except Exception as commit_err:
                    logger.error(f"[Pipeline] Failed to set status to 'failed': {commit_err}")
            return {"status": "error", "message": str(e)}
        finally:
            db.close()

if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    pipeline = ProcessingPipeline()
    # Usage: python -m backend.services.pipeline_service <id>
    if len(sys.argv) > 1:
        pipeline.process(int(sys.argv[1]))
    else:
        print("Please provide a complaint database ID to process.")
