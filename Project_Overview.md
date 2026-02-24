# EduAssist — Project Overview

EduAssist is an advanced AI-powered platform designed for teachers to automate the evaluation of subjective student answers. It combines local OCR, Retrieval-Augmented Generation (RAG), and Large Language Models (LLMs) to provide fair, consistent, and explainable grading.

---

## 🏗️ Architecture Overview

The system follows a modern decoupled architecture:

### 1. Frontend (React)
- **Framework**: React 19 with Tailwind CSS.
- **Role**: Provides an intuitive dashboard for teachers to manage classes, upload syllabi, and submit student answer scripts.
- **Visualization**: Integrated `recharts` for performance analytics and model health monitoring.

### 2. Backend (FastAPI)
- **Framework**: High-performance asynchronous Python API.
- **Workflow Engine**: Orchestrates OCR processing, RAG retrieval, and AI evaluation.
- **Security**: JWT-based authentication for teacher accounts.

### 3. Database & Search (MongoDB)
- **Persistent Storage**: Stores teacher profiles, student records, and evaluation history.
- **Vector Storage**: Stores syllabus "chunks" along with their 256-dimensional embeddings for semantic search.

---

## 🔄 Core Workflow

### Phase A: Knowledge Ingestion (Syllabus Upload)
1. Teacher uploads a syllabus (PDF, TXT, or plain text).
2. The system splits the text into smaller, overlapping **Chunks**.
3. Each chunk is converted into a **Vector Embedding** and stored in MongoDB.

### Phase B: Processing Submission
1. Teacher uploads an image or **PDF** of a handwritten student answer script.
2. **Local OCR (Tesseract + PyMuPDF)** extracts the raw text from all pages.
3. **LLM (Groq/Llama3)** cleans and corrects the raw OCR text into readable digital content.

### Phase C: Evaluative RAG Pipeline
1. The student's answer is embedded as a vector.
2. The system performs a **Semantic Search** across the stored syllabus chunks.
3. The most relevant syllabus context is retrieved.
4. An **LLM Evaluator** receives:
   - The Student's Answer.
   - The Syllabus Context (retrieved via RAG).
   - Scoring Rubrics.
5. The LLM generates a score, a detailed explanation, and identifies missing concepts.

### 🚀 Optimized RAG Evolution
The implementation of the Retrieval-Augmented Generation pipeline marks a significant upgrade over traditional LLM evaluation:

| Before | Now (RAG) |
| :--- | :--- |
| Entire syllabus sent to LLM | Only top-5 relevant chunks sent |
| No embeddings used | Answer embedded $\rightarrow$ similarity search |
| No similarity score | `similarity_score` returned in response |
| No chunk tracking | `retrieved_chunks` + `rag_chunk_scores` stored |

---

## 🏗️ End-to-End Automated AI Architecture

The following components orchestrate the full evaluation lifecycle as detailed in the technical schema:

| Component | Responsibility |
| :--- | :--- |
| **Syllabus & Notes** | Source knowledge ingested, preprocessed, and chunked into the vector space. |
| **OCR Engine** | Local processing of handwritten scripts into machine-readable text. |
| **Vector Database** | High-speed storage of embeddings for semantic RAG lookups. |
| **Explainable AI Module** | Generates the final score and natural language justification for teacher review. |
| **Adaptive Learning** | Logs faculty feedback and score adjustments to tune model heuristics. |
| **Faculty Dashboard** | Provides real-time performance analytics and students' progress monitoring. |

---

## 🎯 Target Audience
- **Educators**: To reduce the time spent on grading repetitive subjective tests.
- **Institutions**: To maintain standardized grading metrics across multiple departments.
- **Students**: To receive instant, detailed feedback on where they missed key concepts.

---

## 🛡️ Privacy & Reliability
- **Local OCR**: Handwriting processing happens locally on your server.
- **Async Processing**: The system handles multiple evaluations without blocking.
- **Human-in-the-loop**: Teachers can adjust scores, which feeds back into the "Model Accuracy" metrics to track system reliability.
