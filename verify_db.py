import sys
import os
from sqlalchemy import text
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from backend.db.postgres import engine

def verify_db():
    load_dotenv()
    print("Connecting to PostgreSQL...")
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT 
                    id, complaint_id, citizen_name, phone, location, 
                    date_of_incident, complaint_text, image_path, 
                    raw_text, status, created_at 
                FROM complaints 
                ORDER BY created_at DESC 
                LIMIT 5
            """)
            result = conn.execute(query)
            rows = result.fetchall()
            
            if not rows:
                print("\n[!] No complaints found in the database. Submitting a test complaint to verify...")
                return False
            
            print(f"\n--- Last {len(rows)} Complaints ---")
            for row in rows:
                print(f"\nID: {row[0]} | UUID: {row[1]}")
                print(f"Citizen: {row[2]} | Phone: {row[3]} | Location: {row[4]}")
                print(f"Date of Incident: {row[5]}")
                print(f"Complaint Text: {repr(row[6])}")
                print(f"Image Path: {row[7]}")
                print(f"Raw Text (Merged): {repr(row[8])}")
                print(f"Status: {row[9]}")
                print(f"Created At: {row[10]}")
            return True
            
    except Exception as e:
        print(f"\n[!] Error connecting or querying the database: {e}")
        return False

if __name__ == "__main__":
    found = verify_db()
    if not found:
        # If no complaints exist, we should bypass the API entirely and use TestClient
        # This will use the actual DB if we don't mock it, but we can also start Uvicorn or just do it via TestClient directly
        print("\nSending a test request via TestClient to populate Postgres DB...")
        try:
            from fastapi.testclient import TestClient
            from backend.main import app
            client = TestClient(app)
            
            api_url = "/api/complaint/submit"
            payload = {
                "citizen_name": "DB Verifier",
                "phone": "9876543210",
                "location": "Mumbai",
                "date_of_incident": "2024-04-08",
                "complaint_text": "Testing DB persistence with image and text."
            }
            
            image_path = os.path.join("tests", "samples", "test_clear.png")
            if os.path.exists(image_path):
                with open(image_path, "rb") as f:
                    files = {"complaint_image": ("test_clear.png", f, "image/png")}
                    response = client.post(api_url, data=payload, files=files)
            else:
                response = client.post(api_url, data=payload)
                
            print(f"API Response: {response.status_code} - {response.json()}")
            
            if response.status_code == 200:
                print("\nRe-verifying DB after test submission:")
                verify_db()
        except Exception as e:
            print(f"Failed to submit test complaint: {e}")