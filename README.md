# EduAssist — AI-Powered Subjective Evaluation System

EduAssist is an elite, end-to-end automated AI solution designed for educational institutions. It automates the evaluation of handwritten student answers using a sophisticated combination of Local OCR, Retrieval-Augmented Generation (RAG), and Large Language Models (LLMs).

---

## 📚 Documentation Hub

To get started with EduAssist, please refer to our specialized documentation files:

*   **[Setup & Installation Guide](./Setup_Guide.md)**: From cloning the repo to setting up Tesseract OCR and API keys.
*   **[Project Overview](./Project_Overview.md)**: Architecture, core workflows, and end-to-end AI pipelines.
*   **[Technical Reference](./Technical_Reference.md)**: Deep dive into RAG logic, mathematical formulas, and embedding heuristics.

---

## 💎 Key Features

*   **Zero-Cost Local OCR**: High-performance handwriting extraction using Tesseract, refined by Llama 3.3.
*   **Intelligent RAG Pipeline**: Semantic search that retrieves only the exact relevant syllabus sections for every evaluation.
*   **Explainable AI (XAI)**: Provides scores (0-100) alongside natural language justifications, matched concepts, and missing keywords.
*   **Adaptive Learning Engine**: Dynamically tracks accuracy drift between AI results and teacher-validated scores.
*   **State-of-the-Art Analytics**: Premium dashboards for subject-wise performance and neural engine health monitoring.

---

## 🚀 Modern Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Tailwind CSS, Recharts |
| **Backend** | FastAPI (Python 3.11+), Motor (Async MongoDB) |
| **Database** | MongoDB Atlas (Vector + Document Storage) |
| **OCR** | Local Tesseract OCR Engine |
| **AI Brain** | Groq Llama 3.3 70B (State-of-the-Art Inference) |
| **Embeddings** | Custom Weighted Hashing (Private & Local) |

---

## 🛠️ Quick Architecture Preview

1.  **Ingestion**: Syllabus is chunked and vectorized locally.
2.  **OCR**: Handwritten scripts are processed via local computer vision.
3.  **RAG**: Answer vector is searched against the syllabus vector space.
4.  **Grading**: LLM evaluates the context vs. answer using rubrics.
5.  **Analytics**: Data is pushed to the Faculty Dashboard for real-time insights.

---

