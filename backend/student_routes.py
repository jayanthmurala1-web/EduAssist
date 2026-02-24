from fastapi import APIRouter, HTTPException, status, Request, Header, Cookie, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import csv
import io
import logging

from auth_utils import get_current_teacher_id

router = APIRouter(prefix="/api/students", tags=["students"])
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class StudentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    roll_number: str = Field(min_length=1, max_length=50)
    class_id: str
    section_id: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class StudentResponse(BaseModel):
    id: str
    name: str
    roll_number: str
    class_id: str
    section_id: str
    class_name: Optional[str] = None
    section_name: Optional[str] = None
    teacher_id: str
    contact_email: Optional[str]
    contact_phone: Optional[str]
    evaluation_count: int = 0
    average_score: float = 0.0
    created_at: datetime

# ==================== ROUTES ====================

@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_data: StudentCreate,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a new student"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Verify class and section ownership
        cls = await db.classes.find_one({"id": student_data.class_id, "teacher_id": teacher_id})
        if not cls:
            raise HTTPException(status_code=404, detail="Class not found")
        
        section = await db.sections.find_one({"id": student_data.section_id, "class_id": student_data.class_id})
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        
        # Check duplicate roll number
        existing = await db.students.find_one({
            "roll_number": student_data.roll_number,
            "class_id": student_data.class_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="Roll number already exists in this class")
        
        student_id = f"student_{uuid.uuid4().hex[:12]}"
        
        student = {
            "id": student_id,
            "name": student_data.name,
            "roll_number": student_data.roll_number,
            "class_id": student_data.class_id,
            "section_id": student_data.section_id,
            "teacher_id": teacher_id,
            "contact_email": student_data.contact_email,
            "contact_phone": student_data.contact_phone,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.students.insert_one(student)
        
        return {
            **student,
            "class_name": cls["name"],
            "section_name": section["name"],
            "evaluation_count": 0,
            "average_score": 0.0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create student error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create student")

@router.get("/", response_model=List[StudentResponse])
async def get_students(
    class_id: Optional[str] = None,
    section_id: Optional[str] = None,
    request: Request = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all students with optional filtering"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        query = {"teacher_id": teacher_id}
        if class_id:
            query["class_id"] = class_id
        if section_id:
            query["section_id"] = section_id
        
        students = await db.students.find(query, {"_id": 0}).sort("roll_number", 1).to_list(5000)
        
        # Enrich with class/section names and stats
        for student in students:
            cls = await db.classes.find_one({"id": student["class_id"]}, {"_id": 0, "name": 1})
            section = await db.sections.find_one({"id": student["section_id"]}, {"_id": 0, "name": 1})
            
            student["class_name"] = cls["name"] if cls else "Unknown"
            student["section_name"] = section["name"] if section else "Unknown"
            
            # Get evaluation stats
            evals = await db.evaluations.find({"student_id": student["id"]}, {"_id": 0, "score": 1}).to_list(1000)
            student["evaluation_count"] = len(evals)
            student["average_score"] = sum(e["score"] for e in evals) / len(evals) if evals else 0.0
        
        return students
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get students error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get students")

@router.post("/bulk")
async def bulk_import_students(
    file: UploadFile = File(...),
    class_id: str = None,
    section_id: str = None,
    request: Request = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Bulk import students from CSV"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Verify class ownership
        cls = await db.classes.find_one({"id": class_id, "teacher_id": teacher_id})
        if not cls:
            raise HTTPException(status_code=404, detail="Class not found")
        
        section = await db.sections.find_one({"id": section_id, "class_id": class_id})
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        
        # Read CSV
        contents = await file.read()
        csv_data = contents.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_data))
        
        students_added = 0
        errors = []
        
        for row in reader:
            try:
                if not row.get('name') or not row.get('roll_number'):
                    continue
                
                # Check duplicate
                existing = await db.students.find_one({
                    "roll_number": row['roll_number'],
                    "class_id": class_id
                })
                if existing:
                    errors.append(f"Roll {row['roll_number']} already exists")
                    continue
                
                student = {
                    "id": f"student_{uuid.uuid4().hex[:12]}",
                    "name": row['name'],
                    "roll_number": row['roll_number'],
                    "class_id": class_id,
                    "section_id": section_id,
                    "teacher_id": teacher_id,
                    "contact_email": row.get('email'),
                    "contact_phone": row.get('phone'),
                    "created_at": datetime.now(timezone.utc)
                }
                
                await db.students.insert_one(student)
                students_added += 1
                
            except Exception as e:
                errors.append(f"Row error: {str(e)}")
        
        return {
            "success": True,
            "students_added": students_added,
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk import error: {e}")
        raise HTTPException(status_code=500, detail="Bulk import failed")

@router.delete("/{student_id}")
async def delete_student(
    student_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete a student"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Verify ownership
        student = await db.students.find_one({"id": student_id, "teacher_id": teacher_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        await db.students.delete_one({"id": student_id})
        
        return {"success": True, "message": "Student deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete student error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete student")
