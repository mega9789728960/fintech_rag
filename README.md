<p align="center">
  <img src="https://img.shields.io/badge/Gemini_2.0-Powered-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini Powered"/>
  <img src="https://img.shields.io/badge/React_19-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19"/>
  <img src="https://img.shields.io/badge/Supabase-pgvector-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Express-Backend-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/RAG-Architecture-FF6F00?style=for-the-badge&logo=apache-spark&logoColor=white" alt="RAG"/>
</p>

<h1 align="center">🏦 FinIntel RAG Engine</h1>

<p align="center">
  <strong>Real-Time Financial Intelligence powered by Retrieval-Augmented Generation</strong>
</p>

<p align="center">
  A production-grade, full-stack RAG system that transforms raw financial documents into an interactive, AI-powered knowledge base.
  Upload PDFs, balance sheets, and reports — then query them with natural language and receive precise, citation-backed answers streamed in real time.
</p>

<br/>

---

## ✨ Why This Project Stands Out

This isn't a toy chatbot wrapper. It's a **ground-up RAG pipeline** with:

- ⚡ **Custom chunking engine** — recursive character splitting with sentence-boundary awareness and configurable overlap
- 🧠 **3072-dimensional embeddings** via Google's `gemini-embedding-001` model
- 🗄️ **Dual vector storage** — Supabase `pgvector` (production) with automatic in-memory fallback (development)
- 🌊 **Server-Sent Events streaming** — token-by-token AI response delivery for real-time UX
- 📎 **Multi-document context selection** — query across specific documents with semantic filtering
- 🔁 **Conversational memory** — multi-turn dialogue with full history context sent to the LLM

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Sidebar  │  │ Document     │  │ Chat       │  │ Message   │  │
│  │          │  │ Uploader     │  │ Window     │  │ Input +   │  │
│  │ Doc List │  │ Multi-file   │  │ Streaming  │  │ Doc Picker│  │
│  │ + Search │  │ Drag & Drop  │  │ Renderer   │  │           │  │
│  └──────────┘  └──────────────┘  └────────────┘  └───────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ REST + SSE
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express.js)                         │
│                                                                  │
│  ┌────────────────────── RAG Pipeline ──────────────────────┐   │
│  │                                                          │   │
│  │  📄 Upload → 📝 Extract → ✂️ Chunk → 🧠 Embed → 💾 Store │   │
│  │                                                          │   │
│  │  ❓ Query → 🧠 Embed → 🔍 Search → 📋 Context → 🤖 LLM  │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Multer    │  │ Chunker  │  │ Embedder   │  │ Vector      │  │
│  │ File I/O  │  │ 800 char │  │ Gemini     │  │ Store       │  │
│  │ PDF Parse │  │ 150 lap  │  │ 3072-dim   │  │ Cosine Sim  │  │
│  └───────────┘  └──────────┘  └────────────┘  └──────┬──────┘  │
└──────────────────────────────────────────────────────┼──────────┘
                                                       │
                             ┌─────────────────────────┤
                             ▼                         ▼
                   ┌─────────────────┐      ┌─────────────────┐
                   │   Supabase      │      │   In-Memory     │
                   │   pgvector      │      │   Fallback      │
                   │   halfvec(3072) │      │   Map + Cosine  │
                   │   HNSW Index    │      │                 │
                   └─────────────────┘      └─────────────────┘
```

---

## 🧩 Technical Deep Dive

### 📄 Document Ingestion Pipeline

| Stage | Implementation | Details |
|-------|---------------|---------|
| **Upload** | Multer multi-file handler | Up to 10 files/request · PDF, TXT, DOC, DOCX |
| **Extraction** | `pdf-parse` + fs | Raw text extraction from binary formats |
| **Chunking** | Custom recursive splitter | 800-char chunks · 150-char overlap · sentence-boundary aware |
| **Embedding** | `gemini-embedding-001` | 3072-dim vectors · batch processing (100/batch) |
| **Storage** | Supabase pgvector / In-memory | `halfvec(3072)` with HNSW cosine index |

### 🔍 Retrieval & Generation Pipeline

| Stage | Implementation | Details |
|-------|---------------|---------|
| **Query Embedding** | `gemini-embedding-001` | Same model for query-document alignment |
| **Vector Search** | Cosine similarity (pgvector RPC) | Top-K retrieval with configurable threshold (default: 0.3) |
| **Document Filtering** | SQL `ANY()` filter | Query only user-selected documents |
| **Context Assembly** | Grouped by document | Chunks sorted by position for coherent context |
| **Generation** | `gemini-2.0-flash` + streaming | SSE token-by-token with 10-message conversation history |

### 🧠 Chunking Strategy

The custom chunker uses a **recursive splitting approach** that preserves semantic coherence:

```
Full Document
    │
    ├── Split by paragraphs (\n\n)
    │       │
    │       ├── Merge until chunk_size (800 chars)
    │       │       │
    │       │       └── Add overlap (150 chars) from previous chunk
    │       │
    │       └── If paragraph > 1.5× chunk_size:
    │               │
    │               └── Split by sentences (. ! ?)
    │                       │
    │                       └── Fallback: split by words
    │
    └── Filter out chunks < 50 chars
