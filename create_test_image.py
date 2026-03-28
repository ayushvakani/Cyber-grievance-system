from PIL import Image, ImageDraw, ImageFont
import os

# Create English test image
img_en = Image.new('RGB', (400, 100), color='white')
draw_en = ImageDraw.Draw(img_en)
draw_en.text((10, 30), "UPI fraud by 9876543210 at fake-bank.com", fill='black')
img_en.save('test_en.png')

# Create Hindi test image
# Need a font that supports Hindi if we want to draw it, but EasyOCR just needs the image.
# If PIL default font doesn't support Hindi, it might render as boxes.
# Let's try drawing it anyway, but we can also just use an existing Hindi image if possible, or assume it works for the test.
try:
    # Try to find a standard Windows Hindi font
    font = ImageFont.truetype("mangal.ttf", 20)
except IOError:
    # Fallback to default
    font = ImageFont.load_default()

img_hi = Image.new('RGB', (400, 100), color='white')
draw_hi = ImageDraw.Draw(img_hi)
draw_hi.text((10, 30), "नमस्ते, यह एक परीक्षण है (Hello, this is a test)", fill='black', font=font)
img_hi.save('test_hi.png')

print("Created test_en.png and test_hi.png")
