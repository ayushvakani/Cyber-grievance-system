from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import aiofiles
import asyncio
import os

from backend.db.postgres import get_db
from backend.models.complaint import Complaint
from backend.services.ocr_service import OCRService
from backend.services.pipeline_service import ProcessingPipeline

# Initialize global pipeline instance
pipeline = ProcessingPipeline()

router = APIRouter()

@router.post("/api/complaint/submit")
async def submit_complaint(
    citizen_name: str = Form(...),
    phone: str = Form(...),
    location: str = Form(...),
    date_of_incident: str = Form(...),
    complaint_text: Optional[str] = Form(None),
    complaint_image: Optional[UploadFile] = File(None),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Day 21: Async File Handling.
    1. Uses aiofiles for non-blocking file writes.
    2. Runs synchronous OCR in a separate thread to keep the event loop free.
    """
    # Validate that either text or image is provided
    if not complaint_text and not complaint_image:
        print("[Ingestion Error] Neither text nor image provided.")
        raise HTTPException(status_code=400, detail="Either complaint text or image must be provided.")

    try:
        # 1. Generate unique complaint ID
        comp_uuid = str(uuid.uuid4())
        
        merged_raw_text = complaint_text or ""
        final_image_path = None

        # 2. Handle Image Upload & OCR
        if complaint_image:
            file_extension = os.path.splitext(complaint_image.filename)[1].lower()
            allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
            
            if file_extension not in allowed_extensions:
                print(f"[Ingestion Error] Unsupported file extension: {file_extension}")
                raise HTTPException(status_code=400, detail=f"Invalid image format: {file_extension}. Supported formats: jpg, jpeg, png, webp")

            # Create uploads directory if it doesn't exist
            try:
                os.makedirs("uploads", exist_ok=True)
            except Exception as dir_err:
                print(f"[Ingestion Error] Failed to create uploads directory: {dir_err}")
                raise HTTPException(status_code=500, detail="Internal server error while setting up storage.")
            
            # Save the file asynchronously
            final_image_path = f"uploads/{comp_uuid}{file_extension}"
            
            try:
                async with aiofiles.open(final_image_path, mode="wb") as out_file:
                    content = await complaint_image.read()
                    await out_file.write(content)
            except Exception as file_err:
                print(f"[Ingestion Error] Failed to save uploaded file: {file_err}")
                raise HTTPException(status_code=500, detail="Failed to save the uploaded image.")

            # Perform OCR (Synchronous task run in a separate thread)
            try:
                ocr_service = OCRService()
                # asyncio.to_thread is available in Python 3.9+
                ocr_result = await asyncio.to_thread(ocr_service.extract_text, final_image_path)
                
                if "error" in ocr_result:
                    print(f"[OCR Warning] OCR extraction returned error for {final_image_path}: {ocr_result['error']}")
                    # If it's unreadable, maybe just proceed with empty OCR text, or throw 400. Let's log it.
                elif ocr_result.get("raw_text"):
                    # Merge OCR text with typed text
                    if merged_raw_text:
                        merged_raw_text += "\n-- OCR EXTRACTED TEXT --\n"
                    merged_raw_text += ocr_result["raw_text"]
            except Exception as ocr_err:
                print(f"[Ingestion Error] OCR Service threw an exception: {ocr_err}")
                raise HTTPException(status_code=500, detail="Error during OCR processing.")

        # 3. Create Database Record (SQLAlchemy 1.x/2.0 sync style)
        try:
            new_complaint = Complaint(
                complaint_id=comp_uuid,
                citizen_name=citizen_name,
                phone=phone,
                location=location,
                date_of_incident=date_of_incident,
                complaint_text=complaint_text,
                image_path=final_image_path,
                raw_text=merged_raw_text,
                status="pending"
            )

            db.add(new_complaint)
            db.commit()
            db.refresh(new_complaint)

            # Day 36: Trigger AI Processing in the background
            if background_tasks:
                background_tasks.add_task(pipeline.process, new_complaint.id)

        except Exception as db_err:
            db.rollback()
            print(f"[Ingestion Error] Database commit failed: {db_err}")
            raise HTTPException(status_code=500, detail="Failed to save complaint to database.")

        return {
            "status": "success",
            "complaint_id": comp_uuid,
            "message": "Complaint submitted and processed asynchronously",
            "ocr_processed": complaint_image is not None
        }

    except HTTPException:
        # Re-raise HTTP exceptions to be handled by FastAPI
        raise
    except Exception as e:
        # Catch any other unexpected errors
        print(f"[Ingestion Error] Unexpected error in submit_complaint: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected internal server error occurred.")
