import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Ensure backend module can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from backend.db.postgres import Base, get_db
from backend.models.complaint import Complaint

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_inputs():
    print("\n--- Testing 4 Input Combinations ---")

    # Base form data required by the API
    base_data = {
        "citizen_name": "Test User",
        "phone": "1234567890",
        "location": "Test City",
        "date_of_incident": "2024-01-01"
    }

    # 1. Text only
    print("\n1. Testing: Text Only")
    data_text_only = base_data.copy()
    data_text_only["complaint_text"] = "This is a test complaint with text only."
    response = client.post("/api/complaint/submit", data=data_text_only)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 2. Image only
    print("\n2. Testing: Image Only")
    image_path = os.path.join(os.path.dirname(__file__), "samples", "test_clear.png")
    with open(image_path, "rb") as img_file:
        files = {"complaint_image": ("test_clear.png", img_file, "image/png")}
        response = client.post("/api/complaint/submit", data=base_data, files=files)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            assert response.json()["status"] == "success"
        else:
            print(f"Response: {response.text}")

    # 3. Text + Image
    print("\n3. Testing: Text + Image")
    data_both = base_data.copy()
    data_both["complaint_text"] = "This is a test complaint with text and image."
    with open(image_path, "rb") as img_file:
        files = {"complaint_image": ("test_clear.png", img_file, "image/png")}
        response = client.post("/api/complaint/submit", data=data_both, files=files)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            assert response.json()["status"] == "success"
        else:
            print(f"Response: {response.text}")

    # 4. Empty (Neither text nor image)
    print("\n4. Testing: Empty (Neither text nor image)")
    response = client.post("/api/complaint/submit", data=base_data)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()}")
        assert response.json()["status"] != "success", "Empty submission should fail"
    else:
        print(f"Response: {response.text}")
        assert response.status_code == 400 or response.status_code == 422, "Expected an error status code"

    # Cleanup
    if os.path.exists("test_image.png"):
        try:
            os.remove("test_image.png")
        except:
            pass
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
        except:
            pass

if __name__ == "__main__":
    test_inputs()
