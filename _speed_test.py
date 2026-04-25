import time
import os

os.environ['MODEL_NAME'] = 'llama3.2:3b'

from backend.services.llm_service import MistralService

svc = MistralService()
print(f"Model: {svc.model}")

t = time.time()
res = svc.analyze_complaint("I lost 5000 INR to a fake UPI link sent by 9898989898 on WhatsApp.")
elapsed = time.time() - t

print(f"Time      : {elapsed:.2f}s")
print(f"Crime     : {res.get('crime_type')}")
print(f"Severity  : {res.get('severity')}")
print(f"Confidence: {res.get('confidence')}")
