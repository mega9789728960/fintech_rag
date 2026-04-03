/**
 * Vector Store
 * In-memory vector database with cosine similarity search.
 *
 * Each entry stores:
 *   - id: unique identifier
 *   - documentName: which document this chunk belongs to
 *   - chunkIndex: position of chunk within the document
 *   - text: the original chunk text
 *   - embedding: the vector embedding (number[])
 *
 * Supports:
 *   - Adding documents (with deduplication)
 *   - Searching by query embedding with document filtering
 *   - Listing indexed documents
 *   - Removing documents
 */

// In-memory store: Map<id, Entry>
const store = new Map();

// Track which documents have been indexed
const indexedDocuments = new Map(); // displayName -> { chunkCount, indexedAt }

/**
 * Add chunks with embeddings to the vector store.
 * @param {string} documentName - Display name of the document
 * @param {string[]} chunks - Array of text chunks
 * @param {number[][]} embeddings - Corresponding embedding vectors
 */
function addDocument(documentName, chunks, embeddings) {
    if (chunks.length !== embeddings.length) {
        throw new Error('Chunks and embeddings arrays must have the same length');
    }

    // Remove old entries for this document (re-indexing)
    removeDocument(documentName);

    for (let i = 0; i < chunks.length; i++) {
        const id = `${documentName}::chunk_${i}`;
        store.set(id, {
            id,
            documentName,
            chunkIndex: i,
            text: chunks[i],
            embedding: embeddings[i],
        });
    }

    indexedDocuments.set(documentName, {
        chunkCount: chunks.length,
        indexedAt: new Date().toISOString(),
    });

    console.log(`[VectorStore] Indexed "${documentName}": ${chunks.length} chunks`);
}

/**
 * Remove all entries for a document.
 * @param {string} documentName
 */
function removeDocument(documentName) {
    for (const [id, entry] of store) {
        if (entry.documentName === documentName) {
            store.delete(id);
        }
    }
    indexedDocuments.delete(documentName);
}

/**
 * Check if a document has been indexed.
 * @param {string} documentName
 * @returns {boolean}
 */
function isDocumentIndexed(documentName) {
    return indexedDocuments.has(documentName);
}

/**
 * Get stats about the vector store.
 * @returns {object}
 */
function getStats() {
    return {
        totalChunks: store.size,
        indexedDocuments: Object.fromEntries(indexedDocuments),
    };
}

/**
 * Search the vector store using cosine similarity.
 * @param {number[]} queryEmbedding - The query's embedding vector
 * @param {object} options
 * @param {number} options.topK - Number of results to return (default: 5)
 * @param {string[]} options.filterDocuments - Only search within these documents (empty = all)
 * @param {number} options.minScore - Minimum similarity score (default: 0.3)
 * @returns {Array<{documentName: string, chunkIndex: number, text: string, score: number}>}
 */
function search(queryEmbedding, options = {}) {
    const topK = options.topK || 5;
    const filterDocuments = options.filterDocuments || [];
    const minScore = options.minScore ?? 0.3;

    const results = [];

    for (const [, entry] of store) {
        // Filter by selected documents if specified
        if (filterDocuments.length > 0 && !filterDocuments.includes(entry.documentName)) {
            continue;
        }

        const score = cosineSimilarity(queryEmbedding, entry.embedding);

        if (score >= minScore) {
            results.push({
                documentName: entry.documentName,
                chunkIndex: entry.chunkIndex,
                text: entry.text,
                score,
            });
        }
    }

    // Sort by score descending and return top-K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
}

/**
 * Compute cosine similarity between two vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} Similarity score between -1 and 1
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

module.exports = {
    addDocument,
    removeDocument,
    isDocumentIndexed,
    getStats,
    search,
};
