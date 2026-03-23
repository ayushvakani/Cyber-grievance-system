import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def setup_db():
    db_url = os.getenv("DATABASE_URL")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Create tables
        tables = [
            """
            CREATE TABLE IF NOT EXISTS complaints (
                id SERIAL PRIMARY KEY,
                complaint_id VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS entities (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                type VARCHAR(50),
                complaint_id VARCHAR(50) REFERENCES complaints(complaint_id)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS officer_actions (
                id SERIAL PRIMARY KEY,
                complaint_id VARCHAR(50) REFERENCES complaints(complaint_id),
                action_taken TEXT,
                officer_name VARCHAR(100),
                action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        ]
        
        for table_sql in tables:
            cur.execute(table_sql)
            
        conn.commit()
        print("Tables created successfully: complaints, entities, officer_actions")
        
        # Verify tables exist
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        existing_tables = [row[0] for row in cur.fetchall()]
        print(f"Verified tables in DB: {existing_tables}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    setup_db()
