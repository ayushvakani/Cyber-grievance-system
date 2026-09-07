import requests
import json
import time

url = "http://localhost:8000/api/complaint/submit"
data = {
    "citizen_name": "Alice Smith",
    "phone": "9876543210",
    "location": "Delhi",
    "date_of_incident": "2023-10-27",
    "complaint_text": "I got a message from +91-9988776655 telling me to update my KYC at http://kyc-update-secure.com. Then they asked me to transfer money to wallet 0xabc123. The email was from admin@support-bank.com."
}

print("Submitting complaint...")
response = requests.post(url, data=data)
if response.status_code == 200:
    comp_id = response.json().get("complaint_id")
    print(f"Complaint ID: {comp_id}. Waiting 15s for background pipeline...")
    time.sleep(15)
    
    print("\nFetching details...")
    res2 = requests.get(f"http://localhost:8000/api/complaint/{comp_id}/detail")
    print(json.dumps(res2.json(), indent=2))
else:
    print(f"Error {response.status_code}: {response.text}")
