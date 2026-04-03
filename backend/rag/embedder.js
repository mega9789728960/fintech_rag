/**
 * Embedder
 * Generates vector embeddings using Gemini's gemini-embedding-001 model.
 * Produces 3072-dimensional vectors. Supports both single texts and batch embedding.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let embeddingModel = null;

/**
 * Initialize the embedding model with the Gemini client.
 * @param {GoogleGenerativeAI} genAI - Initialized Gemini client
 */
function initEmbedder(genAI) {
    embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    console.log('[Embedder] Initialized with gemini-embedding-001 (3072 dims)');
}

/**
 * Generate an embedding for a single text string.
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector (3072 dimensions)
 */
async function embedText(text) {
    if (!embeddingModel) throw new Error('Embedder not initialized. Call initEmbedder first.');

    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
}

/**
 * Generate embeddings for multiple texts in batches.
 * Gemini's batchEmbedContents supports up to 100 texts at a time.
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function embedBatch(texts) {
    if (!embeddingModel) throw new Error('Embedder not initialized. Call initEmbedder first.');
    if (texts.length === 0) return [];

    const BATCH_SIZE = 100;
    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);

        const result = await embeddingModel.batchEmbedContents({
            requests: batch.map(text => ({
                content: { parts: [{ text }] },
            })),
        });

        const embeddings = result.embeddings.map(e => e.values);
        allEmbeddings.push(...embeddings);

        if (texts.length > BATCH_SIZE) {
            console.log(`[Embedder] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} done`);
        }
    }

    return allEmbeddings;
}

module.exports = { initEmbedder, embedText, embedBatch };
