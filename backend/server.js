const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const { chunkText } = require('./rag/chunker');
const { initEmbedder, embedBatch, embedText } = require('./rag/embedder');
const { addDocumentToSupabase, searchSupabase, isSupabaseEnabled } = require('./rag/supabaseStore');
const { addDocument, search } = require('./rag/vectorStore');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ─── Gemini Client ───────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
initEmbedder(genAI);

// ─── Uploads Directory ───────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// ─── Multer Configuration ────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// ─── Helper: Extract text from a file ────────────────────────────────────────
async function extractFileContent(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.txt') {
        return fs.readFileSync(filePath, 'utf-8');
    }

    if (ext === '.pdf') {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            return pdfData.text;
        } catch (err) {
            console.error(`Error parsing PDF ${filePath}:`, err.message);
            return `[Error: Could not extract text from this PDF]`;
        }
    }

    if (ext === '.doc' || ext === '.docx') {
        // Basic fallback — for production, use mammoth or similar
        return `[Document format .${ext} — text extraction not fully supported yet]`;
    }

    return `[Unsupported file format: ${ext}]`;
}

// ─── Helper: Find uploaded file by display name ──────────────────────────────
function findFileByDisplayName(displayName) {
    const files = fs.readdirSync(uploadDir);
    for (const filename of files) {
        const originalName = filename.replace(/^\d+-\d+-/, '');
        const display = originalName.replace(/\.[^/.]+$/, '');
        if (display === displayName) {
            return path.join(uploadDir, filename);
        }
    }
    return null;
}

// ─── POST /api/upload — Multi-file Upload ────────────────────────────────────
app.post('/api/upload', upload.array('financialDocuments', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }

        const uploadedFiles = req.files.map(f => ({
            filePath: f.path,
            originalName: f.originalname,
            filename: f.filename,
            displayName: f.originalname.replace(/\.[^/.]+$/, ''),
        }));

        console.log(`[Upload] ${uploadedFiles.length} file(s) ingested successfully.`);
        
        // Process each file for RAG
        for (const f of uploadedFiles) {
            console.log(`  → Processing for RAG: ${f.displayName}`);
            try {
                const content = await extractFileContent(f.filePath);
                const chunks = chunkText(content);
                if (chunks.length === 0) {
                    console.log(`    - No parsable text found in ${f.displayName}`);
                    continue;
                }
                
                console.log(`    - Split into ${chunks.length} chunks. Embedding...`);
                const embeddings = await embedBatch(chunks);
                
                if (isSupabaseEnabled()) {
                    await addDocumentToSupabase(f.displayName, chunks, embeddings);
                } else {
                    addDocument(f.displayName, chunks, embeddings); // In-memory fallback
                }
                console.log(`    - Successfully indexed ${f.displayName}`);
            } catch (err) {
                console.error(`    - Error indexing ${f.displayName}:`, err.message);
            }
        }

        res.json({
            success: true,
            message: `${uploadedFiles.length} document(s) successfully indexed for RAG.`,
            files: uploadedFiles,
        });
    } catch (error) {
        console.error('Error in file upload:', error);
        res.status(500).json({ success: false, message: 'Server error during upload.' });
    }
});

// ─── GET /api/documents — List all uploaded documents ────────────────────────
app.get('/api/documents', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        const documents = files
            .filter(f => {
                const stat = fs.statSync(path.join(uploadDir, f));
                return stat.isFile();
            })
            .map(filename => {
                const originalName = filename.replace(/^\d+-\d+-/, '');
                const stat = fs.statSync(path.join(uploadDir, filename));
                return {
                    filename,
                    originalName,
                    displayName: originalName.replace(/\.[^/.]+$/, ''),
                    size: stat.size,
                    uploadedAt: stat.mtime,
                };
            })
            .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        res.json({ success: true, documents });
    } catch (error) {
        console.error('Error listing documents:', error);
        res.status(500).json({ success: false, message: 'Error listing documents.' });
    }
});

