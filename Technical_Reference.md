# EduAssist — Technical Reference (Core Logic & Deep Dive)

This document details the internal mechanics of the EduAssist evaluation engine, including RAG retrieval, embedding mathematics, and evaluation heuristics.

---

## 🔢 1. Embedding & Vector Logic

EduAssist uses a custom, deterministic **Hash-based Embedding** strategy for zero-cost semantic representation.

### Algorithm: Weighted MD5 Hashing
Instead of calling external embedding APIs (like OpenAI), the system maps text into a 256-dimensional vector space using the distribution of MD5 hashes of individual words.

**The Process:**
1. A word is hashed using MD5.
2. The hash bits are iterated; for each bit `j` in the range `[0, 255]`:
   - If bit is `1`, we add `1` to the `j-th` dimension.
   - If bit is `0`, we subtract `1` from the `j-th` dimension.
3. The resulting vector is normalized to a unit length.

### Resulting Vector Representation:
$$\mathbf{V} = \frac{\sum_{w \in \text{text}} \Phi(w)}{\left\| \sum_{w \in \text{text}} \Phi(w) \right\|}$$
Where $\Phi(w)$ is the hash-to-vector projection function.

---

## 🔍 2. RAG Retrieval Mechanics

Retrieval-Augmented Generation relies on **Cosine Similarity** to quantify the relevance between a student's answer and syllabus sections.

### Formula: Cosine Similarity
$$\text{Similarity}(\mathbf{A}, \mathbf{B}) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$

**Retrieval Pipeline:**
1. **Query Embedding**: The student answer $S$ is converted to vector $\mathbf{V}_S$.
2. **Scoring**: For every syllabus chunk $C_i$, the system calculates $score_i = \text{Similarity}(\mathbf{V}_S, \mathbf{V}_{C_i})$.
3. **Selection**: The Top-$K$ (default $K=5$) chunks with the highest scores are concatenated to form the "Augmented Context."

---

## 🤖 3. Evaluation Heuristics

The evaluation is handled by **Llama 3.3 70B** via Groq, strictly constrained by a JSON schema.

### Context Composition
The prompt sent to the LLM is structured as:
```text
System Context: You are a fair evaluator.
Syllabus Context: [RELEVANT RAG CHUNKS]
Student Answer: [HANDWRITTEN EXTRACT]
Rubric: Correctness, Keywords, and Concepts.
```

### Feedback Loop & Accuracy Formula
The "Model Performance" page tracks the drift between AI scores ($S_{AI}$) and Teacher-validated scores ($S_T$).

**Mean Individual Absolute Error:**
$$\text{Error} = |S_{AI} - S_T|$$

**System Accuracy Quotient:**
The system marks an evaluation as "Correct" if:
$$\text{Error} \leq \tau \text{ (where } \tau \text{ is the tolerance threshhold, default 10\%)}$$

---

## 📝 4. OCR Pipeline Details

Local Tesseract processing is enhanced through multi-stage image preprocessing:
1. **Grayscale Conversion**: Eliminates color noise.
2. **Contrast Enhancement**: $Factor = 2.0$ to distinguish ink from paper.
3. **Sharpening Filter**: Defines handwritten strokes for the Google Tesseract engine.
4. **Post-Correction**: Llama 3.3 corrects common OCR artifacts (e.g., 'O' vs '0', 'l' vs '1') using structural context.

---

## 🗃️ 5. Database Schema (MongoDB Collections)

- `syllabus`: Stores `chunks` (text strings) and `embeddings` (List of floats).
- `evaluations`: Stores scoring breakdown, `similarity_score`, and `retrieved_chunks`.
- `teachers`: Stores hashed passwords and school configurations.
- `students`: Central repository for student-specific progress tracking.
