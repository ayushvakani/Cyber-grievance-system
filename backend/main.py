from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import complaint, rag, dashboard, fraud_network, alerts, demo, auth
import uvicorn

app = FastAPI(title="Cyber Grievance System")

import os

# Configure CORS
origins = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(complaint.router)
app.include_router(rag.router)
app.include_router(dashboard.router)
app.include_router(fraud_network.router)
app.include_router(alerts.router)
app.include_router(demo.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
