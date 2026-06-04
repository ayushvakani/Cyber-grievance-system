import logging
from backend.db.neo4j_conn import get_neo4j_session

logger = logging.getLogger(__name__)

class Neo4jGraphService:
    def __init__(self):
        """
        Initializes the Neo4jGraphService. Connection testing is skipped 
        on boot to prevent timeouts with free tier cloud databases.
        """
        pass

    def _merge_entities(self, session, complaint_id: str, entities: list, node_label: str, property_name: str, rel_type: str):
        """Helper method to execute MERGE queries for different entity types."""
        if not entities:
            return
        query = f"""
        MATCH (c:Complaint {{complaint_id: $complaint_id}})
        UNWIND $entities AS entity_val
        MERGE (n:{node_label} {{{property_name}: entity_val}})
        MERGE (c)-[:{rel_type}]->(n)
        """
        session.run(query, complaint_id=complaint_id, entities=entities)

    def build_complaint_graph(self, complaint_id: str, crime_type: str, severity: str, entities: dict):
        """
        Creates a central Complaint node and links it to extracted entity nodes
        (PhoneNumbers, UpiIds, CryptoWallets, etc.) using relationships.
        
        Args:
            complaint_id (str): Unique ID of the complaint.
            crime_type (str): Classification of the crime.
            severity (str): Severity level.
            entities (dict): Dictionary of extracted entities.
        """
        try:
            with get_neo4j_session() as session:
                # Step 1: MERGE Complaint node (Day 44)
                query_complaint = """
                MERGE (c:Complaint {complaint_id: $complaint_id})
                SET c.crime_type = $crime_type,
                    c.severity = $severity
                RETURN c
                """
                session.run(query_complaint, complaint_id=complaint_id, crime_type=crime_type, severity=severity)
                logger.info(f"Merged Complaint node for {complaint_id}")

                # Step 2: Merge Entities using helper method
                self._merge_entities(session, complaint_id, entities.get("phone_numbers", []), "PhoneNumber", "number", "INVOLVES_PHONE")
                self._merge_entities(session, complaint_id, entities.get("upi_ids", []), "UpiId", "upi_id", "INVOLVES_UPI")
                self._merge_entities(session, complaint_id, entities.get("bank_names", []), "BankName", "name", "INVOLVES_BANK")
                self._merge_entities(session, complaint_id, entities.get("urls_domains", []), "UrlDomain", "url", "INVOLVES_URL")
                self._merge_entities(session, complaint_id, entities.get("social_handles", []), "SocialHandle", "handle", "INVOLVES_SOCIAL")
                self._merge_entities(session, complaint_id, entities.get("crypto_wallets", []), "CryptoWallet", "address", "INVOLVES_WALLET")

                location = entities.get("location")
                if location:
                    query_loc = """
                    MATCH (c:Complaint {complaint_id: $complaint_id})
                    MERGE (l:Location {name: $location})
                    MERGE (c)-[:LOCATED_IN]->(l)
                    """
                    session.run(query_loc, complaint_id=complaint_id, location=location)

                logger.info(f"Successfully merged all entity nodes and relationships for {complaint_id}")

        except Exception as e:
            logger.error(f"Error building complaint graph for {complaint_id}: {str(e)}")
            raise e

    def find_related_complaints(self, complaint_id: str):
        """
        Executes a Fraud Network Query to find other complaints that share entities 
        with the given complaint. Calculates a normalized similarity score.
        
        Args:
            complaint_id (str): The target complaint ID.
            
        Returns:
            list: List of dictionaries containing related complaints, shared entities, and scores.
        """
        try:
            with get_neo4j_session() as session:
                query = """
                MATCH (c1:Complaint {complaint_id: $complaint_id})-[]->(e1)
                WITH c1, count(DISTINCT e1) AS c1_total
                
                MATCH (c1)-[]->(shared)<-[]-(c2:Complaint)
                WITH c1, c1_total, c2, count(DISTINCT shared) AS shared_count, 
                     collect({
                         type: labels(shared)[0], 
                         value: coalesce(shared.upi_id, shared.number, shared.name, shared.url, shared.handle, shared.address)
                     }) AS shared_entities
                
                MATCH (c2)-[]->(e2)
                WITH c2, c1_total, shared_count, shared_entities, count(DISTINCT e2) AS c2_total
                WITH c2, shared_entities, shared_count, c1_total, c2_total, 
                     CASE WHEN c1_total > c2_total THEN toFloat(c1_total) ELSE toFloat(c2_total) END AS max_entities
                
                RETURN c2.complaint_id AS related_complaint_id,
                       shared_entities,
                       (toFloat(shared_count) / max_entities) AS similarity_score
                ORDER BY similarity_score DESC
                """
                result = session.run(query, complaint_id=complaint_id)
                related = []
                for record in result:
                    related.append({
                        "complaint_id": record["related_complaint_id"],
                        "shared_entities": record["shared_entities"],
                        "similarity_score": round(record["similarity_score"], 4)
                    })
                return related
        except Exception as e:
            logger.error(f"Error finding related complaints for {complaint_id}: {str(e)}")
            return []

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    service = Neo4jGraphService()
    
    # 1. Build a test complaint
    test_entities_1 = {
        "phone_numbers": ["+919876543210"],
        "upi_ids": ["scammer@ybl", "fraud@oksbi"],
        "bank_names": ["HDFC Bank"],
        "urls_domains": ["scam-site.com"],
        "social_handles": ["@scammer123"],
        "crypto_wallets": ["0xABC123DEF456"],
        "location": "Mumbai"
    }
    service.build_complaint_graph("CMP-TEST-123", "UPI Fraud", "High", test_entities_1)
    
    # 2. Build another test complaint sharing a UPI ID
    test_entities_2 = {
        "upi_ids": ["scammer@ybl"]
    }
    service.build_complaint_graph("CMP-TEST-124", "Phishing", "Medium", test_entities_2)

    # 3. Test find_related_complaints
    related = service.find_related_complaints("CMP-TEST-123")
    logger.info(f"Related complaints for CMP-TEST-123: {related}")
    
    print("Test execution finished.")
