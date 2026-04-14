import os
import re
import requests
import json
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "mistral")


class MistralService:
    """
    Service class to interface with the Mistral 7B model
    running locally via Ollama.
    """

    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = MODEL_NAME):
        self.base_url = base_url
        self.model = model
        self.api_url = f"{self.base_url}/api/generate"

    def _check_connection(self) -> bool:
        """Ping Ollama to verify the service is reachable."""
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return resp.status_code == 200
        except requests.exceptions.ConnectionError:
            logger.error("[MistralService] Ollama is not running on %s", self.base_url)
            return False

    def _build_prompt(self, complaint_text: str) -> str:
        """
        Constructs the master prompt for Mistral.
        """
        return f"""
You are an expert Indian Cybercrime Analyst. Analyze the following cybercrime complaint and return ONLY a valid JSON object. Do not include any introductory or concluding text.

### Supported Crime Types:
UPI Fraud, Phishing, OTP Scam, Ransomware, Identity Theft, Cyber Stalking, Defamation, Hacking, Cyber Bullying, Other

### JSON Schema:
{{
  "crime_type": "string (Categorize into one of the types above)",
  "severity": "string (Low, Medium, High, Critical)",
  "severity_reason": "string (One sentence explanation)",
  "confidence": "number (0.0 to 1.0)",
  "entities": {{
    "phone_numbers": ["string"],
    "upi_ids": ["string"],
    "bank_names": ["string"],
    "urls_domains": ["string"],
    "social_handles": ["string"],
    "crypto_wallets": ["string"],
    "ip_addresses": ["string"],
    "amount_lost": "number or null",
    "suspect_name": "string or null",
    "platform": "string or null",
    "location": "string or null"
  }},
  "summary": "string (Max 2 sentences)",
  "recommended_sections": ["string (e.g. IT Act 66D, IPC 354D)"]
}}

### Complaint:
{complaint_text}

### Response (JSON ONLY):
"""

    def _parse_response(self, raw_text: str) -> dict:
        """
        Extracts and parses JSON from the model's response.
        Handles markdown blocks and malformed text.
        """
        # Default fallback structure
        fallback = {
            "crime_type": "Other",
            "severity": "Low",
            "severity_reason": "Failed to parse AI response.",
            "confidence": 0.1,
            "entities": {
                "phone_numbers": [],
                "upi_ids": [],
                "bank_names": [],
                "urls_domains": [],
                "social_handles": [],
                "crypto_wallets": [],
                "ip_addresses": [],
                "amount_lost": None,
                "suspect_name": None,
                "platform": None,
                "location": None
            },
            "summary": "The automated analysis encountered an issue with the AI response.",
            "recommended_sections": []
        }

        if not raw_text:
            return fallback

        try:
            # 1. Try to find JSON block if wrapped in markdown
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0].strip()

            # 2. Parse the JSON
            parsed = json.loads(raw_text)
            
            # 3. Simple validation (ensure it's a dict and has key fields)
            if isinstance(parsed, dict) and "crime_type" in parsed:
                return parsed
            
            return fallback

        except (json.JSONDecodeError, IndexError, KeyError) as e:
            logger.error("[MistralService] JSON Parsing failed: %s", e)
            return fallback

    def validate_entities(self, text: str, entities: dict) -> dict:
        """
        Runs regex safety checks to catch entities the LLM might have missed.
        Merges regex-found entities into the existing entities dictionary.
        """
        if not text:
            return entities

        # 1. Indian Phone Numbers (+91 or 10 digits)
        phone_regex = r"(?:\+91[\-\s]?)?[6-9]\d{9}"
        found_phones = re.findall(phone_regex, text)
        entities['phone_numbers'] = list(set(entities.get('phone_numbers', []) + found_phones))

        # 2. UPI IDs (word@word format)
        upi_regex = r"[\w.\-]+@[\w.\-]+"
        found_upis = [u.strip(".,!?") for u in re.findall(upi_regex, text)]
        entities['upi_ids'] = list(set(entities.get('upi_ids', []) + found_upis))

        # 3. IP Addresses (IPv4)
        ip_regex = r"\b(?:\d{1,3}\.){3}\d{1,3}\b"
        found_ips = re.findall(ip_regex, text)
        entities['ip_addresses'] = list(set(entities.get('ip_addresses', []) + found_ips))

        # 4. URLs / Domains
        # Simple pattern for URLs and domains
        url_regex = r"https?://[^\s]+|[\w\-]+\.[a-z]{2,}(?:/[^\s]*)?"
        found_urls = [url.strip(".,!?") for url in re.findall(url_regex, text)]
        entities['urls_domains'] = list(set(entities.get('urls_domains', []) + found_urls))

        # 5. Crypto Wallets
        btc_regex = r"\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b"
        eth_regex = r"\b0x[a-fA-F0-9]{40}\b"
        found_crypto = re.findall(btc_regex, text) + re.findall(eth_regex, text)
        entities['crypto_wallets'] = list(set(entities.get('crypto_wallets', []) + found_crypto))

        # 6. Bank Accounts (9-18 digits)
        bank_regex = r"\b[0-9]{9,18}\b"
        found_accounts = re.findall(bank_regex, text)
        entities['bank_names'] = list(set(entities.get('bank_names', []) + found_accounts)) # Heuristic

        # 7. IFSC Codes
        ifsc_regex = r"\b[A-Z]{4}0[A-Z0-9]{6}\b"
        found_ifsc = re.findall(ifsc_regex, text)
        # Note: We can add a separate 'ifsc_codes' key or keep in 'bank_names'
        # For Day 34, let's keep it in 'bank_names' or add a designated key if desired.
        # Given the schema in Day 32, we didn't have a separate 'ifsc' key, 
        # so I'll append it to bank_names for now or we can expand the schema.
        entities['bank_names'] = list(set(entities.get('bank_names', []) + found_ifsc))

        return entities

    def analyze_complaint(self, complaint_text: str) -> dict:
        """
        Send structured prompt to Mistral and return a parsed JSON dict.
        Always returns a dictionary (using a fallback if parsing fails).
        """
        # Default empty/fail dict for early returns
        error_fallback = {
            "crime_type": "Other",
            "severity": "Low",
            "severity_reason": "Inference failed or connection issue.",
            "confidence": 0.0,
            "entities": {},
            "summary": "Processing failed.",
            "recommended_sections": []
        }

        if not complaint_text or not complaint_text.strip():
            logger.warning("[MistralService] Empty complaint text received.")
            return error_fallback

        if not self._check_connection():
            # In production, you might raise here, but for the pipeline flow, 
            # we return a fail state for Day 31 consistency.
            logger.error("[MistralService] Connection check failed before inference.")
            return error_fallback

        full_prompt = self._build_prompt(complaint_text)

        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.1  # Day 31 requirement
            }
        }

        try:
            logger.info("[MistralService] Sending structured request (temp=0.1) to Ollama...")
            response = requests.post(self.api_url, json=payload, timeout=120)
            response.raise_for_status()
            data = response.json()
            raw_text = data.get("response", "").strip()
            
            # Parse the response into a dict
            return self._parse_response(raw_text)

        except Exception as e:
            logger.error("[MistralService] Unexpected error: %s", e)
            return error_fallback


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    svc = MistralService()
    if svc._check_connection():
        print("[OK] Ollama is reachable.")
        result = svc.analyze_complaint("Test: Someone stole my UPI money.")
        print("Response:", result)
    else:
        print("[FAIL] Ollama is not running.")
