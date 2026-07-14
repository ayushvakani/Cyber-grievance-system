from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
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
from backend.services.cache_service import crag_cache

# Initialize global pipeline instance
pipeline = ProcessingPipeline()

router = APIRouter()

@router.get("/api/complaint/{complaint_id}/detail")
def get_complaint_detail(complaint_id: str, db: Session = Depends(get_db)):
    """Day 84: Returns full complaint fields for the detail page."""
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Parse entities JSON if stored as string
    import json
    entities = {}
    if c.recommended_sections:
        try:
            entities = json.loads(c.recommended_sections)
        except Exception:
            entities = {}

    return {
        "complaint_id": c.complaint_id,
        "citizen_name": c.citizen_name,
        "phone": c.phone,
        "location": c.location,
        "date_of_incident": c.date_of_incident,
        "complaint_text": c.complaint_text,
        "raw_text": c.raw_text,
        "crime_type": c.crime_type,
        "severity": c.severity,
        "severity_reason": c.severity_reason,
        "confidence": c.confidence,
        "summary": c.summary,
        "recommended_sections": c.recommended_sections,
        "reply_text": c.reply_text,
        "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }

@router.get("/api/complaint/{complaint_id}/public-status")
def get_complaint_public_status(complaint_id: str, db: Session = Depends(get_db)):
    """Returns limited complaint data for the citizen public portal."""
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    return {
        "complaint_id": c.complaint_id,
        "citizen_name": c.citizen_name,
        "date_of_incident": c.date_of_incident,
        "complaint_text": c.complaint_text or c.raw_text,
        "reply_text": c.reply_text,
        "status": c.status,
    }


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
        if complaint_image and complaint_image.filename:
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

            # OCR extraction is now deferred to the background ProcessingPipeline
            # to ensure the API responds instantly without blocking on CPU.

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

            # Day 90: Invalidate any stale cache for this complaint (in case of resubmission)
            crag_cache.invalidate(comp_uuid)

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

class ReplySendRequest(BaseModel):
    reply_text: str

@router.get("/api/complaint/{complaint_id}/reply/draft")
def get_reply_draft(complaint_id: str, db: Session = Depends(get_db)):
    """Generates and returns a reply draft for the given complaint."""
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    cached_draft = crag_cache.get(f"reply_draft_{complaint_id}")
    if cached_draft:
        return {"draft": cached_draft}
        
    from backend.services.llm_service import MistralService
    llm = MistralService()
    
    draft = llm.generate_reply_draft(c.complaint_text or c.raw_text or "", c.citizen_name)
    crag_cache.set(f"reply_draft_{complaint_id}", draft)
    return {"draft": draft}

@router.get("/api/complaint/{complaint_id}/decision/draft")
def get_decision_draft(complaint_id: str, db: Session = Depends(get_db)):
    """Generates and returns an officer decision draft for the given complaint."""
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    cached_draft = crag_cache.get(f"decision_draft_{complaint_id}")
    if cached_draft:
        return {"draft": cached_draft}
        
    llm = get_llm_service()
    draft = llm.generate_decision_draft(
        c.complaint_text or c.raw_text or "", 
        c.crime_type or "Unknown", 
        c.severity or "Medium"
    )
    crag_cache.set(f"decision_draft_{complaint_id}", draft)
    return {"draft": draft}

@router.post("/api/complaint/{complaint_id}/reply/send")
def send_reply(complaint_id: str, req: ReplySendRequest, db: Session = Depends(get_db)):
    """Saves the edited reply and marks the complaint as responded."""
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    c.reply_text = req.reply_text
    c.status = "resolved"
    db.commit()
    
    return {"status": "success", "message": "Reply sent successfully"}
