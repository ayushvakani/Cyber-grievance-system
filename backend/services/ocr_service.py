
import os
import re
from PIL import Image, ImageEnhance

class OCRService:
    def __init__(self, langs=['en', 'hi'], gpu=True):
        """
        Initializes the EasyOCR reader.
        Args:
            langs (list): Languages to support (e.g., ['en', 'hi']).
            gpu (bool): Use GPU if available.
        """
        self.langs = langs
        # In a real development environment, we should check if GPU is available
        # But per the requirement, we set gpu=True.
        import easyocr
        self.reader = easyocr.Reader(self.langs, gpu=gpu)

    def is_image_clear(self, confidence: float) -> bool:
        """
        Check if the OCR confidence is above the threshold (0.65).
        """
        return confidence >= 0.65

    def _preprocess_image(self, image_path: str) -> str:
        """
        Preprocessing step: resize, grayscale, and increase contrast.
        Returns the path to the processed image.
        """
        try:
            with Image.open(image_path) as img:
                # 1. Resize if too large (max 1920px)
                max_size = 1920
                if max(img.size) > max_size:
                    img.thumbnail((max_size, max_size))

                # 2. Convert to Grayscale
                img = img.convert('L')

                # 3. Increase Contrast
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(1.5) # Factor 1.5 for better readability

                # 4. Save to temporary processed file
                processed_path = image_path.replace('.', '_processed.')
                img.save(processed_path)
                return processed_path
        except Exception as e:
            print(f"Preprocessing failed: {e}")
            return image_path # Fallback to original

    def _log_unrenderable_chars(self, text: str) -> list:
        """
        Identifies characters outside of English (ASCII) and Hindi (Devanagari) ranges.
        Devanagari range: \u0900-\u097F
        """
        # Define allowed ranges: ASCII (0-127) and Devanagari (0900-097F)
        # Also include common punctuation and symbols if needed.
        unsupported = []
        for char in text:
            code = ord(char)
            # Check if outside ASCII and outside Devanagari
            if not (0 <= code <= 127 or 0x0900 <= code <= 0x097F):
                unsupported.append({"char": char, "code": hex(code)})
        
        if unsupported:
            unique_unsupported = {f"{u['char']} ({u['code']})" for u in unsupported}
            print(f"WARNING: Unrenderable or unexpected characters detected: {', '.join(unique_unsupported)}")
        
        return unsupported

    def extract_text(self, image_path: str):
        """
        Extracts text from an image with preprocessing and error handling.
        Args:
            image_path (str): Path to the image file.
        Returns:
            dict: { raw_text, confidence, word_count, language_detected, is_clear }
        """
        if not os.path.exists(image_path):
            return {
                "error": "File not found",
                "raw_text": "",
                "confidence": 0.0,
                "is_clear": False
            }

        processed_path = self._preprocess_image(image_path)
        
        try:
            # Perform OCR on processed image
            results = self.reader.readtext(processed_path)

            if not results:
                return {
                    "raw_text": "",
                    "confidence": 0.0,
                    "word_count": 0,
                    "language_detected": ", ".join(self.langs),
                    "is_clear": False
                }

            # Process results
            texts = [res[1] for res in results]
            confidences = [res[2] for res in results]

            raw_text = " ".join(texts).strip()
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            word_count = len(raw_text.split())
            is_clear = self.is_image_clear(avg_confidence)
            
            # Clean up temporary processed file if it's different from original
            if processed_path != image_path:
                try:
                    os.remove(processed_path)
                except Exception as e:
                    print(f"Failed to cleanup {processed_path}: {e}")

            # Log and check for unrenderable characters
            unsupported_chars = self._log_unrenderable_chars(raw_text)

            return {
                "raw_text": raw_text,
                "confidence": avg_confidence,
                "word_count": word_count,
                "language_detected": ", ".join(self.langs),
                "is_clear": is_clear,
                "unsupported_chars": unsupported_chars
            }
        except Exception as e:
            # Cleanup if failed
            print(f"[OCR Error] Processing failed for {image_path}: {str(e)}")
            if processed_path != image_path and os.path.exists(processed_path):
                try:
                    os.remove(processed_path)
                except Exception as cleanup_err:
                    print(f"[OCR Error] Cleanup failed: {str(cleanup_err)}")
            return {
                "error": f"OCR processing failed: {str(e)}",
                "raw_text": "",
                "confidence": 0.0,
                "is_clear": False
            }

if __name__ == "__main__":
    # Quick test if run as script
    service = OCRService()
    print("OCRService initialized.")
    # Example usage (placeholders)
    # result = service.extract_text("path/to/image.jpg")
    # print(result)
