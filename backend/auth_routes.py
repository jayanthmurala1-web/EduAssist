from fastapi import APIRouter, HTTPException, status, Response, Request, Header, Cookie
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Annotated
from datetime import datetime, timedelta, timezone
import uuid
import logging

from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    get_current_teacher_id
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class TeacherSignup(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)

class TeacherLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    name: str
    email: str

class TeacherResponse(BaseModel):
    user_id: str
    name: str
    email: str
    picture: Optional[str] = None
    created_at: datetime

# ==================== ROUTES ====================

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(teacher_data: TeacherSignup, request: Request):
    """Register a new teacher with email and password"""
    from server import db
    
    try:
        # Check if teacher already exists
        existing = await db.teachers.find_one(
            {"email": teacher_data.email},
            {"_id": 0}
        )
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new teacher
        user_id = f"teacher_{uuid.uuid4().hex[:12]}"
        hashed_pwd = hash_password(teacher_data.password)
        
        teacher = {
            "user_id": user_id,
            "name": teacher_data.name,
            "email": teacher_data.email,
            "hashed_password": hashed_pwd,
            "picture": None,
            "auth_method": "jwt",
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.teachers.insert_one(teacher)
        
        # Create JWT token
        access_token = create_access_token(
            data={"user_id": user_id, "email": teacher_data.email}
        )
        
        logger.info(f"New teacher registered: {teacher_data.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user_id,
            "name": teacher_data.name,
            "email": teacher_data.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: TeacherLogin):
    """Login with email and password"""
    from server import db
    
    try:
        # Find teacher
        teacher = await db.teachers.find_one(
            {"email": credentials.email},
            {"_id": 0}
        )
        
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not teacher.get("hashed_password"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No password set for this account. Please sign up again."
            )
        
        if not verify_password(credentials.password, teacher["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create JWT token
        access_token = create_access_token(
            data={"user_id": teacher["user_id"], "email": teacher["email"]}
        )
        
        logger.info(f"Teacher logged in: {credentials.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": teacher["user_id"],
            "name": teacher["name"],
            "email": teacher["email"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.get("/me", response_model=TeacherResponse)
async def get_current_teacher(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get current authenticated teacher"""
    from server import db
    
    try:
        user_id = await get_current_teacher_id(request, authorization, session_token)
        
        teacher = await db.teachers.find_one(
            {"user_id": user_id},
            {"_id": 0, "hashed_password": 0}
        )
        
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        return teacher
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current teacher error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get teacher data"
        )

@router.post("/logout")
async def logout(
    response: Response,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Logout teacher"""
    from server import db
    
    try:
        user_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Delete all sessions for this teacher
        await db.teacher_sessions.delete_many({"user_id": user_id})
        
        # Clear cookie
        response.delete_cookie(key="session_token", path="/")
        
        logger.info(f"Teacher logged out: {user_id}")
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        # Still return success even if logout fails
        response.delete_cookie(key="session_token", path="/")
        return {"message": "Logged out"}
