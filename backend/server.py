from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Request, Header, Cookie
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import base64
import asyncio
from groq import AsyncGroq
import PyPDF2
import fitz # PyMuPDF
import io
from contextlib import asynccontextmanager

# Import new route modules
import auth_routes
import class_routes
import student_routes
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')



# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'eduassist_db')]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    try:
        await client.admin.command('ping')
        logger.info("Successfully connected to MongoDB.")
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        
    yield
    
    # Shutdown logic
    logger.info("Closing MongoDB connection...")
    client.close()

# Create the main app with lifespan
app = FastAPI(
    title="EduAssist API",
    lifespan=lifespan
)

# Groq API Key (free tier: 14,400 requests/day)
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class SyllabusCreate(BaseModel):
    title: str
    content: str
    subject: str
    topic: Optional[str] = None

class SyllabusUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    content: Optional[str] = None
    questions_text: Optional[str] = None

class Syllabus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    subject: str
    topic: Optional[str] = None
    chunks: List[Dict[str, Any]] = []
    embeddings: List[List[float]] = []
    question_paper: Optional[str] = None  # Base64 encoded image
    questions_text: Optional[str] = None  # Extracted/uploaded questions
    original_file_b64: Optional[str] = None # Base64 of the original syllabus file (if PDF/Image)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnswerScript(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: Optional[str] = None  # Link to student
    class_id: Optional[str] = None   # Link to class
    section_id: Optional[str] = None # Link to section
    student_name: str
    subject: str
    topic: Optional[str] = None
    image_data: Optional[str] = None # First page for thumbnail
    all_pages: List[str] = [] # All pages for full review
    ocr_text: str
    exam_date: Optional[str] = None # Date of the exam
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Evaluation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    answer_script_id: str
    student_id: Optional[str] = None  # Link to student
    student_name: str
    subject: str
    topic: Optional[str] = None
    question: Optional[str] = None  # The specific question being evaluated
    class_id: Optional[str] = None  # Link to class
    class_name: Optional[str] = None # Name of class
    section_id: Optional[str] = None  # Link to section
    section_name: Optional[str] = None # Name of section
    answer_text: Optional[str] = None # The student's actual answer text for context
    score: float
    max_score: float = 100.0
    explanation: str
    missing_keywords: List[str] = []
    matched_concepts: List[str] = []
    similarity_score: float = 0.0  # RAG cosine similarity score
    retrieved_chunks: int = 0  # Number of chunks used for evaluation
    student_script_image: Optional[str] = None # Full base64 of the student's answer script
    feedback: Optional[str] = None
    feedback_score: Optional[float] = None
    is_correct: Optional[bool] = None
    exam_date: Optional[str] = None # Date of the exam
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FeedbackSubmit(BaseModel):
    evaluation_id: str
    teacher_score: float  # Teacher's evaluated score
    feedback: str  # Detailed paragraph feedback
    concept_feedback: Optional[List[str]] = []  # Specific concepts feedback
    is_correct: bool  # Overall evaluation correctness

class AnswerSubmit(BaseModel):
    student_name: str
    subject: str
    topic: Optional[str] = None

class Analytics(BaseModel):
    total_evaluations: int
    average_score: float
    total_students: int
    feedback_count: int
    model_accuracy: float
    avg_similarity: float = 0.0
    avg_chunks: float = 0.0
    subject_wise_stats: Dict[str, Any]
    recent_trends: List[Dict[str, Any]]

# ==================== HELPER FUNCTIONS ====================

async def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[Dict[str, Any]]:
    """Split text into overlapping chunks"""
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk_words = words[i:i + chunk_size]
        chunk_text = ' '.join(chunk_words)
        chunks.append({
            'text': chunk_text,
            'start_idx': i,
            'end_idx': min(i + chunk_size, len(words))
        })
    
    return chunks

async def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF with OCR fallback for scanned pages"""
    try:
        # Use fitz (PyMuPDF) as it handles various PDF types better
        doc = fitz.open(stream=file_content, filetype="pdf")
        full_text = ""
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            
            # If text is very short, it's likely a scanned image page
            if len(text.strip()) < 50:
                logger.info(f"Page {page_num + 1} looks scanned, running OCR...")
                # Convert page to image
                pix = page.get_pixmap(matrix=fitz.Matrix(3, 3)) # Higher scale (3x) for much better OCR
                img_bytes = pix.tobytes("png")
                img_b64 = base64.b64encode(img_bytes).decode('utf-8')
                
                # Use our existing OCR function
                ocr_text = await ocr_image(img_b64, skip_cleanup=True)
                text = ocr_text + "\n"
            
            full_text += text + "\n"
            
        doc.close()
        return full_text.strip()
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        # Fallback to PyPDF2 if fitz fails
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except:
            raise HTTPException(status_code=400, detail="Failed to parse PDF file")

async def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text from TXT file"""
    try:
        return file_content.decode('utf-8')
    except Exception as e:
        logger.error(f"Error reading TXT file: {e}")
        raise HTTPException(status_code=400, detail="Failed to read TXT file")

