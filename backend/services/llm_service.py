import os
import re
import requests
import json
import logging
import time
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
        Compact master prompt for lower memory usage.
        """
        return f"""
Analyze this cybercrime complaint. Return ONLY a JSON object. No other text.

Categories: UPI Fraud, Phishing, OTP Scam, Ransomware, Identity Theft, Cyber Stalking, Defamation, Hacking, Cyber Bullying, Other

Legal Reference:
- UPI Fraud/Phishing: ["Section 66D IT Act"]
- Stalking: ["Section 354D IPC"]
- Hacking: ["Section 66 IT Act"]
- Identity Theft: ["Section 66C IT Act"]
- Defamation: ["Section 500 IPC"]
- Cyber Bullying: ["Section 67 IT Act"]

Schema:
{{
  "crime_type": "string (from list above)",
  "severity": "Low/Medium/High/Critical",
  "severity_reason": "1-sentence",
  "confidence": 0.0-1.0,
  "entities": {{
    "phone_numbers": [], "upi_ids": [], "bank_names": [], "urls_domains": [], 
    "social_handles": [], "crypto_wallets": [], "ip_addresses": [],
    "amount_lost": 0, "suspect_name": "", "platform": "", "location": ""
  }},
  "summary": "max 2 sentences",
  "recommended_sections": ["IT Act / IPC sections (be specific based on reference)"]
}}

Complaint: "{complaint_text}"

Response:
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
        
        Args:
            text (str): The raw complaint text.
            entities (dict): The dictionary of entities extracted by the LLM.
            
        Returns:
            dict: The updated dictionary with merged regex-extracted entities.
        """
        if not text:
            return entities

        try:
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
            entities['bank_names'] = list(set(entities.get('bank_names', []) + found_accounts))

            # 7. IFSC Codes
            ifsc_regex = r"\b[A-Z]{4}0[A-Z0-9]{6}\b"
            found_ifsc = re.findall(ifsc_regex, text)
            entities['bank_names'] = list(set(entities.get('bank_names', []) + found_ifsc))

        except Exception as e:
            logger.error("[MistralService] Error in validate_entities regex processing: %s", e)

        return entities

    def analyze_complaint(self, complaint_text: str) -> dict:
        """
        Sends prompt to Mistral with a retry mechanism for stability.
        Primary entry point. Calls Ollama, extracts JSON.
        """
        if not complaint_text.strip():
            logger.warning("[MistralService] Empty complaint text.")
            return self._parse_response("")

        # Optional: check connection first to avoid hanging if Ollama is dead
        if not self._check_connection():
            logger.warning("[MistralService] Connection check failed. Proceeding anyway (might timeout).")

        prompt = self._build_prompt(complaint_text)
        
        try:
            logger.info("[MistralService] Sending request to Ollama...")
            response = requests.post(
                self.api_url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.0,
                        "num_predict": 512,  # Limit output to save time/memory
                    }
                },
                timeout=45
            )
            response.raise_for_status()
            
            data = response.json()
            raw_response = data.get("response", "")
            logger.debug("[MistralService] Raw response: %s", raw_response)
            
            return self._parse_response(raw_response)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"[MistralService] API call failed: {e}")
            return self._parse_response("")
            
    def generate_reply_draft(self, complaint_text: str, citizen_name: str) -> str:
        """
        Generate a professional email reply draft for the citizen.
        """
        prompt = f"""
You are a professional cybercrime investigator.
Write a brief, empathetic, and professional email reply to the citizen confirming receipt of their complaint.
Do NOT use placeholders like [Your Name]. Just write the body of the email.
Keep it under 3-4 sentences.

Citizen Name: {citizen_name}
Complaint Context: "{complaint_text[:400]}"

Response:
"""
        try:
            response = requests.post(
                self.api_url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 256,
                    }
                },
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "").strip()
        except Exception as e:
            logger.error(f"[MistralService] Reply generation failed: {e}")
            return f"Dear {citizen_name},\n\nWe have received your cybercrime complaint and are currently reviewing the details. An investigating officer will be assigned to your case shortly and will contact you if further information is required.\n\nRegards,\nCyber Crime Investigation Cell"


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    svc = MistralService()
    if svc._check_connection():
        print("[OK] Ollama is reachable.")
        result = svc.analyze_complaint("Test: Someone stole my UPI money.")
        print("Response:", result)
    else:
        print("[FAIL] Ollama is not running.")
