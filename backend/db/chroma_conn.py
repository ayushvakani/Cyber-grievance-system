import os
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv

load_dotenv()

CHROMA_PATH = os.getenv("CHROMA_PATH", "./data/chroma")

client = chromadb.PersistentClient(path=CHROMA_PATH)

def get_chroma_client():
    return client

if __name__ == "__main__":
    # Quick test/ping
    try:
        # Create or get a collection to verify client is working
        collection = client.get_or_create_collection(name="test_collection")
        print("ChromaDB connection successful: Client initialized at", CHROMA_PATH)
    except Exception as e:
        print("ChromaDB connection failed:", e)
