from fastapi import APIRouter, HTTPException, status, Request, Header, Cookie
from pydantic import BaseModel, Field
from typing import Optional, List, Annotated
from datetime import datetime, timezone
import uuid
import logging

from auth_utils import get_current_teacher_id

router = APIRouter(prefix="/api/classes", tags=["classes"])
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    academic_year: str = Field(min_length=4, max_length=20)
    description: Optional[str] = None

class ClassResponse(BaseModel):
    id: str
    name: str
    academic_year: str
    description: Optional[str]
    teacher_id: str
    student_count: int = 0
    section_count: int = 0
    created_at: datetime

class SectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    class_id: str

class SectionResponse(BaseModel):
    id: str
    name: str
    class_id: str
    teacher_id: str
    student_count: int = 0
    created_at: datetime

# ==================== CLASS ROUTES ====================

@router.post("/", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    class_data: ClassCreate,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a new class"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Check if class name already exists for this teacher
        existing = await db.classes.find_one({
            "teacher_id": teacher_id,
            "name": class_data.name,
            "academic_year": class_data.academic_year
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Class with this name already exists for this academic year"
            )
        
        class_id = f"class_{uuid.uuid4().hex[:12]}"
        
        new_class = {
            "id": class_id,
            "name": class_data.name,
            "academic_year": class_data.academic_year,
            "description": class_data.description,
            "teacher_id": teacher_id,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.classes.insert_one(new_class)
        
        logger.info(f"Class created: {class_data.name} by {teacher_id}")
        
        return {
            **new_class,
            "student_count": 0,
            "section_count": 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create class error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create class"
        )

@router.get("/", response_model=List[ClassResponse])
async def get_classes(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all classes for the current teacher"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        classes = await db.classes.find(
            {"teacher_id": teacher_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
        
        # Get counts for each class
        for cls in classes:
            # Count sections
            section_count = await db.sections.count_documents({"class_id": cls["id"]})
            cls["section_count"] = section_count
            
            # Count students
            student_count = await db.students.count_documents({"class_id": cls["id"]})
            cls["student_count"] = student_count
        
        return classes
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get classes error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get classes"
        )

@router.get("/{class_id}", response_model=ClassResponse)
async def get_class(
    class_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get a specific class"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        cls = await db.classes.find_one(
            {"id": class_id, "teacher_id": teacher_id},
            {"_id": 0}
        )
        
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        # Get counts
        section_count = await db.sections.count_documents({"class_id": class_id})
        student_count = await db.students.count_documents({"class_id": class_id})
        
        cls["section_count"] = section_count
        cls["student_count"] = student_count
        
        return cls
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get class error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get class"
        )

@router.put("/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: str,
    class_data: ClassCreate,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update a class"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Verify ownership
        cls = await db.classes.find_one({"id": class_id, "teacher_id": teacher_id})
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        # Update
        result = await db.classes.update_one(
            {"id": class_id},
            {"$set": {
                "name": class_data.name,
                "academic_year": class_data.academic_year,
                "description": class_data.description
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No changes made"
            )
        
        # Get updated class
        updated = await db.classes.find_one({"id": class_id}, {"_id": 0})
        section_count = await db.sections.count_documents({"class_id": class_id})
        student_count = await db.students.count_documents({"class_id": class_id})
        
        updated["section_count"] = section_count
        updated["student_count"] = student_count
        
        logger.info(f"Class updated: {class_id}")
        
        return updated
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update class error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update class"
        )

@router.delete("/{class_id}")
async def delete_class(
    class_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete a class and all its sections and students"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Verify ownership
        cls = await db.classes.find_one({"id": class_id, "teacher_id": teacher_id})
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        # Delete related data
        students_deleted = await db.students.delete_many({"class_id": class_id})
        sections_deleted = await db.sections.delete_many({"class_id": class_id})
        await db.classes.delete_one({"id": class_id})
        
        logger.info(f"Class deleted: {class_id}, {sections_deleted.deleted_count} sections, {students_deleted.deleted_count} students")
        
        return {
            "success": True,
            "message": f"Class deleted along with {sections_deleted.deleted_count} sections and {students_deleted.deleted_count} students"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete class error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete class"
        )

# ==================== SECTION ROUTES ====================

@router.post("/sections", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
async def create_section(
    section_data: SectionCreate,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a new section for a class"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Verify class ownership
        cls = await db.classes.find_one({
            "id": section_data.class_id,
            "teacher_id": teacher_id
        })
        
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        # Check if section name already exists in this class
        existing = await db.sections.find_one({
            "class_id": section_data.class_id,
            "name": section_data.name
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Section with this name already exists in this class"
            )
        
        section_id = f"section_{uuid.uuid4().hex[:12]}"
        
        new_section = {
            "id": section_id,
            "name": section_data.name,
            "class_id": section_data.class_id,
            "teacher_id": teacher_id,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.sections.insert_one(new_section)
        
        logger.info(f"Section created: {section_data.name} in class {section_data.class_id}")
        
        return {
            **new_section,
            "student_count": 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create section error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create section"
        )

@router.get("/{class_id}/sections", response_model=List[SectionResponse])
async def get_sections(
    class_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all sections for a class"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Verify class ownership
        cls = await db.classes.find_one({"id": class_id, "teacher_id": teacher_id})
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        sections = await db.sections.find(
            {"class_id": class_id},
            {"_id": 0}
        ).sort("name", 1).to_list(1000)
        
        # Get student count for each section
        for section in sections:
            student_count = await db.students.count_documents({"section_id": section["id"]})
            section["student_count"] = student_count
        
        return sections
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get sections error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sections"
        )

@router.delete("/sections/{section_id}")
async def delete_section(
    section_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete a section and all its students"""
    from server import db
    
    try:
        teacher_id = await get_current_teacher_id(request, authorization, session_token)
        
        # Verify ownership
        section = await db.sections.find_one({"id": section_id, "teacher_id": teacher_id})
        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section not found"
            )
        
        # Delete related students
        students_deleted = await db.students.delete_many({"section_id": section_id})
        await db.sections.delete_one({"id": section_id})
        
        logger.info(f"Section deleted: {section_id}, {students_deleted.deleted_count} students")
        
        return {
            "success": True,
            "message": f"Section deleted along with {students_deleted.deleted_count} students"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete section error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete section"
        )
