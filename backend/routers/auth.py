from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(request: LoginRequest):
    # Hardcoded admin credentials for presentation/demo
    if request.username == "admin" and request.password == "admin":
        return {
            "token": "demo-admin-jwt-token-12345",
            "user": {
                "id": 1,
                "username": "admin",
                "role": "admin"
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid username or password")
