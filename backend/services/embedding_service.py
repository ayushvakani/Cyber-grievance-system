import logging
from sentence_transformers import SentenceTransformer
from backend.db.chroma_conn import get_chroma_client

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        """
        Initializes the EmbeddingService by loading the SentenceTransformer model
        (all-MiniLM-L6-v2) and ensuring the ChromaDB collection 'cyber_complaints' exists.
        """
        logger.info("Loading SentenceTransformer model all-MiniLM-L6-v2...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.chroma_client = get_chroma_client()
        self.collection = self.chroma_client.get_or_create_collection(name="cyber_complaints")
        logger.info("ChromaDB collection 'cyber_complaints' initialized.")

    def generate_embedding(self, text: str) -> list[float]:
        """
        Generates a 384-dimensional vector embedding for the given text.
        
        Args:
            text (str): The input text to vectorize.
            
        Returns:
            list[float]: A list of floats representing the text embedding.
        """
        try:
            embedding = self.model.encode(text)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise e

    def store_in_chromadb(self, complaint_id: str, text: str, embedding: list[float], metadata: dict):
        """
        Stores the text and its embedding vector into ChromaDB along with metadata.
        
        Args:
            complaint_id (str): Unique identifier for the complaint.
            text (str): Original text of the complaint.
            embedding (list[float]): Vector embedding of the text.
            metadata (dict): Additional information (crime_type, severity, date).
        """
        try:
            # Ensure we only pass the requested primitive metadata to ChromaDB
            clean_metadata = {
                "crime_type": str(metadata.get("crime_type", "Unknown")),
                "severity": str(metadata.get("severity", "Unknown")),
                "date": str(metadata.get("date", "Unknown"))
            }
            
            self.collection.upsert(
                documents=[text],
                embeddings=[embedding],
                metadatas=[clean_metadata],
                ids=[complaint_id]
            )
            logger.info(f"Stored complaint {complaint_id} in ChromaDB successfully.")
        except Exception as e:
            logger.error(f"Error storing in ChromaDB for {complaint_id}: {str(e)}")
            raise e

    def semantic_search(self, query_text: str, n_results: int = 5):
        """
        Searches ChromaDB for the most semantically similar complaints to the query.
        
        Args:
            query_text (str): The natural language query.
            n_results (int): Number of top results to return (default 5).
            
        Returns:
            list: List of dictionaries containing matching complaint IDs, text, metadata, and distances.
        """
        try:
            query_emb = self.generate_embedding(query_text)
            results = self.collection.query(
                query_embeddings=[query_emb],
                n_results=n_results
            )
            
            formatted_results = []
            if results and results.get("ids") and len(results["ids"]) > 0:
                for i in range(len(results["ids"][0])):
                    formatted_results.append({
                        "complaint_id": results["ids"][0][i],
                        "text": results["documents"][0][i] if results.get("documents") else "",
                        "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                        "distance": results["distances"][0][i] if results.get("distances") else 0.0
                    })
            return formatted_results
        except Exception as e:
            logger.error(f"Error during semantic search: {str(e)}")
            return []

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    service = EmbeddingService()
    
    test_text = "I lost money to a UPI scam where someone asked me to scan a QR code."
    # Test Day 50
    test_emb = service.generate_embedding(test_text)
    logger.info(f"Generated embedding of length: {len(test_emb)}")
    
    # Test Day 51
    service.store_in_chromadb(
        complaint_id="CMP-TEST-999", 
        text=test_text, 
        embedding=test_emb, 
        metadata={"crime_type": "UPI Fraud", "severity": "High", "date": "2023-10-15"}
    )
    print("Test execution finished.")
