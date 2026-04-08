import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.ocr_service import OCRService

def test_hindi_hinglish():
    print("\n--- Day 18: Hindi & Hinglish OCR Handling Test ---")
    
    # Initialize service with Hindi and English support
    # Using GPU=False for the test environment consistency
    service = OCRService(langs=['en', 'hi'], gpu=False)
    
    # Test cases
    test_files = [
        {"name": "Hindi_text.png", "desc": "Standard Hindi text"},
        {"name": "test_hi.png", "desc": "Simple Hinglish or short test"}
    ]
    
    for test in test_files:
        path = test["name"]
        if not os.path.exists(path):
            print(f"Skipping {path} (file not found)")
            continue
            
        print(f"\n[Testing] {test['desc']} ({path})")
        result = service.extract_text(path)
        
        if "error" in result:
            print(f"  Error: {result['error']}")
            continue
            
        try:
            print(f"  Extracted Text Sample: {result['raw_text'][:100]}...")
        except UnicodeEncodeError:
            print(f"  Extracted Text Sample: {result['raw_text'][:100].encode('ascii', 'ignore').decode('ascii')}...")
        print(f"  Confidence: {result['confidence']:.4f}")
        
        # Verify Devanagari detection manually or via regex
        devanagari_chars = [c for c in result['raw_text'] if 0x0900 <= ord(c) <= 0x097F]
        has_hindi = len(devanagari_chars) > 0
        
        print(f"  Contains Devanagari: {has_hindi} (Count: {len(devanagari_chars)})")
        
        if result['unsupported_chars']:
            print(f"  Unsupported Characters Found: {len(result['unsupported_chars'])}")
            for item in result['unsupported_chars'][:5]:
                print(f"    - {item['char']} ({item['code']})")
        else:
            print("  No unrenderable/unsupported characters detected.")

    print("\n--- End of Day 18 Test ---")

if __name__ == "__main__":
    test_hindi_hinglish()