// ─── POST /api/query — RAG Query with Streaming ─────────────────────────────
app.post('/api/query', async (req, res) => {
    const { query, selectedDocuments = [], conversationHistory = [] } = req.body;

    if (!query || query.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    // Set up SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
        // ── Step 1: Retrieve relevant context using Vector Search ──
        let documentContext = '';

        if (selectedDocuments.length > 0) {
            console.log(`[Query] Searching vector db for: "${query.substring(0, 50)}..."`);
            try {
                // Determine embedding of the query
                const queryEmbedding = await embedText(query);
                
                // Search vector store
                let searchResults = [];
                if (isSupabaseEnabled()) {
                    searchResults = await searchSupabase(queryEmbedding, {
                        topK: 15,
                        filterDocuments: selectedDocuments
                    });
                } else {
                    searchResults = search(queryEmbedding, {
                        topK: 15,
                        filterDocuments: selectedDocuments
                    });
                }

                if (searchResults.length > 0) {
                    // Group results by document
                    const groupedResults = {};
                    for (const r of searchResults) {
                        if (!groupedResults[r.documentName]) groupedResults[r.documentName] = [];
                        groupedResults[r.documentName].push(r);
                    }

                    for (const [docName, chunks] of Object.entries(groupedResults)) {
                        documentContext += `\n\n--- DOCUMENT: "${docName}" ---\n`;
                        chunks.sort((a, b) => a.chunkIndex - b.chunkIndex); // keep chronological order
                        for (const chunk of chunks) {
                            documentContext += `...${chunk.text}...\n\n`;
                        }
                        documentContext += `--- END OF "${docName}" ---\n`;
                    }
                    console.log(`  ✓ Found ${searchResults.length} relevant chunks across ${Object.keys(groupedResults).length} document(s).`);
                } else {
                    documentContext = "No highly relevant information found in the selected documents for this specific query.";
                    console.log(`  - No relevant chunks found.`);
                }

            } catch (err) {
                console.error('[Query] Search error:', err);
                documentContext = "[Error performing vector search on documents]";
            }
        }

        // ── Step 2: Build the system prompt ──
        const systemPrompt = buildSystemPrompt(documentContext, selectedDocuments);

        // ── Step 3: Build conversation messages for Gemini ──
        const chatHistory = conversationHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // ── Step 4: Call Gemini with streaming ──
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemPrompt,
        });

        const chat = model.startChat({
            history: chatHistory,
        });

        console.log(`[Query] Sending to Gemini: "${query.substring(0, 80)}..."`);

        const result = await chat.sendMessageStream(query);

        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                // Send each chunk as an SSE data event
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
        }

        // Signal end of stream
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

        console.log(`[Query] Streaming complete.`);

    } catch (error) {
        console.error('[Query] Error:', error.message);

        // Send error through the stream
        res.write(`data: ${JSON.stringify({
            error: true,
            message: error.message || 'An error occurred while processing your query.'
        })}\n\n`);
        res.end();
    }
});

// ─── System Prompt Builder ───────────────────────────────────────────────────
function buildSystemPrompt(documentContext, selectedDocuments) {
    const hasDocuments = documentContext.trim().length > 0;

    if (hasDocuments) {
        return `You are **FinIntel Engine**, an advanced Real-Time Financial Intelligence RAG (Retrieval-Augmented Generation) assistant.

## Your Role
You analyze and answer questions strictly based on the provided documents. You are precise, thorough, and cite specific parts of the documents when possible.

## Rules
1. **ONLY use information from the provided documents** to answer the user's question. Do NOT make up or hallucinate information.
2. If the documents do not contain enough information to answer, clearly state: "The provided documents do not contain sufficient information to answer this question."
3. When referencing information, mention which document it came from (e.g., "According to [document name]...").
4. Format your responses with clear structure — use headings, bullet points, and bold text for key figures.
5. If the user asks about something partially covered, answer what you can and note what's missing.
6. For financial data, be precise with numbers and include units/currency.

## Selected Documents (${selectedDocuments.length})
The user has selected the following documents for analysis:
${selectedDocuments.map((d, i) => `  ${i + 1}. ${d}`).join('\n')}

## Document Contents
${documentContext}

Answer the user's questions based ONLY on the document contents above.`;
    }

    // No documents selected — general assistant mode
    return `You are **FinIntel Engine**, an advanced Financial Intelligence assistant.

## Your Role
You help users with financial analysis, document interpretation, and general financial questions.

## Important Note
No documents have been selected for context. If the user asks about specific documents, remind them to select documents using the 📎 button in the chat input.

Provide helpful, well-structured responses with clear formatting.`;
}

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Gemini API Key: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ MISSING — set GEMINI_API_KEY in .env'}`);
});
