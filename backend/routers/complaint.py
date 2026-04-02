from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import shutil
import os

from backend.db.postgres import get_db
from backend.models.complaint import Complaint
from backend.services.ocr_service import OCRService

router = APIRouter()

@router.post("/api/complaint/submit")
async def submit_complaint(
    citizen_name: str = Form(...),
    phone: str = Form(...),
    location: str = Form(...),
    date_of_incident: str = Form(...),
    complaint_text: Optional[str] = Form(None),
    complaint_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Day 20: Image + Text Merging & DB Persistence.
    1. Generates a unique complaint_id.
    2. Runs OCR if an image is provided.
    3. Merges all text and saves the record to PostgreSQL.
    """
    try:
        # 1. Generate unique complaint ID
        comp_uuid = str(uuid.uuid4())
        
        merged_raw_text = complaint_text or ""
        final_image_path = None

        # 2. Handle Image Upload & OCR
        if complaint_image:
            # Create uploads directory if it doesn't exist
            os.makedirs("uploads", exist_ok=True)
            
            # Save the file (using the companion UUID to ensure uniqueness)
            file_extension = os.path.splitext(complaint_image.filename)[1]
            final_image_path = f"uploads/{comp_uuid}{file_extension}"
            
            with open(final_image_path, "wb") as buffer:
                shutil.copyfileobj(complaint_image.file, buffer)

            # Perform OCR
            ocr_service = OCRService()
            ocr_result = ocr_service.extract_text(final_image_path)
            
            if ocr_result.get("raw_text"):
                # Merge OCR text with typed text
                if merged_raw_text:
                    merged_raw_text += "\n-- OCR EXTRACTED TEXT --\n"
                merged_raw_text += ocr_result["raw_text"]

        # 3. Create Database Record
        new_complaint = Complaint(
            complaint_id=comp_uuid,
            citizen_name=citizen_name,
            phone=phone,
            location=location,
            date_of_incident=date_of_incident,
            complaint_text=complaint_text,
            image_path=final_image_path,
            raw_text=merged_raw_text, # Merged final text
            status="pending"
        )

        db.add(new_complaint)
        db.commit()
        db.refresh(new_complaint)

        return {
            "status": "success",
            "complaint_id": comp_uuid,
            "message": "Complaint submitted and processed successfully",
            "ocr_processed": complaint_image is not None
        }

    except Exception as e:
        db.rollback()
        print(f"Error in submit_complaint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
