from PIL import Image, ImageDraw, ImageFont
import os

def create_sample(path, text):
    img = Image.new('RGB', (600, 150), color='white')
    draw = ImageDraw.Draw(img)
    # Using default font for simplicity
    draw.text((10, 50), text, fill='black')
    img.save(path)
    print(f"Created {path}")

samples_dir = "tests/samples"
os.makedirs(samples_dir, exist_ok=True)

create_sample(os.path.join(samples_dir, "test_sms.png"), "[SMS] Your account is locked. Click: http://fraud-link.com")
create_sample(os.path.join(samples_dir, "test_whatsapp.png"), "[WhatsApp] Hey, I need 5000 urgently. Send to UPI: scammer@upi")
create_sample(os.path.join(samples_dir, "test_bank.png"), "[Bank] Txn ID: 123456. Amt: 1000.00 to XXXXXX7890")
create_sample(os.path.join(samples_dir, "test_clear.png"), "This is a clear printed document for OCR testing.")

# Create an unreadable/corrupt file (actually just a text file renamed to .png)
with open(os.path.join(samples_dir, "test_unreadable.png"), "w") as f:
    f.write("This is not an image file.")
print("Created tests/samples/test_unreadable.png")
