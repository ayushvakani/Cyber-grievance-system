import requests
import time
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint

def test_auto_processing():
    url = "http://localhost:8000/api/complaint/submit"
    data = {
        "citizen_name": "Automation Test",
        "phone": "9999988888",
        "location": "New Delhi",
        "date_of_incident": "2026-04-14",
        "complaint_text": "I lost 10000 rupees in a UPI scam at scammer@upi"
    }
    
    # 1. Submit complaint
    try:
        print("Submitting complaint to", url)
        response = requests.post(url, data=data, timeout=10)
        response.raise_for_status()
        res_json = response.json()
        cid = res_json['complaint_id']
        print(f"Submitted successfully! Complaint UUID: {cid}")
    except Exception as e:
        print(f"[FAIL] Submission failed: {e}")
        return
    
    # 2. Poll Database for status change
    db = SessionLocal()
    try:
        print("Polling database for background processing status...")
        for i in range(15): # Poll for up to 75 seconds
            time.sleep(5)
            comp = db.query(Complaint).filter(Complaint.complaint_id == cid).first()
            if not comp:
                print("Record not found yet...")
                continue
                
            print(f"Check {i+1}: Status is '{comp.status}'")
            if comp.status == "processed":
                print("\n[SUCCESS] Day 36 Automation verified. Background task worked!")
                return
            if comp.status == "failed":
                print("\n[FAIL] Processing failed in the background.")
                return
    finally:
        db.close()
    
    print("\n[FAIL] Processing timed out.")

if __name__ == "__main__":
    test_auto_processing()
