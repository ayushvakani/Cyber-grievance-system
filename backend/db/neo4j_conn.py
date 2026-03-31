import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URL = os.getenv("NEO4J_URL")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

driver = GraphDatabase.driver(NEO4J_URL, auth=("neo4j", NEO4J_PASSWORD))

def get_neo4j_session():
    return driver.session()

if __name__ == "__main__":
    # Quick test/ping
    try:
        with get_neo4j_session() as session:
            result = session.run("RETURN 1 AS result")
            record = result.single()
            print("Neo4j connection successful:", record["result"] == 1)
    except Exception as e:
        print("Neo4j connection failed:", e)
    finally:
        driver.close()
