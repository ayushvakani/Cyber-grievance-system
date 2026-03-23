import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in .env file.")
        return

    print(f"Attempting to connect to: {db_url.split('@')[-1]}") # Print host/db only for security
    
    try:
        # Connect to the database
        conn = psycopg2.connect(db_url)
        
        # Create a cursor
        cur = conn.cursor()
        
        # Execute a simple query
        cur.execute("SELECT version();")
        
        # Fetch the result
        db_version = cur.fetchone()
        print(f"Connection successful!")
        print(f"PostgreSQL version: {db_version[0]}")
        
        # Close the cursor and connection
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error connecting to the database: {e}")

if __name__ == "__main__":
    test_connection()
