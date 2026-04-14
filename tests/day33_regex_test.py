import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.llm_service import MistralService

def test_regex():
    svc = MistralService()
    text = "Report: Fraud at link http://phish-site.com. UPI ID is scammer@okaxis. Contact +91 9876543210 or 8888877777. IP: 192.168.1.1"
    
    # Mock existing entities (already found by LLM)
    entities = {
        "phone_numbers": ["9876543210"],
        "upi_ids": [],
        "ip_addresses": [],
        "urls_domains": []
    }
    
    updated = svc.validate_entities(text, entities)
    
    print("Original Text:", text)
    print("Updated Entities:", updated)
    
    # Assertions
    assert "8888877777" in updated['phone_numbers']
    assert "+91 9876543210" in updated['phone_numbers']
    assert "scammer@okaxis" in updated['upi_ids']
    assert "192.168.1.1" in updated['ip_addresses']
    assert "http://phish-site.com" in updated['urls_domains']
    
    print("\n[SUCCESS] Day 33 Regex Net Part 1 works correctly.")

if __name__ == "__main__":
    try:
        test_regex()
    except Exception as e:
        print(f"\n[FAIL] Regex test failed: {e}")
        sys.exit(1)
