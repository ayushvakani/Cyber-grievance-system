from dotenv import load_dotenv
import os

load_dotenv()

print("--- Testing Database Connections ---")

# Test PostgreSQL
try:
    from backend.db.postgres import engine
    with engine.connect() as conn:
        print("✅ PostgreSQL connected")
except Exception as e:
    print(f"❌ PostgreSQL failed: {e}")

# Test Neo4j
try:
    from backend.db.neo4j_conn import driver
    with driver.session() as session:
        session.run("RETURN 1")
    print("✅ Neo4j connected")
except Exception as e:
    print(f"❌ Neo4j failed: {e}")

# Test ChromaDB
try:
    from backend.db.chroma_conn import get_chroma_client
    client = get_chroma_client()
    client.list_collections()
    print("✅ ChromaDB connected")
except Exception as e:
    print(f"❌ ChromaDB failed: {e}")

# Test Ollama/Mistral
try:
    import ollama
    response = ollama.chat(model='mistral', messages=[{'role': 'user', 'content': 'say ok'}])
    print("✅ Mistral/Ollama connected")
except Exception as e:
    print(f"❌ Mistral failed: {e}")
