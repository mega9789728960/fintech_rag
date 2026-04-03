/**
 * Document Chunker
 * Splits extracted text into overlapping chunks for embedding & retrieval.
 *
 * Strategy: Recursive character splitting with sentence-boundary awareness.
 * - Primary split on paragraphs (\n\n)
 * - Secondary split on sentences (. ! ?)
 * - Fallback split on words if a single sentence exceeds chunkSize
 * - Each chunk retains overlap from the previous chunk for context continuity
 */

const DEFAULT_CHUNK_SIZE = 800;    // characters per chunk
const DEFAULT_CHUNK_OVERLAP = 150; // overlap between consecutive chunks

/**
 * Split document text into overlapping chunks.
 * @param {string} text - Full document text
 * @param {object} options
 * @param {number} options.chunkSize - Target size per chunk (chars)
 * @param {number} options.chunkOverlap - Overlap between chunks (chars)
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, options = {}) {
    const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;

    if (!text || text.trim().length === 0) return [];

    // Clean the text: normalize whitespace, trim
    const cleaned = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (cleaned.length <= chunkSize) {
        return [cleaned];
    }

    // Step 1: Split into paragraphs
    const paragraphs = cleaned.split(/\n\n+/);

    // Step 2: Merge paragraphs into chunks respecting chunkSize
    const chunks = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        const trimmedPara = paragraph.trim();
        if (!trimmedPara) continue;

        // If adding this paragraph exceeds chunkSize, finalize current chunk
        if (currentChunk.length + trimmedPara.length + 2 > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());

            // Start new chunk with overlap from the end of the previous chunk
            const overlapText = currentChunk.slice(-chunkOverlap);
            currentChunk = overlapText + '\n\n' + trimmedPara;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
        }

        // If a single paragraph is larger than chunkSize, split it by sentences
        if (currentChunk.length > chunkSize * 1.5) {
            const sentenceChunks = splitBySentences(currentChunk, chunkSize, chunkOverlap);
            // Add all but the last (which becomes the new currentChunk)
            for (let i = 0; i < sentenceChunks.length - 1; i++) {
                chunks.push(sentenceChunks[i].trim());
            }
            currentChunk = sentenceChunks[sentenceChunks.length - 1];
        }
    }

    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    // Filter out tiny chunks (less than 50 chars)
    return chunks.filter(c => c.length >= 50);
}

/**
 * Split text by sentence boundaries when paragraphs are too large.
 */
function splitBySentences(text, chunkSize, chunkOverlap) {
    // Split on sentence-ending punctuation followed by a space or newline
    const sentences = text.match(/[^.!?\n]+[.!?\n]+|\S+/g) || [text];
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
        if (current.length + sentence.length > chunkSize && current.length > 0) {
            chunks.push(current.trim());
            const overlap = current.slice(-chunkOverlap);
            current = overlap + ' ' + sentence;
        } else {
            current += (current ? ' ' : '') + sentence;
        }
    }

    if (current.trim()) {
        chunks.push(current.trim());
    }

    return chunks;
}

module.exports = { chunkText, DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP };
