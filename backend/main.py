from fastapi import FastAPI

app = FastAPI(title="Cyber Grievance System")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
