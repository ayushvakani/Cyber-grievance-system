import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_neo4j_connection():
    uri = os.getenv("NEO4J_URL", "bolt://localhost:7687")
    user = "neo4j"
    password = os.getenv("NEO4J_PASSWORD")

    if not password:
        print("Error: NEO4J_PASSWORD not found in .env file.")
        return

    print(f"Attempting to connect to Neo4j at: {uri}")
    
    try:
        # Connect to the Neo4j database
        print("Driver creating...")
        driver = GraphDatabase.driver(uri, auth=(user, password))
        
        # Verify connectivity
        print("Verifying connectivity...")
        driver.verify_connectivity()
        print("Connectivity verified!")
        
        with driver.session() as session:
            print("Session created, running query...")
            # Run a simple query to get the Neo4j version
            result = session.run("CALL dbms.components() YIELD name, versions, edition RETURN name, versions, edition")
            record = result.single()
            print(f"Connection successful!")
            print(f"Neo4j {record['name']} version: {record['versions'][0]} ({record['edition']})")
        
        # Close the driver
        driver.close()
        
    except Exception as e:
        print(f"Error connecting to Neo4j: {e}")

if __name__ == "__main__":
    test_neo4j_connection()
