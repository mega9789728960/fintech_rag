const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey && !supabaseKey.includes('YOUR_')) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('[SupabaseStore] Initialized Supabase client.');
    } catch (err) {
        console.warn(`[SupabaseStore] Failed to initialize Supabase client: ${err.message}`);
    }
} else {
    console.warn('[SupabaseStore] Missing or placeholder SUPABASE_URL/KEY. Vector functionality to Supabase is disabled. Using In-Memory fallback.');
}

/**
 * Add chunks with embeddings to the vector store.
 * @param {string} documentName - Display name of the document
 * @param {string[]} chunks - Array of text chunks
 * @param {number[][]} embeddings - Corresponding embedding vectors
 */
async function addDocumentToSupabase(documentName, chunks, embeddings) {
    if (!supabase) throw new Error('Supabase client not initialized');
    if (chunks.length !== embeddings.length) {
        throw new Error('Chunks and embeddings arrays must have the same length');
    }

    // First delete any existing chunks for this document
    await supabase
        .from('document_chunks')
        .delete()
        .eq('document_name', documentName);

    // Prepare rows for insertion
    // Format embedding as pgvector string literal for halfvec compatibility
    const rows = chunks.map((chunk, i) => ({
        document_name: documentName,
        chunk_index: i,
        text_content: chunk,
        embedding: `[${embeddings[i].join(',')}]`,
    }));

    // Insert new chunks, batching to prevent payload limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('document_chunks').insert(batch);
        
        if (error) {
            console.error(`[SupabaseStore] Error inserting chunk batch for ${documentName}:`, error);
            throw error;
        }
    }

    console.log(`[SupabaseStore] Successfully indexed "${documentName}": ${chunks.length} chunks`);
}

/**
 * Search the Supabase pgvector database using cosine similarity.
 * @param {number[]} queryEmbedding - The query's embedding vector
 * @param {object} options
 * @param {number} options.topK - Number of results to return
 * @param {string[]} options.filterDocuments - Documents to filter by
 * @param {number} options.minScore - Minimum similarity threshold
 */
async function searchSupabase(queryEmbedding, options = {}) {
    if (!supabase) throw new Error('Supabase client not initialized');

    const topK = options.topK || 5;
    const filterDocuments = options.filterDocuments && options.filterDocuments.length > 0 ? options.filterDocuments : null;
    const minScore = options.minScore ?? 0.3;

    // We use the rpc match function we define in supabase_setup.sql
    // Format query embedding as pgvector string for halfvec parameter
    const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: minScore,
        match_count: topK,
        filter_documents: filterDocuments
    });

    if (error) {
        console.error('[SupabaseStore] Search error:', error);
        throw error;
    }

    return data.map(row => ({
        documentName: row.document_name,
        chunkIndex: row.chunk_index,
        text: row.text_content,
        score: row.similarity
    }));
}

module.exports = {
    addDocumentToSupabase,
    searchSupabase,
    isSupabaseEnabled: () => !!supabase
};
