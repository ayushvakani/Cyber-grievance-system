from dotenv import load_dotenv
import os
load_dotenv()
print("DATABASE_URL:", os.getenv("DATABASE_URL"))
print("NEO4J_URL:", os.getenv("NEO4J_URL"))
print("CHROMA_PATH:", os.getenv("CHROMA_PATH"))