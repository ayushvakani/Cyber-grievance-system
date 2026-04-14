import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.llm_service import MistralService

def test_day34():
    svc = MistralService()
    text = "Send 0.5 BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa. Bank: SBI, A/C: 123456789012, IFSC: SBIN0001234. ETH: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    
    # Mock existing entities
    entities = {
        "crypto_wallets": [],
        "bank_names": []
    }
    
    updated = svc.validate_entities(text, entities)
    
    print("Original Text:", text)
    print("Updated Entities:", updated)
    
    # Assertions
    assert "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" in updated['crypto_wallets']
    assert "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" in updated['crypto_wallets']
    assert "123456789012" in updated['bank_names']
    assert "SBIN0001234" in updated['bank_names']
    
    print("\n[SUCCESS] Day 34 Crypto/Bank patterns verified.")

if __name__ == "__main__":
    try:
        test_day34()
    except Exception as e:
        print(f"\n[FAIL] Day 34 test failed: {e}")
        sys.exit(1)