async def get_embeddings(text: str) -> List[float]:
    """Generate simple text embeddings using local hashing (no external API needed)"""
    import hashlib
    import math
    try:
        # Use a deterministic hash-based embedding (256-dim)
        # This is lightweight and free — no API calls
        words = text.lower().split()
        embedding = [0.0] * 256
        for i, word in enumerate(words):
            h = int(hashlib.md5(word.encode()).hexdigest(), 16)
            for j in range(256):
                embedding[j] += ((h >> j) & 1) * 2 - 1
        # Normalize
        magnitude = math.sqrt(sum(x * x for x in embedding)) or 1.0
        embedding = [x / magnitude for x in embedding]
        return embedding
    except Exception as e:
        logger.error(f"Error getting embeddings: {e}")
        return [0.0] * 256

async def perform_llm_cleanup(raw_text: str) -> str:
    """Helper to perform coherent Groq cleanup on text blocks"""
    try:
        client = AsyncGroq(api_key=GROQ_API_KEY)
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional OCR correction bot. You receive raw OCR output from a handwritten student answer script that might span multiple pages. Clean it up by fixing obvious transcription errors, correcting spelling, and making it readable while preserving the exact semantic meaning. If you see PAGE markers, use them to maintain context but remove them from the final output. Return ONLY the final cleaned text."
                },
                {
                    "role": "user",
                    "content": f"Clean up this multi-page handwritten transcription:\n\n{raw_text}"
                }
            ],
            max_tokens=8192,
            temperature=0.1
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"Coherent cleanup failed: {e}")
        return raw_text

async def ocr_image(image_base64: str, skip_cleanup: bool = False) -> str:
    """Extract text from image using Tesseract OCR (local, free) + Optional Groq cleanup"""
    try:
        import pytesseract
        from PIL import Image, ImageFilter, ImageEnhance
        
        # 1. Decode base64 to image
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))
        
        # 2. Preprocess image for better OCR
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        # Sharpen
        image = image.filter(ImageFilter.SHARPEN)
        
        # 3. Run Tesseract OCR (completely local, no API)
        raw_text = await asyncio.to_thread(
            pytesseract.image_to_string,
            image,
            config='--oem 3 --psm 6'
        )
        
        if not raw_text or len(raw_text.strip()) < 5:
            # Try with different page segmentation mode
            raw_text = await asyncio.to_thread(
                pytesseract.image_to_string,
                image,
                config='--oem 3 --psm 3'
            )
        
        raw_text = raw_text.strip()
        
        if not raw_text:
            raise HTTPException(status_code=400, detail="Could not extract any text from the image. Please upload a clearer image.")
        
        if skip_cleanup:
            return raw_text

        # 4. Use Groq to clean up and improve the OCR text
        try:
            client = AsyncGroq(api_key=GROQ_API_KEY)
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an OCR correction assistant. You receive raw OCR output from handwritten text. Clean it up by fixing obvious OCR errors, correcting spelling, and making the text readable. Keep the original meaning intact. Return ONLY the corrected text, nothing else."
                    },
                    {
                        "role": "user",
                        "content": f"Clean up this OCR-extracted text from a student's handwritten answer:\n\n{raw_text}"
                    }
                ],
                max_tokens=4096,
                temperature=0.1
            )
            cleaned_text = response.choices[0].message.content.strip()
            return cleaned_text
        except Exception as cleanup_err:
            logger.warning(f"Groq cleanup failed, returning raw OCR: {cleanup_err}")
            return raw_text
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in OCR: {e}")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

