# AI-Driven Cyber Public Grievance System

An end-to-end AI pipeline for cybercrime complaint analysis using Mistral 7B, Neo4j, ChromaDB, and FastAPI — runs 100% locally.

## Project Structure

cyber-grievance-system/
├── backend/
│   ├── main.py
│   ├── routers/            # complaint.py, dashboard.py, rag.py
│   ├── services/           # ocr, llm, embedding, graph, pipeline, rag, crag
│   ├── models/             # complaint.py, entities.py
│   ├── db/                 # postgres.py, neo4j_conn.py, chroma_conn.py
│   └── knowledge_base/     # IT Act, IPC, RBI, CERT-In text files
├── frontend/               # React TypeScript app
├── .env.example
├── requirements.txt
└── README.md

## Tech Stack
- **Frontend:** React (TypeScript) + Tailwind CSS
- **Backend:** FastAPI + Uvicorn
- **LLM:** Mistral 7B via Ollama (runs on GPU)
- **OCR:** EasyOCR (Hindi + English)
- **Vector Store:** ChromaDB + SBERT embeddings
- **Graph DB:** Neo4j Desktop
- **Structured DB:** PostgreSQL + SQLAlchemy

## Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/ayushvakani/Cyber-grievance-system.git
cd Cyber-grievance-system
```

### 2. Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # Mac/Linux
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your actual DB passwords.

### 5. Start databases
- Start PostgreSQL service
- Open Neo4j Desktop and start CyberGraph database
- ChromaDB runs automatically via Python
- Make sure Ollama is running (`ollama serve`)

### 6. Run migrations
```bash
alembic upgrade head
```

### 7. Start backend
```bash
uvicorn backend.main:app --reload --port 8000
```

### 8. Start frontend
```bash
cd frontend
npm install
npm start
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/complaint/submit | Submit new complaint |
| GET | /api/complaint/{id}/insights | Get AI insights |
| GET | /api/dashboard/stats | Dashboard statistics |

## Architecture
Complaint submitted → FastAPI → OCR (if image) → Mistral 7B extracts entities → SBERT embeddings → ChromaDB + Neo4j → Graph RAG + CRAG → Officer recommendation
