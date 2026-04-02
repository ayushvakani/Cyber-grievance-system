import os
import sys
from PIL import Image, ImageDraw, ImageEnhance

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.ocr_service import OCRService

def create_low_quality_sample(path, text):
    # Create an image with very low contrast
    img = Image.new('RGB', (600, 150), color=(200, 200, 200))
    draw = ImageDraw.Draw(img)
    # Use a light gray text on light gray background for low contrast
    draw.text((10, 50), text, fill=(180, 180, 180)) 
    
    # Save it
    img.save(path)
    print(f"Created low-quality sample: {path}")

def test_preprocessing():
    service = OCRService(langs=['en'], gpu=False)
    sample_path = "tests/samples/test_low_quality.png"
    os.makedirs("tests/samples", exist_ok=True)
    
    text_to_detect = "PREPROCESSING TEST 123"
    create_low_quality_sample(sample_path, text_to_detect)

    print("\n--- OCR Preprocessing Test ---")
    
    # 1. Run OCR (Preprocessing is enabled by default in the new implementation)
    print("Running OCR with Preprocessing...")
    result = service.extract_text(sample_path)
    
    if "error" in result:
        print(f"FAILED: {result['error']}")
    else:
        print(f"Detected Text: {result['raw_text']}")
        print(f"Confidence: {result['confidence']:.4f}")
        print(f"Is Clear: {result['is_clear']}")
        
        if text_to_detect.lower() in result['raw_text'].lower():
            print("SUCCESS: Text correctly detected after preprocessing!")
        else:
            print("WARNING: Text not detected. Low-quality image might be too challenging.")

    # Cleanup sample
    # if os.path.exists(sample_path):
    #     os.remove(sample_path)

if __name__ == "__main__":
    test_preprocessing()