async def evaluate_answer(answer_text: str, syllabus_content: str, questions_text: Optional[str], subject: str, topic: Optional[str] = None) -> List[Dict[str, Any]]:
    """Evaluate answer using Groq (Llama 3.3 70B) with multi-question detection and adaptive learning"""
    try:
        client = AsyncGroq(api_key=GROQ_API_KEY)
        
        # === ADAPTIVE LEARNING: Fetch Teacher Feedback ===
        feedback_examples = ""
        try:
            # First try: Query for recent teacher feedback in this subject + topic
            feedback_query = {"subject": subject}
            if topic:
                feedback_query["topic"] = topic
            
            past_logs = await db.feedback_logs.find(feedback_query).sort("timestamp", -1).limit(8).to_list(8)
            
            # Fallback: If no topic-specific feedback, get subject-wide feedback
            if not past_logs and topic:
                logger.info(f"No topic feedback for '{topic}', falling back to subject '{subject}'")
                past_logs = await db.feedback_logs.find({"subject": subject}).sort("timestamp", -1).limit(8).to_list(8)
            
            if past_logs:
                logger.info(f"Retrieved {len(past_logs)} feedback logs for subject '{subject}' and topic '{topic}'")
                feedback_examples = "\nCRITICAL: FOLLOW THESE PREVIOUS TEACHER CORRECTIONS\n"
                feedback_examples += "You have been inconsistent in the past. Below are examples of how the TEACHER wants you to grade. ADAPT YOUR SCORING IMMEDIATELY to match the 'Teacher Corrected Score' logic:\n"
                for log in past_logs:
                    if log.get('answer_text') and log.get('feedback'):
                        # Keep it concise but include the question
                        ans = log.get('answer_text', '')
                        if len(ans) > 200: ans = ans[:200] + "..."
                        
                        feedback_examples += f"\n[PAST CORRECTION]\n"
                        feedback_examples += f"- FOR QUESTION: {log.get('question')}\n"
                        feedback_examples += f"- STUDENT ANSWER SNIPPET: {ans}\n"
                        feedback_examples += f"- YOUR WRONG SCORE: {log.get('ai_score')}\n"
                        feedback_examples += f"- TEACHER'S CORRECT SCORE: {log.get('teacher_score')}\n"
                        feedback_examples += f"- TEACHER'S RULE: {log.get('feedback')}\n"
                feedback_examples += "\nURGENT: If the current evaluation contains similar questions or answers, APPLY THE TEACHER'S RULE ABOVE. Do not repeat your previous scoring mistakes.\n"
            else:
                logger.info(f"No existing feedback logs found for subject '{subject}' - topic '{topic}'")
        except Exception as e:
            logger.warning(f"Failed to fetch feedback logs: {e}")

        system_message = f"""You are an ELITE Educational Evaluator. 
        
        {feedback_examples}

        TASK: 
        1. Identify each discrete question answered in the provided script.
        2. Provide a SEPARATE evaluation for each using the SYLLABUS as a reference.
        3. Match the TEACHER'S GRADING STYLE provided in the examples above.

        You MUST respond ONLY with a valid JSON LIST of objects:
        [
          {{
            "question": "Full text of the question",
            "score": <number 0-100>,
            "explanation": "<detailed pedagogical feedback>",
            "missing_keywords": ["kw1", "kw2"],
            "matched_concepts": ["concept1"]
          }}
        ]

        STRICT RULES:
        - If teacher examples show they are more lenient than you, increase your scores.
        - If teacher examples show they are stricter, decrease your scores.
        - Respond ONLY with JSON. No conversational filler."""
        
        topic_info = f" on the topic '{topic}'" if topic else ""
        questions_section = f"\n\nOFFICIAL QUESTIONS (use these to identify what the student is answering):\n{questions_text}\n" if questions_text else ""
        
        prompt = f"""Evaluate this student answer script for {subject}{topic_info}. 
        Identify each distinct question answered and evaluate them separately.
        
        {questions_section}
        
        REFERENCE MATERIAL/SYLLABUS (use for grading accuracy):
        {syllabus_content}
        
        STUDENT ANSWER SCRIPT:
        {answer_text}
        
        Respond ONLY with a JSON array of objects, each containing: question, score, explanation, missing_keywords, and matched_concepts."""
        
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.3
        )
        
        response_content = response.choices[0].message.content
        
        # Parse JSON response
        import json
        response_text = response_content.strip()
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        eval_results = json.loads(response_text)
        if not isinstance(eval_results, list):
            eval_results = [eval_results]
            
        return eval_results
    except Exception as e:
        logger.error(f"Error in evaluation: {e}")
        return [{
            "question": "General Evaluation",
            "score": 50.0,
            "explanation": f"Evaluation error: {str(e)}",
            "missing_keywords": [],
            "matched_concepts": []
        }]


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors"""
    import math
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(b * b for b in vec2))
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    return dot_product / (magnitude1 * magnitude2)


async def rag_retrieve(query_text: str, syllabus_doc: dict, top_k: int = 5) -> Dict[str, Any]:
    """RAG Retrieval: Find most relevant syllabus chunks for the student answer.
    
    This is the core RAG pipeline:
    1. Generate embedding for the student's answer
    2. Compare against all syllabus chunk embeddings
    3. Return top-K most similar chunks with scores
    """
    chunks = syllabus_doc.get('chunks', [])
    embeddings = syllabus_doc.get('embeddings', [])
    
    # Fallback: if no chunks/embeddings stored, return full content
    if not chunks or not embeddings or len(chunks) != len(embeddings):
        logger.warning("No chunk embeddings found, falling back to full syllabus content")
        return {
            'context': syllabus_doc.get('content', ''),
            'similarity_score': 0.0,
            'num_chunks_used': 0,
            'chunk_scores': []
        }
    
    # Step 1: Generate embedding for student answer
    query_embedding = await get_embeddings(query_text)
    
    # Step 2: Calculate cosine similarity with each chunk
    chunk_scores = []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        sim = cosine_similarity(query_embedding, emb)
        chunk_scores.append({
            'index': i,
            'text': chunk['text'],
            'similarity': sim
        })
    
    # Step 3: Sort by similarity (descending) and take top-K
    chunk_scores.sort(key=lambda x: x['similarity'], reverse=True)
    top_chunks = chunk_scores[:top_k]
    
    # Build context from top chunks
    context_parts = []
    for i, chunk in enumerate(top_chunks, 1):
        context_parts.append(f"[Relevant Section {i} (similarity: {chunk['similarity']:.3f})]\n{chunk['text']}")
    
    context = "\n\n".join(context_parts)
    avg_similarity = sum(c['similarity'] for c in top_chunks) / len(top_chunks) if top_chunks else 0.0
    
    logger.info(f"RAG retrieved {len(top_chunks)} chunks, avg similarity: {avg_similarity:.3f}")
    
    return {
        'context': context,
        'similarity_score': avg_similarity,
        'num_chunks_used': len(top_chunks),
        'chunk_scores': [{'index': c['index'], 'similarity': c['similarity']} for c in top_chunks]
    }


# ==================== API ROUTES ==

@api_router.get("/")
async def root():
    return {"message": "EduAssist API - Subjective Answer Evaluation System"}

@api_router.post("/syllabus/upload", response_model=Syllabus)
async def upload_syllabus(input: SyllabusCreate):
    """Upload and process syllabus/notes from text input"""
    try:
        # Chunk the content
        chunks = await chunk_text(input.content)
        
        # Generate embeddings for each chunk
        embeddings = []
        for chunk in chunks:
            embedding = await get_embeddings(chunk['text'])
            embeddings.append(embedding)
        
        syllabus = Syllabus(
            title=input.title,
            content=input.content,
            subject=input.subject,
            topic=input.topic,
            chunks=chunks,
            embeddings=embeddings
        )
        
        # Store in MongoDB
        doc = syllabus.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.syllabus.insert_one(doc)
        
        logger.info(f"Syllabus uploaded: {syllabus.id}")
        return syllabus
    except Exception as e:
        logger.error(f"Error uploading syllabus: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/syllabus/upload-file")
async def upload_syllabus_file(
    title: str = Form(...),
    subject: str = Form(...),
    topic: str = Form(None),
    syllabus_file: UploadFile = File(None),
    question_paper: UploadFile = File(None)
):
    """Upload syllabus from file (PDF/TXT) and optionally question paper image"""
    try:
        content = ""
        syllabus_file_base64 = None
        question_paper_base64 = None
        questions_text = None
        
        # Process syllabus file
        if syllabus_file:
            file_content = await syllabus_file.read()
            filename = syllabus_file.filename.lower()
            
            if filename.endswith('.pdf'):
                content = await extract_text_from_pdf(file_content)
                syllabus_file_base64 = base64.b64encode(file_content).decode('utf-8')
            elif filename.endswith('.txt'):
                content = await extract_text_from_txt(file_content)
                syllabus_file_base64 = base64.b64encode(file_content).decode('utf-8')
            else:
                raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported for syllabus")
        
        if not content:
            raise HTTPException(status_code=400, detail="No content extracted from file")
        
        # Process question paper if provided
        if question_paper:
            qp_content = await question_paper.read()
            question_paper_base64 = base64.b64encode(qp_content).decode('utf-8')
            
            # Extract text from question paper using OCR
            questions_text = await ocr_image(question_paper_base64)
        
        # Chunk the content
        chunks = await chunk_text(content)
        
        # Generate embeddings
        embeddings = []
        for chunk in chunks:
            embedding = await get_embeddings(chunk['text'])
            embeddings.append(embedding)
        
        syllabus = Syllabus(
            title=title or syllabus_file.filename,
            content=content,
            subject=subject,
            topic=topic,
            chunks=chunks,
            embeddings=embeddings,
            question_paper=question_paper_base64,
            questions_text=questions_text,
            original_file_b64=syllabus_file_base64
        )
        
        # Store in MongoDB
        doc = syllabus.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.syllabus.insert_one(doc)
        
        logger.info(f"Syllabus file uploaded: {syllabus.id}")
        return {
            "success": True,
            "syllabus": syllabus.model_dump(),
            "content_preview": content[:500] + "..." if len(content) > 500 else content,
            "questions_preview": questions_text[:500] + "..." if questions_text and len(questions_text) > 500 else questions_text
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading syllabus file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/syllabus", response_model=List[Syllabus])
async def get_all_syllabus():
    """Get all syllabus entries (optimized - excludes large fields)"""
    try:
        # Exclude large fields for list view
        syllabus_list = await db.syllabus.find(
            {}, 
            {"_id": 0, "embeddings": 0, "chunks": 0, "question_paper": 0, "original_file_b64": 0}
        ).limit(1000).to_list(1000)
        
        for item in syllabus_list:
            if isinstance(item['created_at'], str):
                item['created_at'] = datetime.fromisoformat(item['created_at'])
            # Add empty arrays for excluded fields to match model
            if 'chunks' not in item:
                item['chunks'] = []
            if 'embeddings' not in item:
                item['embeddings'] = []
        
        return syllabus_list
    except Exception as e:
        logger.error(f"Error fetching syllabus: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/syllabus/{syllabus_id}", response_model=Syllabus)
async def get_syllabus_by_id(syllabus_id: str):
    """Get a specific syllabus entry by ID (includes question paper and original file)"""
    try:
        item = await db.syllabus.find_one({"id": syllabus_id}, {"_id": 0, "embeddings": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
            
        return item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching syllabus {syllabus_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/syllabus/{syllabus_id}")
async def update_syllabus(syllabus_id: str, update_data: SyllabusUpdate):
    """Update a syllabus entry"""
    try:
        data = {k: v for k, v in update_data.model_dump().items() if v is not None}
        if not data:
            raise HTTPException(status_code=400, detail="No data provided to update")
            
        result = await db.syllabus.update_one(
            {"id": syllabus_id},
            {"$set": data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Syllabus not found")
            
        logger.info(f"Syllabus updated: {syllabus_id}")
        return {"success": True, "message": "Syllabus updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating syllabus: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/syllabus/{syllabus_id}")
async def delete_syllabus(syllabus_id: str):
    """Delete a syllabus entry"""
    try:
        result = await db.syllabus.delete_one({"id": syllabus_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        
        logger.info(f"Syllabus deleted: {syllabus_id}")
        return {"success": True, "message": "Syllabus deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting syllabus: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/syllabus/subject/{subject}")
async def delete_subject(subject: str):
    """Delete all syllabus entries for a subject"""
    try:
        result = await db.syllabus.delete_many({"subject": subject})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        logger.info(f"Subject deleted: {subject}, count: {result.deleted_count}")
        return {
            "success": True, 
            "message": f"Deleted {result.deleted_count} syllabus entries for subject '{subject}'"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting subject: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/answer/ocr")
async def process_ocr(file: UploadFile = File(...)):
    """Process uploaded image or PDF and extract text using OCR"""
    try:
        # Read file contents
        contents = await file.read()
        
        # Check if it's a PDF
        if file.content_type == 'application/pdf' or file.filename.lower().endswith('.pdf'):
            import fitz
            from PIL import Image
            
            doc = fitz.open(stream=contents, filetype="pdf")
            total_text_parts = []
            preview_base64 = ""
            
            all_page_images = []
            for i, page in enumerate(doc):
                # Convert page to image (rendering at 3x for higher precision OCR)
                pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Convert PIL image to base64
                buffered = io.BytesIO()
                img.save(buffered, format="PNG")
                page_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                
                all_page_images.append(page_base64)
                if i == 0:
                    preview_base64 = page_base64
                
                # Extract RAW text only (no cleanup yet to preserve multi-page context)
                page_raw_text = await ocr_image(page_base64, skip_cleanup=True)
                total_text_parts.append(f"--- PAGE {i+1} ---\n{page_raw_text}")
            
            doc.close()
            full_raw_text = "\n\n".join(total_text_parts)
            
            # Perform a SINGLE coherent cleanup for the entire document
            logger.info("Performing coherent LLM cleanup for multi-page document...")
            combined_text = await perform_llm_cleanup(full_raw_text)
            
            return {
                "success": True,
                "ocr_text": combined_text,
                "image_base64": preview_base64,
                "all_pages": all_page_images
            }
        
        # Original image processing logic
        image_base64 = base64.b64encode(contents).decode('utf-8')
        ocr_text = await ocr_image(image_base64)
        
        return {
            "success": True,
            "ocr_text": ocr_text,
            "image_base64": image_base64,
            "all_pages": [image_base64] # Consistent return for single images
        }
    except Exception as e:
        logger.error(f"Error in OCR processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/answer/evaluate", response_model=List[Evaluation])
async def evaluate_answer_script(answer_data: dict):
    """Evaluate an answer script using RAG pipeline (supports multiple questions per page)"""
    try:
        student_name = answer_data.get('student_name')
        student_id = answer_data.get('student_id')
        class_id = answer_data.get('class_id')
        section_id = answer_data.get('section_id')
        subject = answer_data.get('subject')
        topic = answer_data.get('topic') or 'General' # Normalize empty topic
        ocr_text = answer_data.get('ocr_text')
        image_base64 = answer_data.get('image_base64')
        exam_date = answer_data.get('exam_date')
        class_name = answer_data.get('class_name')
        section_name = answer_data.get('section_name')
        
        # Find relevant syllabus - Smart Lookup
        # 1. Try exact subject + topic
        query = {"subject": subject}
        if topic and topic != 'General':
            query["topic"] = topic
            syllabus = await db.syllabus.find_one(query, {"_id": 0})
        else:
            syllabus = None

        # 2. Fallback: Try just subject (gets the first available syllabus/notes for this subject)
        if not syllabus:
            logger.info(f"Syllabus for {subject} with topic {topic} not found, falling back to subject-only search")
            syllabus = await db.syllabus.find_one({"subject": subject}, {"_id": 0})
        
        if not syllabus:
            # Final check: Maybe a case-insensitive match for the subject?
            logger.info(f"Syllabus for {subject} still not found, trying case-insensitive match")
            syllabus = await db.syllabus.find_one({"subject": {"$regex": f"^{subject}$", "$options": "i"}}, {"_id": 0})

        if not syllabus:
            raise HTTPException(status_code=404, detail=f"No syllabus found for subject: {subject}. Please ensure the subject name matches exactly what you uploaded in 'Manage Subjects'.")
        
        # Ensure all_pages is at least the primary image if it was sent empty
        all_pages = answer_data.get('all_pages')
        if not all_pages or len(all_pages) == 0:
            all_pages = [image_base64] if image_base64 else []

        # Store answer script
        answer_script = AnswerScript(
            student_id=student_id,
            class_id=class_id,
            section_id=section_id,
            student_name=student_name,
            subject=subject,
            topic=topic,
            image_data=image_base64, # Thumbnail
            all_pages=all_pages, # Store all pages
            ocr_text=ocr_text,
            exam_date=exam_date
        )
        
        answer_doc = answer_script.model_dump()
        answer_doc['created_at'] = answer_doc['created_at'].isoformat()
        await db.answer_scripts.insert_one(answer_doc)
        
        # ===== RAG RETRIEVAL =====
        rag_result = await rag_retrieve(ocr_text, syllabus, top_k=5)
        
        # ===== LLM EVALUATION (MULTI-QUESTION) =====
        eval_results = await evaluate_answer(
            ocr_text, 
            rag_result['context'],
            syllabus.get('questions_text'),
            subject, 
            topic
        )
        
        saved_evaluations = []
        for res in eval_results:
            evaluation = Evaluation(
                answer_script_id=answer_script.id,
                student_id=student_id,
                class_id=class_id,
                section_id=section_id,
                student_name=student_name,
                subject=subject,
                topic=topic,
                question=res.get('question'),
                score=res['score'],
                explanation=res['explanation'],
                exam_date=exam_date,
                class_name=class_name,
                section_name=section_name,
                answer_text=ocr_text,
                missing_keywords=res.get('missing_keywords', []),
                matched_concepts=res.get('matched_concepts', []),
                similarity_score=rag_result['similarity_score'],
                retrieved_chunks=rag_result['num_chunks_used'],
                student_script_image=image_base64 # Added for review preview
            )
            
            # Store evaluation
            eval_doc = evaluation.model_dump()
            eval_doc['created_at'] = eval_doc['created_at'].isoformat()
            if 'updated_at' in eval_doc and eval_doc['updated_at']:
                eval_doc['updated_at'] = eval_doc['updated_at'].isoformat()
            eval_doc['rag_chunk_scores'] = rag_result.get('chunk_scores', [])
            await db.evaluations.insert_one(eval_doc)
            saved_evaluations.append(evaluation)
            
        logger.info(f"RAG Evaluation completed for {student_name}: {len(saved_evaluations)} items evaluated")
        return saved_evaluations
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/evaluations", response_model=List[Evaluation])
async def get_evaluations():
    """Get all evaluations (optimized with pagination)"""
    try:
        # Fetch only needed fields (EXCLUDE large images for list performance)
        evaluations = await db.evaluations.find(
            {}, 
            {"_id": 0, "student_script_image": 0} 
        ).sort("created_at", -1).limit(1000).to_list(1000)
        
        for eval in evaluations:
            if isinstance(eval['created_at'], str):
                eval['created_at'] = datetime.fromisoformat(eval['created_at'])
            if isinstance(eval.get('updated_at'), str):
                eval['updated_at'] = datetime.fromisoformat(eval['updated_at'])
        
        return evaluations
    except Exception as e:
        logger.error(f"Error fetching evaluations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/evaluations/{evaluation_id}/full")
async def get_evaluation_full(evaluation_id: str):
    """Get full evaluation details including ALL script pages"""
    try:
        evaluation = await db.evaluations.find_one({"id": evaluation_id}, {"_id": 0})
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Join with AnswerScript to get all pages
        script = await db.answer_scripts.find_one({"id": evaluation['answer_script_id']}, {"_id": 0, "all_pages": 1})
        
        # Fallback logic for all_pages
        if script and script.get('all_pages'):
            evaluation['all_pages'] = script['all_pages']
        else:
            # Last resort fallback to the single image stored on evaluation
            image_fallback = evaluation.get('student_script_image')
            evaluation['all_pages'] = [image_fallback] if image_fallback else []
        
        return evaluation
    except Exception as e:
        logger.error(f"Error fetching full evaluation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/feedback")
async def submit_feedback(feedback: FeedbackSubmit):
    """Submit teacher feedback on evaluation for adaptive learning"""
    try:
        # Get the original evaluation
        evaluation = await db.evaluations.find_one({"id": feedback.evaluation_id}, {"_id": 0})
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Calculate accuracy
        ai_score = evaluation['score']
        teacher_score = feedback.teacher_score
        error = abs(ai_score - teacher_score)
        accuracy_percentage = max(0, 100 - error)
        
        # Update evaluation with teacher feedback
        update_data = {
            "feedback": feedback.feedback,
            "feedback_score": teacher_score,
            "is_correct": feedback.is_correct,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.evaluations.update_one(
            {"id": feedback.evaluation_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Log feedback for adaptive learning with detailed info
        feedback_log = {
            "id": str(uuid.uuid4()),
            "evaluation_id": feedback.evaluation_id,
            "student_name": evaluation.get('student_name'),
            "subject": evaluation.get('subject'),
            "topic": evaluation.get('topic') or 'General', # Normalize topic
            "question": evaluation.get('question'), # Added specific question
            "ai_score": ai_score,
            "teacher_score": teacher_score,
            "score_difference": error,
            "accuracy_percentage": accuracy_percentage,
            "feedback": feedback.feedback,
            "concept_feedback": feedback.concept_feedback,
            "is_correct": feedback.is_correct,
            "answer_text": evaluation.get('answer_text'),
            "matched_concepts": evaluation.get('matched_concepts', []),
            "missing_keywords": evaluation.get('missing_keywords', []),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.feedback_logs.insert_one(feedback_log)
        
        logger.info(f"Feedback submitted for evaluation: {feedback.evaluation_id}, accuracy: {accuracy_percentage}%")
        return {
            "success": True, 
            "message": "Feedback submitted successfully",
            "accuracy": accuracy_percentage,
            "score_difference": error
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics", response_model=Analytics)
async def get_analytics():
    """Get performance analytics (optimized queries)"""
    try:
        # Get evaluations with only needed fields
        evaluations = await db.evaluations.find(
            {}, 
            {"_id": 0, "score": 1, "student_name": 1, "subject": 1, "created_at": 1, "feedback": 1, "is_correct": 1, "similarity_score": 1, "retrieved_chunks": 1}
        ).limit(5000).to_list(5000)
        
        if not evaluations:
            return Analytics(
                total_evaluations=0,
                average_score=0.0,
                total_students=0,
                feedback_count=0,
                model_accuracy=0.0,
                subject_wise_stats={},
                recent_trends=[]
            )
        
        # Calculate metrics
        total_evaluations = len(evaluations)
        total_score = sum(e['score'] for e in evaluations)
        average_score = total_score / total_evaluations if total_evaluations > 0 else 0
        
        unique_students = len(set(e['student_name'] for e in evaluations))
        
        feedback_count = sum(1 for e in evaluations if e.get('feedback'))
        
        avg_similarity = sum(e.get('similarity_score', 0) for e in evaluations) / total_evaluations
        avg_chunks = sum(e.get('retrieved_chunks', 0) for e in evaluations) / total_evaluations
        
        # Calculate model accuracy based on feedback
        correct_predictions = sum(1 for e in evaluations if e.get('is_correct') == True)
        model_accuracy = (correct_predictions / feedback_count * 100) if feedback_count > 0 else 0
        
        # Subject-wise stats
        subject_wise = {}
        for eval in evaluations:
            subject = eval['subject']
            if subject not in subject_wise:
                subject_wise[subject] = {'count': 0, 'total_score': 0, 'avg_score': 0}
            subject_wise[subject]['count'] += 1
            subject_wise[subject]['total_score'] += eval['score']
        
        for subject, stats in subject_wise.items():
            stats['avg_score'] = stats['total_score'] / stats['count']
        
        # Recent trends (last 10 evaluations)
        recent_trends = sorted(evaluations, key=lambda x: x.get('created_at', ''), reverse=True)[:10]
        recent_trends_data = [
            {
                'student_name': e['student_name'],
                'subject': e['subject'],
                'score': e['score'],
                'date': e.get('created_at', '')
            }
            for e in recent_trends
        ]
        
        return Analytics(
            total_evaluations=total_evaluations,
            average_score=round(average_score, 2),
            total_students=unique_students,
            feedback_count=feedback_count,
            model_accuracy=round(model_accuracy, 2),
            avg_similarity=round(avg_similarity, 3),
            avg_chunks=round(avg_chunks, 1),
            subject_wise_stats=subject_wise,
            recent_trends=recent_trends_data
        )
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/model/performance")
async def get_model_performance():
    """Get model performance metrics over time"""
    try:
        # Get feedback logs with only needed fields
        feedback_logs = await db.feedback_logs.find(
            {}, 
            {"_id": 0, "evaluation_id": 1, "teacher_score": 1, "is_correct": 1, "timestamp": 1}
        ).limit(1000).to_list(1000)
        
        if not feedback_logs:
            return {
                "performance_data": [],
                "running_accuracy": [],
                "total_feedback": 0,
                "avg_error": 0
            }
        
        # Batch query all needed evaluations (FIX N+1 QUERY ISSUE)
        evaluation_ids = [log['evaluation_id'] for log in feedback_logs]
        evaluations_cursor = db.evaluations.find(
            {"id": {"$in": evaluation_ids}},
            {"_id": 0, "id": 1, "score": 1}
        )
        evaluations_list = await evaluations_cursor.to_list(1000)
        
        # Create lookup dictionary for O(1) access
        evaluations_map = {eval['id']: eval for eval in evaluations_list}
        
        # Calculate accuracy over time
        performance_data = []
        
        for i, log in enumerate(feedback_logs):
            eval = evaluations_map.get(log['evaluation_id'])
            
            if eval and log.get('teacher_score') is not None:
                error = abs(eval['score'] - log['teacher_score'])
                performance_data.append({
                    'index': i + 1,
                    'predicted_score': eval['score'],
                    'actual_score': log['teacher_score'],
                    'error': error,
                    'is_correct': log.get('is_correct', False),
                    'timestamp': log.get('timestamp', '')
                })
        
        # Calculate running accuracy
        if performance_data:
            running_accuracy = []
            correct_count = 0
            for i, item in enumerate(performance_data):
                if item['is_correct']:
                    correct_count += 1
                running_accuracy.append({
                    'index': i + 1,
                    'accuracy': (correct_count / (i + 1)) * 100
                })
        else:
            running_accuracy = []
        
        return {
            "performance_data": performance_data,
            "running_accuracy": running_accuracy,
            "total_feedback": len(feedback_logs),
            "total_evaluations": await db.evaluations.count_documents({}),
            "avg_error": sum(p['error'] for p in performance_data) / len(performance_data) if performance_data else 0
        }
    except Exception as e:
        logger.error(f"Error fetching model performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DATABASE EXPLORER API ====================

@api_router.get("/database/collections")
async def get_database_collections():
    """Get all collections in the database with document counts and sample schema"""
    try:
        collection_names = await db.list_collection_names()
        collections = []
        
        for name in sorted(collection_names):
            collection = db[name]
            count = await collection.count_documents({})
            
            # Get one sample document to infer schema
            sample = await collection.find_one({}, {"_id": 0})
            schema = {}
            if sample:
                for key, value in sample.items():
                    val_type = type(value).__name__
                    if isinstance(value, list):
                        if len(value) > 0:
                            val_type = f"list[{type(value[0]).__name__}] ({len(value)} items)"
                        else:
                            val_type = "list (empty)"
                    elif isinstance(value, dict):
                        val_type = f"dict ({len(value)} keys)"
                    elif isinstance(value, str) and len(value) > 100:
                        val_type = f"str (len={len(value)})"
                    schema[key] = val_type
            
            collections.append({
                "name": name,
                "count": count,
                "schema": schema
            })
        
        return {
            "database": db.name,
            "total_collections": len(collections),
            "collections": collections
        }
    except Exception as e:
        logger.error(f"Error listing collections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/database/collection/{collection_name}")
async def get_collection_data(collection_name: str, page: int = 1, limit: int = 20):
    """Get paginated data from a collection (like a Workbench table view)"""
    try:
        collection_names = await db.list_collection_names()
        if collection_name not in collection_names:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")
        
        collection = db[collection_name]
        total = await collection.count_documents({})
        skip = (page - 1) * limit
        
        # Fetch documents, exclude _id (not JSON serializable) and large binary fields
        cursor = collection.find({}, {"_id": 0}).skip(skip).limit(limit)
        documents = await cursor.to_list(limit)
        
        # Process documents for display
        processed_docs = []
        for doc in documents:
            processed = {}
            for key, value in doc.items():
                if isinstance(value, list) and len(value) > 0:
                    if isinstance(value[0], float):
                        # Embedding vector — show summary
                        processed[key] = f"[Vector: {len(value)} dims, min={min(value):.4f}, max={max(value):.4f}]"
                    elif isinstance(value[0], dict):
                        # Chunks or other nested objects
                        processed[key] = value  # Keep as is for detailed view
                    else:
                        processed[key] = value
                elif isinstance(value, str) and len(value) > 500:
                    processed[key] = value[:500] + f"... ({len(value)} chars total)"
                else:
                    processed[key] = value
            processed_docs.append(processed)
        
        # Get schema from first document
        columns = []
        if documents:
            for key in documents[0].keys():
                col_type = type(documents[0][key]).__name__
                columns.append({"name": key, "type": col_type})
        
        return {
            "collection": collection_name,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "columns": columns,
            "data": processed_docs
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching collection data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/database/document/{collection_name}/{doc_id}")
async def get_document_detail(collection_name: str, doc_id: str):
    """Get full document detail including RAG data, chunks, and embeddings"""
    try:
        collection = db[collection_name]
        
        # Try multiple ID fields
        doc = await collection.find_one({"id": doc_id}, {"_id": 0})
        if not doc:
            doc = await collection.find_one({"evaluation_id": doc_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Process for detailed view
        detail = {}
        rag_info = {}
        
        for key, value in doc.items():
            if key == 'embeddings' and isinstance(value, list):
                # Show embedding statistics per chunk
                emb_stats = []
                for i, emb in enumerate(value):
                    if isinstance(emb, list) and len(emb) > 0:
                        import math
                        magnitude = math.sqrt(sum(x*x for x in emb))
                        emb_stats.append({
                            "chunk_index": i,
                            "dimensions": len(emb),
                            "magnitude": round(magnitude, 4),
                            "min": round(min(emb), 6),
                            "max": round(max(emb), 6),
                            "mean": round(sum(emb)/len(emb), 6),
                            "sample": [round(x, 4) for x in emb[:10]]  # First 10 values
                        })
                rag_info["embeddings"] = emb_stats
                detail[key] = f"[{len(value)} embedding vectors]"
            elif key == 'chunks' and isinstance(value, list):
                rag_info["chunks"] = value
                detail[key] = f"[{len(value)} chunks]"
            elif key == 'rag_chunk_scores' and isinstance(value, list):
                rag_info["rag_chunk_scores"] = value
                detail[key] = f"[{len(value)} scored chunks]"
            elif key == 'content' and isinstance(value, str) and len(value) > 1000:
                detail[key] = value[:1000] + f"... ({len(value)} chars total)"
                rag_info["full_content_length"] = len(value)
            else:
                detail[key] = value
        
        return {
            "collection": collection_name,
            "document": detail,
            "rag_data": rag_info if rag_info else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/database/document/{collection_name}/{doc_id}")
async def delete_document(collection_name: str, doc_id: str):
    """Delete a document from the database explorer"""
    try:
        collection = db[collection_name]
        
        # Try multiple ID fields
        result = await collection.delete_one({"id": doc_id})
        if result.deleted_count == 0:
            result = await collection.delete_one({"evaluation_id": doc_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"success": True, "message": "Document deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include new routers
app.include_router(auth_routes.router)
app.include_router(class_routes.router)
app.include_router(student_routes.router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
