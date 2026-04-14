import requests
import time
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.db.postgres import SessionLocal
from backend.models.complaint import Complaint

BASE_URL = "http://localhost:8000/api/complaint/submit"

SCENARIOS = [
    {
        "name": "UPI Fraud",
        "text": "Yesterday I tried to pay for groceries but the shopkeeper's QR didn't work. Later I got a message that 15,000 was debited from my account to scammer@okaxis.",
        "expected": "UPI Fraud"
    },
    {
        "name": "Phishing",
        "text": "I received an email saying my HDFC account is blocked. It told me to log in at http://hdfc-net-secure.com to verify my details.",
        "expected": "Phishing"
    },
    {
        "name": "OTP Scam",
        "text": "A person calling from 'Jio Customer Care' asked for a verification code sent to my mobile. As soon as I shared the OTP, 5000 was stolen from my wallet.",
        "expected": "OTP Scam"
    },
    {
        "name": "Ransomware",
        "text": "All my files have been renamed to .encrypted. A note says I must pay 0.05 BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa to get the key.",
        "expected": "Ransomware"
    },
    {
        "name": "Identity Theft",
        "text": "Someone has used my photos and name to create a fake Facebook profile 'Murtaza_Real' and is asking my friends for money.",
        "expected": "Identity Theft"
    }
]

def run_tests():
    db = SessionLocal()
    uids = []
    
    print(f"{'--- PHASE 3 DAY 37 BATCH TEST ---':^50}")
    
    # 1. Submit all scenarios
    for s in SCENARIOS:
        print(f"Submitting: {s['name']}...", end=" ", flush=True)
        try:
            resp = requests.post(BASE_URL, data={
                "citizen_name": f"Test {s['name']}",
                "phone": "9000000000",
                "location": "Test Lab",
                "date_of_incident": "2026-04-14",
                "complaint_text": s['text']
            }, timeout=10)
            uid = resp.json()['complaint_id']
            uids.append((uid, s['expected']))
            print(f"OK (UUID: {uid[:8]}...)")
        except Exception as e:
            print(f"FAILED: {e}")

    # 2. Poll and Verify
    print("\nWaiting for AI processing (this may take 2-3 minutes)...")
    results = []
    for _ in range(30): # Poll for up to 5 minutes
        time.sleep(10)
        all_done = True
        current_results = []
        
        for uid, expected in uids:
            comp = db.query(Complaint).filter(Complaint.complaint_id == uid).first()
            if comp.status != "processed":
                all_done = False
                break
            current_results.append({
                "expected": expected,
                "found": comp.crime_type,
                "confidence": comp.confidence,
                "severity": comp.severity
            })
            
        if all_done:
            results = current_results
            break
            
    # 3. Final Report
    print("\n" + "="*50)
    print(f"{'SCENARIO':<20} | {'FOUND':<15} | {'CONF':<5}")
    print("-" * 50)
    for res in results:
        status = "✅" if res['expected'].lower() in res['found'].lower() else "❌"
        print(f"{res['expected']:<20} | {res['found']:<15} | {res['confidence']:.2f} {status}")
    print("="*50)
    
    db.close()

if __name__ == "__main__":
    run_tests()
