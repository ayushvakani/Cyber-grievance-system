import asyncio
import logging
import os
import httpx
from typing import Dict, Any, List
import random

logger = logging.getLogger(__name__)

class OsintService:
    """
    Simulates external OSINT (Open Source Intelligence) API lookups.
    Uses asyncio.sleep(0.01) to simulate fast network calls without blocking.
    """

    async def check_url(self, url: str) -> Dict[str, Any]:
        api_key = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
        if not api_key:
            logger.info("No GOOGLE_SAFE_BROWSING_API_KEY found, using mock data for URL.")
            # Fallback to mock
            await asyncio.sleep(0.01)
            url_lower = url.lower()
            if any(w in url_lower for w in ["update", "kyc", "secure", "verify", "login"]):
                return {
                    "source": "Google Safe Browsing (Mock)",
                    "risk_score": 95,
                    "flags": ["Phishing", "Malicious Domain"],
                    "status": "Critical Risk",
                    "details": "Mock: Domain matches known phishing signatures."
                }
            return {
                "source": "VirusTotal (Mock)",
                "risk_score": 10,
                "flags": ["Clean"],
                "status": "Safe",
                "details": "Mock: No malicious activity detected."
            }

        payload = {
            "client": {
                "clientId": "cyber_grievance",
                "clientVersion": "1.0.0"
            },
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}]
            }
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}",
                    json=payload,
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    matches = data.get("matches", [])
                    if matches:
                        threats = list(set([m.get("threatType") for m in matches]))
                        return {
                            "source": "Google Safe Browsing API",
                            "risk_score": 98,
                            "flags": threats,
                            "status": "High Risk",
                            "details": f"Flagged as malicious by Google Safe Browsing."
                        }
                    else:
                        return {
                            "source": "Google Safe Browsing API",
                            "risk_score": 10,
                            "flags": ["Clean"],
                            "status": "Safe",
                            "details": "No threats detected by Google Safe Browsing."
                        }
        except Exception as e:
            logger.error(f"Google Safe Browsing API error: {e}")
            
        return {
            "source": "Google Safe Browsing API (Error)",
            "risk_score": 50,
            "flags": ["Unknown"],
            "status": "Pending",
            "details": "Failed to query the API."
        }

    async def check_phone(self, phone: str) -> Dict[str, Any]:
        await asyncio.sleep(0.01)
        phone_clean = phone.replace("-", "").replace(" ", "")
        if "987654" in phone_clean or "12345" in phone_clean or phone.startswith("+91-9"):
            return {
                "source": "Truecaller Spam API",
                "risk_score": 88,
                "flags": ["Spam Reported", "Scam Call"],
                "status": "High Risk"
            }
        return {
            "source": "Truecaller API",
            "risk_score": 15,
            "flags": ["Verified User"],
            "status": "Safe"
        }

    async def check_email(self, email: str) -> Dict[str, Any]:
        api_key = os.getenv("EMAILREP_API_KEY")
        headers = {'User-Agent': 'CyberGrievanceApp/1.0'}
        if api_key:
            headers['Key'] = api_key

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://emailrep.io/{email}",
                    headers=headers,
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    reputation = data.get("reputation", "none")
                    suspicious = data.get("suspicious", False)
                    details = data.get("details", {})
                    
                    risk = 10
                    flags = []
                    status = "Safe"
                    
                    if reputation == "low" or suspicious:
                        risk = 85
                        status = "High Risk"
                    elif reputation == "none":
                        risk = 40
                        status = "Unknown"
                        
                    if details.get("credentials_leaked"):
                        flags.append("Credentials Leaked")
                        risk = max(risk, 75)
                        status = "Moderate Risk" if risk < 85 else "High Risk"
                    if details.get("malicious_activity"):
                        flags.append("Malicious Activity")
                        risk = 95
                        status = "High Risk"
                    if details.get("blacklisted"):
                        flags.append("Blacklisted")
                        risk = 99
                        status = "Critical Risk"
                    
                    if not flags:
                        flags.append(f"Reputation: {reputation.capitalize()}")
                        
                    return {
                        "source": "EmailRep.io",
                        "risk_score": risk,
                        "flags": flags,
                        "status": status,
                        "details": f"EmailRep.io Reputation: {reputation.capitalize()}."
                    }
                elif response.status_code == 429 or response.status_code == 401:
                    logger.warning(f"EmailRep API key required or rate limited. Status: {response.status_code}")
        except Exception as e:
            logger.error(f"EmailRep API error: {e}")
            
        # Fallback to Mock if API fails or requires key
        logger.info("Using mock data for Email (API failed or key required).")
        await asyncio.sleep(0.01)
        email_lower = email.lower()
        if "support" in email_lower or "admin" in email_lower or "service" in email_lower:
            return {
                "source": "HaveIBeenPwned (Mock)",
                "risk_score": 75,
                "flags": ["Compromised in Data Breach"],
                "status": "Moderate Risk",
                "details": "Mock: Found in recent data breaches."
            }
        return {
            "source": "HaveIBeenPwned (Mock)",
            "risk_score": 5,
            "flags": ["No Breaches Found"],
            "status": "Safe",
            "details": "Mock: Email appears clean."
        }

    async def check_crypto(self, wallet: str) -> Dict[str, Any]:
        await asyncio.sleep(0.01)
        return {
            "source": "Chainabuse API",
            "risk_score": 90 if random.random() > 0.5 else 20,
            "flags": ["Linked to Illicit Activity"] if random.random() > 0.5 else ["Clean History"],
            "status": "High Risk" if random.random() > 0.5 else "Safe"
        }

    async def enrich_entities(self, entities: Dict[str, List[str]]) -> Dict[str, Dict[str, Any]]:
        """
        Runs mock OSINT checks in parallel for all provided entities.
        Returns a mapping of entity_value -> osint_report_dict
        """
        results = {}
        tasks = []
        entity_tracking = []

        # Create tasks for all entities
        for url in entities.get("urls_domains", []):
            tasks.append(self.check_url(url))
            entity_tracking.append(url)
            
        for phone in entities.get("phone_numbers", []):
            tasks.append(self.check_phone(phone))
            entity_tracking.append(phone)
            
        for email in entities.get("emails", []): # Add support if emails are extracted
            tasks.append(self.check_email(email))
            entity_tracking.append(email)

        for wallet in entities.get("crypto_wallets", []):
            tasks.append(self.check_crypto(wallet))
            entity_tracking.append(wallet)

        if not tasks:
            return results

        # Run all mocks in parallel
        try:
            completed_reports = await asyncio.gather(*tasks)
            for value, report in zip(entity_tracking, completed_reports):
                results[value] = report
        except Exception as e:
            logger.error(f"Error enriching entities: {e}")

        return results

osint_service = OsintService()
