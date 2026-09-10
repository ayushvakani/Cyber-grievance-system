import requests
import json

prompt = """
Analyze this cybercrime complaint. Return ONLY a JSON object. No other text.

Categories: Other

Schema:
{
  "crime_type": "string",
  "severity": "Low",
  "severity_reason": "",
  "confidence": 0.9,
  "entities": {},
  "summary": "",
  "recommended_sections": []
}

Complaint: "I got hacked"

Response:
"""

try:
    response = requests.post(
        'http://127.0.0.1:11434/api/generate',
        json={
            'model': 'qwen3:4b',
            'prompt': prompt,
            'stream': False,
            'format': 'json',
            'options': {'temperature': 0.0, 'num_predict': 512}
        }
    )
    data = response.json()
    raw = data.get('response', '')
    print('RAW RESPONSE:')
    print(repr(raw))
    print('\nPARSED:')
    print(json.loads(raw))
except Exception as e:
    print('ERROR:', e)
