import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.ocr_service import OCRService

def test_ocr_pipeline():
    service = OCRService(langs=['en'], gpu=False) # Use CPU for stable tests
    samples_dir = os.path.join("tests", "samples")
    
    test_cases = [
        {"file": "test_sms.png", "expect_success": True},
        {"file": "test_whatsapp.png", "expect_success": True},
        {"file": "test_bank.png", "expect_success": True},
        {"file": "test_clear.png", "expect_success": True},
        {"file": "test_unreadable.png", "expect_success": False},
        {"file": "non_existent.png", "expect_success": False}
    ]

    print("\n--- OCR Pipeline Test Suite ---")
    for case in test_cases:
        path = os.path.join(samples_dir, case["file"])
        print(f"\nProcessing: {case['file']}")
        
        result = service.extract_text(path)
        
        if "error" in result:
            print(f"  Result: [FAILED AS EXPECTED] {result['error']}" if not case["expect_success"] else f"  Result: [UNEXPECTED FAILURE] {result['error']}")
        else:
            print(f"  Result: [SUCCESS] Text: {result['raw_text'][:50]}...")
            print(f"  Confidence: {result['confidence']:.2f} | Clear: {result['is_clear']}")
            
            if case["expect_success"]:
                if result['confidence'] > 0:
                    print("  Status: OK")
                else:
                    print("  Status: WARNING (No text found in readable image)")
            else:
                print("  Status: UNEXPECTED SUCCESS (Should have failed)")

    print("\n--- Test Suite Complete ---")

if __name__ == "__main__":
    test_ocr_pipeline()
