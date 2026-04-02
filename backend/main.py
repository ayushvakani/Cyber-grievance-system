from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import complaint
import uvicorn

app = FastAPI(title="Cyber Grievance System")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development; restrict this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(complaint.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
