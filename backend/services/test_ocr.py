import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.ocr_service import OCRService

def run_day16_tests():
    """
    Day 16 Task: Test 5 sample images (SMS, WhatsApp, Bank, Clear, Unreadable)
    """
    service = OCRService(langs=['en'], gpu=False)
    samples_dir = os.path.join("tests", "samples")
    
    # Ensure samples exist
    if not os.path.exists(samples_dir):
        print(f"Error: Samples directory {samples_dir} not found. Please run scripts/generate_test_samples.py first.")
        return

    test_cases = [
        "test_sms.png",
        "test_whatsapp.png",
        "test_bank.png",
        "test_clear.png",
        "test_unreadable.png"
    ]

    print("\n" + "="*40)
    print("DAY 16 OCR CONFIDENCE TEST SUITE")
    print("="*40)

    for filename in test_cases:
        path = os.path.join(samples_dir, filename)
        print(f"\n[TESTING] {filename}")
        
        result = service.extract_text(path)
        
        if "error" in result:
            print(f"  FAILED: {result['error']}")
        else:
            print(f"  TEXT: {result['raw_text'][:60]}...")
            print(f"  CONFIDENCE: {result['confidence']:.4f}")
            print(f"  IS CLEAR: {result['is_clear']}")
    
    print("\n" + "="*40)
    print("TEST SUITE COMPLETE")
    print("="*40)

if __name__ == "__main__":
    run_day16_tests()