```

---

## 🖥️ UI/UX Highlights

| Feature | Description |
|---------|-------------|
| **Bloomberg Terminal Aesthetic** | Dark, data-dense interface inspired by professional trading terminals |
| **Real-Time Streaming** | AI responses appear token-by-token via SSE — no loading spinners |
| **Document Context Picker** | 📎 button with searchable dropdown, select/deselect all, and active badges |
| **Multi-File Upload** | Drag multiple files, see chips with sizes, batch upload with progress |
| **Conversation Memory** | AI maintains context across messages in the same session |
| **Responsive Layout** | Sidebar + chat panel with custom scrollbars and smooth animations |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Google AI API Key** — [Get one here](https://aistudio.google.com/apikey)
- **Supabase Project** (optional) — for persistent vector storage

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/finintel-rag.git
cd finintel-rag

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key

# Optional — omit for in-memory vector storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Set Up Supabase (Optional)

If using Supabase for persistent vector storage, run the SQL in `backend/rag/supabase_setup.sql` in your Supabase SQL Editor. This creates:

- `document_chunks` table with `halfvec(3072)` column
- HNSW cosine similarity index
- `match_document_chunks` RPC function for semantic search

### 4. Run

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** and start uploading financial documents.

---

## 📁 Project Structure

```
finintel-rag/
├── backend/
│   ├── server.js              # Express server — REST API + SSE streaming
│   ├── rag/
│   │   ├── chunker.js         # Recursive text chunker with overlap
│   │   ├── embedder.js        # Gemini embedding model wrapper
│   │   ├── vectorStore.js     # In-memory vector DB with cosine similarity
│   │   ├── supabaseStore.js   # Supabase pgvector integration
│   │   └── supabase_setup.sql # Database schema + RPC function
│   └── uploads/               # Uploaded document storage
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Root component — state management + API calls
│   │   └── components/
│   │       ├── Sidebar.jsx        # Document list + search + upload trigger
│   │       ├── DocumentUploader.jsx # Multi-file upload with chip UI
│   │       ├── ChatWindow.jsx     # Message renderer with streaming support
│   │       └── MessageInput.jsx   # Input bar + document context picker
│   ├── index.html
│   └── tailwind.config.js
│
└── README.md
```

---

## 🔧 API Reference

### `POST /api/upload`

Upload and index financial documents into the RAG pipeline.

```bash
curl -X POST http://localhost:5000/api/upload \
  -F "financialDocuments=@report.pdf" \
  -F "financialDocuments=@balance_sheet.txt"
```

### `GET /api/documents`

List all uploaded and indexed documents.

### `POST /api/query`

Query documents with natural language. Returns Server-Sent Events stream.

```bash
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What was the net revenue in Q3?",
    "selectedDocuments": ["q3_report"],
    "conversationHistory": []
  }'
```

**Response format (SSE):**
```
data: {"text": "According to "}
data: {"text": "the Q3 report, "}
data: {"text": "net revenue was..."}
data: {"done": true}
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4 | Reactive UI with utility-first styling |
| **UI Library** | Lucide React | Consistent icon system |
| **Backend** | Express 5 | REST API server |
| **File Handling** | Multer 2 | Multi-file upload middleware |
| **PDF Parsing** | pdf-parse | Text extraction from PDFs |
| **AI / LLM** | Google Gemini 2.0 Flash | Natural language generation |
| **Embeddings** | Gemini Embedding 001 | 3072-dimensional document embeddings |
| **Vector DB** | Supabase pgvector (halfvec) | Persistent similarity search with HNSW index |
| **Fallback DB** | Custom in-memory store | Zero-config development mode |

---

## 📈 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **`halfvec(3072)` over `vector(3072)`** | PostgreSQL's 8KB page limit blocks HNSW indexing on full-precision 3072-dim vectors. Half-precision halves storage while maintaining search quality. |
| **SSE over WebSockets** | Simpler protocol for unidirectional streaming. No handshake overhead, native browser support via `fetch` + `ReadableStream`. |
| **Overlap chunking (150 chars)** | Prevents information loss at chunk boundaries — critical for financial data where a number on one line may be explained on the next. |
| **In-memory vector fallback** | Enables development without Supabase. Auto-detected at startup via env variable validation. |
| **Batch embedding (100/batch)** | Maximizes throughput within Gemini API limits while staying under request size caps. |

---

## 🗺️ Roadmap

- [ ] 🔐 Authentication & multi-tenant document isolation
- [ ] 📊 Financial chart generation from extracted data
- [ ] 🧮 Agentic workflows — multi-step analysis with tool use
- [ ] 📱 Mobile-responsive layout
- [ ] 🗃️ Document versioning and diff analysis
- [ ] 🌐 Deploy to Vercel (frontend) + Railway/Render (backend)

---

## 📜 License

This project is licensed under the ISC License.

---

<p align="center">
  <strong>Built with 🔥 by a developer who believes financial intelligence should be accessible to everyone.</strong>
</p>
