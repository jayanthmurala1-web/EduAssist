# EduAssist — Setup & Installation Guide

This guide provides a step-by-step walkthrough for setting up EduAssist from scratch, including cloning, API configuration, and software dependencies like Tesseract OCR.

---

## 📋 Prerequisites

Ensure you have the following installed on your host machine:

| Component | Requirement | Purpose |
| :--- | :--- | :--- |
| **Python** | 3.11+ | Backend logic and AI processing |
| **Node.js** | 18+ | Frontend React environment |
| **MongoDB** | 6.0+ | Persistent storage for data and RAG chunks |
| **Tesseract OCR** | 5.0+ | Local OCR engine (Crucial for handwriting recognition) |
| **Git** | Latest | Version control |

---

## 🚀 Step 1: Clone the Repository

```bash
git clone <repository-url>
cd edu
```

---

## 🛠️ Step 2: Tesseract OCR Setup (Mandatory)

EduAssist uses local Tesseract for OCR to ensure data privacy and zero cost.

### For Windows:
1. Download the installer from [UB-Mannheim Tesseract](https://github.com/UB-Mannheim/tesseract/wiki).
2. Install it to `C:\Program Files\Tesseract-OCR`.
3. **Important:** Add `C:\Program Files\Tesseract-OCR` to your System PATH environment variable.
4. Verify by running `tesseract --version` in your terminal.

### For macOS:
```bash
brew install tesseract
```

---

## ⚙️ Step 3: Backend Configuration

1. **Navigate to backend and create virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   # Activate (Windows)
   .\venv\Scripts\Activate
   # Activate (macOS/Linux)
   source venv/bin/activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   # Ensure pytesseract is installed manually if missing
   pip install pytesseract Pillow
   ```

3. **Environment Setup:**
   Create a `.env` file in the `backend/` directory:
   ```env
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="eduassist_db"
   GROQ_API_KEY="your_groq_api_key_here"  # Get from console.groq.com
   SECRET_KEY="your_random_secret_key"
   ```

4. **Launch Server:**
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 💻 Step 4: Frontend Configuration

1. **Navigate to frontend and install packages:**
   ```bash
   cd ../frontend
   npm install  # or yarn install
   ```

2. **Environment Setup:**
   Create a `.env` file in the `frontend/` directory:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8000
   ```

3. **Launch Web App:**
   ```bash
   npm start
   ```

---

## 🔑 Step 5: Acquiring API Keys & Credentials

The system requires two external configurations to function: **Groq** for the AI brain and **MongoDB** for the data heart.

### 5.1 Obtaining your Groq API Key (AI Engine)
Groq provides a high-speed inference engine for Llama models.
1.  Go to the [Groq Cloud Console](https://console.groq.com/).
2.  Sign up or log in with your account.
3.  On the left sidebar, click on **"API Keys"**.
4.  Click the **"Create API Key"** button.
5.  Give your key a name (e.g., `EduAssist-Dev`).
6.  **Important**: Copy the key immediately (starts with `gsk_`). Paste this into your `backend/.env` file.

### 5.2 Setting up MongoDB (Storage)
You can choose between a local installation or a cloud-based **MongoDB Atlas** cluster.

**Option A: MongoDB Atlas (Recommended for Cloud)**
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2.  Create a "Shared" (Free) cluster.
3.  In the "Security" tab, create a **Database User** with a username and password.
4.  In "Network Access," click **"Add IP Address"** and choose "Allow Access from Anywhere" (for development purposes).
5.  Go to "Database" -> "Connect" -> "Drivers".
6.  Copy the connection string (e.g., `mongodb+srv://<username>:<password>@cluster0...`).
7.  Replace `<password>` with your actual password and paste it into `MONGO_URL` in your `backend/.env`.

**Option B: Local MongoDB (Offline)**
1.  Ensure MongoDB Community Edition is installed.
2.  Set `MONGO_URL="mongodb://localhost:27017"` in your `.env`.

---

## 📋 Environment Configuration Check

Your `backend/.env` should look like this:
```env
# Database Configuration
MONGO_URL="mongodb+srv://..."  # Or local URL
DB_NAME="eduassist_db"

# Security
CORS_ORIGINS="*"
SECRET_KEY="any_complex_string_for_jwt"

# AI Configuration (The Brain)
GROQ_API_KEY="gsk_..."  # From console.groq.com
```

---

## ✅ Final Verification Checklist
- [ ] Backend accessible at `http://localhost:8000/api/`
- [ ] Frontend running at `http://localhost:3000`
- [ ] Tesseract command available in terminal
- [ ] MongoDB connection successful (check backend logs)
