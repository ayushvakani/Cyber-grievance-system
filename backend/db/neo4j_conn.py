import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URL = os.getenv("NEO4J_URL")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

class Neo4jConnection:
    def __init__(self, uri, password):
        self.driver = GraphDatabase.driver(uri, auth=("neo4j", password))

    def close(self):
        self.driver.close()

    def get_session(self):
        return self.driver.session()

neo4j_conn = Neo4jConnection(NEO4J_URL, NEO4J_PASSWORD)

def get_neo4j_session():
    session = neo4j_conn.get_session()
    try:
        yield session
    finally:
        session.close()

if __name__ == "__main__":
    # Quick test/ping
    try:
        with neo4j_conn.get_session() as session:
            result = session.run("RETURN 1 AS result")
            record = result.single()
            print("Neo4j connection successful:", record["result"] == 1)
    except Exception as e:
        print("Neo4j connection failed:", e)
    finally:
        neo4j_conn.close()
