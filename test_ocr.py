import easyocr

print("Initializing EasyOCR...")
try:
    reader = easyocr.Reader(['en', 'hi'], gpu=True)
    print("GPU mode active")
except Exception as e:
    print("Failed to init with GPU:", e)
    reader = easyocr.Reader(['en', 'hi'], gpu=False)
    print("Falling back to CPU mode")

print("\n--- Testing Uploaded English Image ---")
result_en_upload = reader.readtext('Englist_text.png')
for (bbox, text, confidence) in result_en_upload:
    print(f"Text: {text} | Confidence: {confidence:.2f}")

print("\n--- Testing Uploaded Hindi Image ---")
result_hi_upload = reader.readtext('Hindi_text.png')
for (bbox, text, confidence) in result_hi_upload:
    print(f"Text: {text} | Confidence: {confidence:.2f}")
