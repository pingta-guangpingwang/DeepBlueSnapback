"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildVectorIndex = buildVectorIndex;
exports.getVectorStatus = getVectorStatus;
exports.deleteVectorIndex = deleteVectorIndex;
exports.searchVectors = searchVectors;
exports.searchBatchVectors = searchBatchVectors;
exports.getIndexedFiles = getIndexedFiles;
exports.getFileChunks = getFileChunks;
exports.removeFilesFromIndex = removeFilesFromIndex;
exports.ingestFiles = ingestFiles;
exports.getSupportedExtensions = getSupportedExtensions;
exports.exportVectorIndex = exportVectorIndex;
exports.importVectorIndex = importVectorIndex;
exports.enhanceRagContext = enhanceRagContext;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const file_parser_1 = require("./file-parser");
// ==================== Text Chunking ====================
const CHUNK_MAX_CHARS = 2000;
const CHUNK_IDEAL_CHARS = 1200;
// Regex for function/class/method boundaries across common languages
const BLOCK_BOUNDARY = /^(\s*)(export\s+)?(async\s+)?(function\s+|class\s+|def\s+|func\s+|fn\s+|public\s+|private\s+|protected\s+|static\s+|\/\/\/\s*|###+\s|##\s|#\s)/m;
function detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
        '.ts': 'typescript', '.tsx': 'tsx', '.js': 'javascript', '.jsx': 'jsx',
        '.py': 'python', '.java': 'java', '.cs': 'csharp', '.go': 'go',
        '.rs': 'rust', '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
        '.rb': 'ruby', '.php': 'php', '.kt': 'kotlin', '.swift': 'swift',
        '.dart': 'dart', '.lua': 'lua', '.md': 'markdown', '.json': 'json',
        '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml', '.html': 'html',
        '.css': 'css', '.scss': 'scss', '.sql': 'sql', '.sh': 'bash',
        '.bat': 'batch', '.ps1': 'powershell', '.toml': 'toml', '.ini': 'ini',
    };
    return map[ext] || ext.slice(1) || 'text';
}
function estimateTokens(text) {
    return Math.ceil(text.length / 3.5);
}
function chunkFile(filePath, content) {
    const language = detectLanguage(filePath);
    const lines = content.split('\n');
    const chunks = [];
    // Find block boundaries
    const boundaries = [0];
    for (let i = 1; i < lines.length; i++) {
        if (BLOCK_BOUNDARY.test(lines[i])) {
            boundaries.push(i);
        }
    }
    boundaries.push(lines.length);
    // Merge small adjacent blocks
    const merged = [0];
    for (let i = 1; i < boundaries.length; i++) {
        const prevEnd = boundaries[i - 1];
        const currEnd = boundaries[i];
        const blockText = lines.slice(prevEnd, currEnd).join('\n');
        // Don't split very short blocks; merge with previous
        if (blockText.length < 200 && merged.length > 1 && i < boundaries.length - 1) {
            // skip this boundary (merge)
            continue;
        }
        merged.push(currEnd);
    }
    // Actually, don't merge — just use boundaries as split points
    // and split large blocks further
    const splitPoints = [0];
    for (const b of boundaries.slice(1, -1)) {
        splitPoints.push(b);
    }
    splitPoints.push(lines.length);
    // Build chunks from split points, splitting oversized ones
    for (let i = 0; i < splitPoints.length - 1; i++) {
        const start = splitPoints[i];
        const end = splitPoints[i + 1];
        const blockLines = lines.slice(start, end);
        const blockText = blockLines.join('\n');
        if (blockText.trim().length === 0)
            continue;
        if (blockText.length <= CHUNK_MAX_CHARS) {
            chunks.push({
                id: crypto.createHash('sha256').update(`${filePath}:${start}:${end}`).digest('hex').slice(0, 16),
                filePath,
                startLine: start,
                endLine: end,
                content: blockText,
                tokenCount: estimateTokens(blockText),
                language,
            });
        }
        else {
            // Split oversized block into sub-chunks
            let subStart = start;
            while (subStart < end) {
                let subEnd = subStart;
                let charCount = 0;
                while (subEnd < end && charCount < CHUNK_IDEAL_CHARS) {
                    charCount += (lines[subEnd]?.length || 0) + 1;
                    subEnd++;
                }
                if (subEnd === subStart)
                    subEnd = Math.min(subStart + 1, end);
                const subText = lines.slice(subStart, subEnd).join('\n');
                if (subText.trim().length > 0) {
                    chunks.push({
                        id: crypto.createHash('sha256').update(`${filePath}:${subStart}:${subEnd}`).digest('hex').slice(0, 16),
                        filePath,
                        startLine: subStart,
                        endLine: subEnd,
                        content: subText,
                        tokenCount: estimateTokens(subText),
                        language,
                    });
                }
                subStart = subEnd;
            }
        }
    }
    return chunks;
}
// ==================== TF-IDF Vectorizer ====================
const VECTOR_DIMS = 768;
// Character n-gram extraction
function extractTrigrams(text) {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ');
    const counts = new Map();
    for (let i = 0; i < normalized.length - 2; i++) {
        const gram = normalized.slice(i, i + 3);
        counts.set(gram, (counts.get(gram) || 0) + 1);
    }
    return counts;
}
// Simple hash function for trigram → dimension index
function hashGram(gram, dims) {
    let h = 0;
    for (let i = 0; i < gram.length; i++) {
        h = ((h << 5) - h + gram.charCodeAt(i)) | 0;
    }
    return ((h % dims) + dims) % dims;
}
function buildVocabulary(chunks) {
    const df = new Uint32Array(VECTOR_DIMS);
    for (const chunk of chunks) {
        const grams = extractTrigrams(chunk.content);
        const seenInDoc = new Set();
        for (const gram of grams.keys()) {
            const dim = hashGram(gram, VECTOR_DIMS);
            if (!seenInDoc.has(dim)) {
                seenInDoc.add(dim);
                df[dim]++;
            }
        }
    }
    return { df, totalDocs: chunks.length };
}
function textToVector(text, df, totalDocs) {
    const tf = new Float32Array(VECTOR_DIMS);
    const grams = extractTrigrams(text);
    for (const [gram, count] of grams) {
        const dim = hashGram(gram, VECTOR_DIMS);
        const docFreq = df[dim] || 1;
        const idf = Math.log((totalDocs + 1) / (docFreq + 1)) + 1;
        tf[dim] += count * idf;
    }
    // L2 normalize
    let norm = 0;
    for (let i = 0; i < VECTOR_DIMS; i++) {
        norm += tf[i] * tf[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < VECTOR_DIMS; i++) {
            tf[i] /= norm;
        }
    }
    return tf;
}
// ==================== Storage ====================
function getVectorDir(rootPath, projectName) {
    // projectName may be a full path (e.g. from currentProject state), extract basename
    const name = path.basename(projectName);
    return path.join(rootPath, 'vectors', name);
}
function getIndexPath(rootPath, projectName) {
    return path.join(getVectorDir(rootPath, projectName), 'index.json');
}
function getEmbeddingsPath(rootPath, projectName) {
    return path.join(getVectorDir(rootPath, projectName), 'embeddings.bin');
}
function saveEmbeddings(filePath, vectors) {
    if (vectors.length === 0) {
        fs.writeFileSync(filePath, Buffer.alloc(0));
        return;
    }
    const dims = vectors[0].length;
    const count = vectors.length;
    const header = Buffer.alloc(8);
    header.writeUInt32LE(dims, 0);
    header.writeUInt32LE(count, 4);
    const body = Buffer.alloc(count * dims * 4);
    for (let i = 0; i < count; i++) {
        const vec = vectors[i];
        for (let j = 0; j < dims; j++) {
            body.writeFloatLE(vec[j], (i * dims + j) * 4);
        }
    }
    fs.writeFileSync(filePath, Buffer.concat([header, body]));
}
function loadEmbeddings(filePath) {
    if (!fs.existsSync(filePath))
        return [];
    const data = fs.readFileSync(filePath);
    if (data.length < 8)
        return [];
    const dims = data.readUInt32LE(0);
    const count = data.readUInt32LE(4);
    if (data.length < 8 + count * dims * 4)
        return [];
    const vectors = [];
    for (let i = 0; i < count; i++) {
        const vec = new Float32Array(dims);
        for (let j = 0; j < dims; j++) {
            vec[j] = data.readFloatLE(8 + (i * dims + j) * 4);
        }
        vectors.push(vec);
    }
    return vectors;
}
// ==================== Search ====================
function cosineSimilarity(a, b) {
    const dims = a.length;
    let dot = 0;
    for (let i = 0; i < dims; i++) {
        dot += a[i] * b[i];
    }
    // Both vectors are already L2-normalized, so dot product = cosine similarity
    return Math.max(0, Math.min(1, dot));
}
// ==================== BM25 Scoring ====================
// BM25 parameters
const BM25_K1 = 1.5;
const BM25_B = 0.75;
function buildBM25Stats(chunks) {
    const df = new Uint32Array(VECTOR_DIMS);
    const docLengths = [];
    let totalLen = 0;
    for (const chunk of chunks) {
        const grams = extractTrigrams(chunk.content);
        docLengths.push(chunk.content.length);
        totalLen += chunk.content.length;
        const seenInDoc = new Set();
        for (const gram of grams.keys()) {
            const dim = hashGram(gram, VECTOR_DIMS);
            if (!seenInDoc.has(dim)) {
                seenInDoc.add(dim);
                df[dim]++;
            }
        }
    }
    return {
        docLengths,
        avgDocLen: chunks.length > 0 ? totalLen / chunks.length : 1,
        df,
        totalDocs: chunks.length,
    };
}
function bm25Score(queryText, docText, stats, docIndex) {
    const queryGrams = extractTrigrams(queryText);
    const docGrams = extractTrigrams(docText);
    const docLen = stats.docLengths[docIndex] || 1;
    let score = 0;
    for (const [gram, qtf] of queryGrams) {
        const dim = hashGram(gram, VECTOR_DIMS);
        const df = stats.df[dim] || 0;
        const idf = Math.log((stats.totalDocs - df + 0.5) / (df + 0.5) + 1);
        const dtf = docGrams.get(gram) || 0;
        if (dtf === 0)
            continue;
        const numerator = dtf * (BM25_K1 + 1);
        const denominator = dtf + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / stats.avgDocLen));
        score += idf * (numerator / denominator);
    }
    return score;
}
function reciprocalRankFusion(vectorResults, bm25Results, k = 60) {
    const combined = new Map();
    for (let rank = 0; rank < vectorResults.length; rank++) {
        const r = vectorResults[rank];
        combined.set(r.index, { vectorScore: r.score, bm25Score: 0, vectorRank: rank + 1, bm25Rank: Infinity });
    }
    for (let rank = 0; rank < bm25Results.length; rank++) {
        const r = bm25Results[rank];
        const entry = combined.get(r.index);
        if (entry) {
            entry.bm25Score = r.score;
            entry.bm25Rank = rank + 1;
        }
        else {
            combined.set(r.index, { vectorScore: 0, bm25Score: r.score, vectorRank: Infinity, bm25Rank: rank + 1 });
        }
    }
    const results = [];
    for (const [index, s] of combined) {
        const vRank = s.vectorRank < Infinity ? 1 / (k + s.vectorRank) : 0;
        const bRank = s.bm25Rank < Infinity ? 1 / (k + s.bm25Rank) : 0;
        results.push({
            chunkIndex: index,
            vectorScore: s.vectorScore,
            bm25Score: s.bm25Score,
            combinedScore: vRank * 0.5 + bRank * 0.5 + s.vectorScore * 0.01 + s.bm25Score * 0.001,
        });
    }
    results.sort((a, b) => b.combinedScore - a.combinedScore);
    return results;
}
// ==================== Public API ====================
async function buildVectorIndex(rootPath, workingCopyPath, commitId, projectName, filePaths, onProgress) {
    try {
        const dir = getVectorDir(rootPath, projectName);
        await fs.ensureDir(dir);
        // Collect files
        const report = (msg) => onProgress?.(msg);
        report('Scanning project files...');
        let allFiles = [];
        if (filePaths && filePaths.length > 0) {
            allFiles = filePaths.filter(p => {
                try {
                    const stat = fs.statSync(p);
                    return stat.isFile();
                }
                catch {
                    return false;
                }
            });
        }
        else {
            // Walk the working copy, skipping common non-source dirs
            const skipDirs = new Set(['node_modules', '.git', '.dbvs', '__pycache__', 'dist', 'build',
                '.next', '.nuxt', 'target', 'bin', 'obj', 'vendor', '.venv', 'venv', 'env']);
            const walkDir = (dirPath) => {
                try {
                    for (const entry of fs.readdirSync(dirPath)) {
                        if (skipDirs.has(entry))
                            continue;
                        const fullPath = path.join(dirPath, entry);
                        try {
                            const stat = fs.statSync(fullPath);
                            if (stat.isDirectory()) {
                                walkDir(fullPath);
                            }
                            else if (stat.isFile() && stat.size < 500000) {
                                allFiles.push(fullPath);
                            }
                        }
                        catch { /* skip inaccessible */ }
                    }
                }
                catch { /* skip inaccessible dir */ }
            };
            walkDir(workingCopyPath);
        }
        if (allFiles.length === 0) {
            return { success: false, message: 'No files found to index' };
        }
        // Chunk files
        report(`Chunking ${allFiles.length} files...`);
        const allChunks = [];
        let totalTokens = 0;
        const sourceExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.go',
            '.rs', '.cpp', '.c', '.h', '.rb', '.php', '.kt', '.swift', '.dart', '.lua',
            '.md', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.sql', '.sh']);
        let fileIndex = 0;
        for (const filePath of allFiles) {
            const ext = path.extname(filePath).toLowerCase();
            if (!sourceExts.has(ext))
                continue;
            fileIndex++;
            try {
                const relPath = path.relative(workingCopyPath, filePath).replace(/\\/g, '/');
                const content = fs.readFileSync(filePath, 'utf-8');
                if (content.trim().length === 0)
                    continue;
                report(`[${fileIndex}/${allFiles.length}] ${relPath}`);
                const chunks = chunkFile(filePath, content);
                for (const chunk of chunks) {
                    totalTokens += chunk.tokenCount;
                }
                allChunks.push(...chunks);
            }
            catch { /* skip unreadable files */ }
        }
        if (allChunks.length === 0) {
            return { success: false, message: 'No chunkable content found in files' };
        }
        // Build vocabulary
        report(`Building vocabulary from ${allChunks.length} chunks...`);
        const { df, totalDocs } = buildVocabulary(allChunks);
        // Vectorize all chunks
        report(`Vectorizing ${allChunks.length} chunks (${VECTOR_DIMS} dimensions)...`);
        const vectors = [];
        for (let i = 0; i < allChunks.length; i++) {
            vectors.push(textToVector(allChunks[i].content, df, totalDocs));
            if (i % 500 === 0 && i > 0) {
                report(`Vectorized ${i}/${allChunks.length} chunks...`);
            }
        }
        // Save index metadata + chunks
        const fileSet = new Set(allChunks.map(c => c.filePath));
        const index = {
            schemaVersion: 1,
            projectName,
            commitId,
            model: 'tfidf-v1',
            dimensions: VECTOR_DIMS,
            totalChunks: allChunks.length,
            totalFiles: fileSet.size,
            totalTokens,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const stored = { meta: index, chunks: allChunks };
        fs.writeFileSync(getIndexPath(rootPath, projectName), JSON.stringify(stored, null, 2), 'utf-8');
        // Save embeddings binary
        saveEmbeddings(getEmbeddingsPath(rootPath, projectName), vectors);
        report(`Index built: ${index.totalChunks} chunks, ${index.totalFiles} files, ${index.totalTokens} tokens`);
        return { success: true, index };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
async function getVectorStatus(rootPath, projectName) {
    try {
        const indexPath = getIndexPath(rootPath, projectName);
        if (!fs.existsSync(indexPath)) {
            return { success: true, index: undefined };
        }
        const stored = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        return { success: true, index: stored.meta };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
async function deleteVectorIndex(rootPath, projectName) {
    try {
        const dir = getVectorDir(rootPath, projectName);
        if (fs.existsSync(dir)) {
            fs.removeSync(dir);
        }
        return { success: true, message: 'Vector index deleted' };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
async function searchVectors(rootPath, projectName, query) {
    try {
        const indexPath = getIndexPath(rootPath, projectName);
        const embeddingsPath = getEmbeddingsPath(rootPath, projectName);
        if (!fs.existsSync(indexPath) || !fs.existsSync(embeddingsPath)) {
            return { success: false, results: [], message: 'Vector index not found. Build index first.' };
        }
        const stored = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        const vectors = loadEmbeddings(embeddingsPath);
        if (vectors.length !== stored.chunks.length) {
            return { success: false, results: [], message: 'Index data mismatch. Rebuild index.' };
        }
        const topK = query.topK || 10;
        const minSimilarity = query.minSimilarity || 0.0;
        const mode = query.searchMode || 'hybrid';
        // Build vocabulary for vector search
        const { df, totalDocs } = buildVocabulary(stored.chunks);
        const queryVec = textToVector(query.text, df, totalDocs);
        // Pre-filter chunks
        const validIndices = [];
        for (let i = 0; i < stored.chunks.length; i++) {
            const chunk = stored.chunks[i];
            if (query.fileTypes && query.fileTypes.length > 0) {
                const ext = path.extname(chunk.filePath).toLowerCase();
                if (!query.fileTypes.some(t => ext === t || ext === `.${t}`))
                    continue;
            }
            if (query.nodeId && chunk.nodeId !== query.nodeId)
                continue;
            validIndices.push(i);
        }
        let results;
        if (mode === 'vector') {
            const scored = [];
            for (const i of validIndices) {
                const sim = cosineSimilarity(queryVec, vectors[i]);
                if (sim >= minSimilarity)
                    scored.push({ index: i, similarity: sim });
            }
            scored.sort((a, b) => b.similarity - a.similarity);
            results = scored.slice(0, topK).map((s, rank) => ({
                chunk: stored.chunks[s.index],
                similarity: Math.round(s.similarity * 10000) / 10000,
                rank: rank + 1,
            }));
        }
        else if (mode === 'bm25') {
            // Pure BM25
            const stats = buildBM25Stats(stored.chunks);
            const scored = [];
            for (const i of validIndices) {
                const score = bm25Score(query.text, stored.chunks[i].content, stats, i);
                if (score > 0)
                    scored.push({ index: i, similarity: score });
            }
            // Normalize BM25 scores to 0-1 range
            const maxScore = scored.length > 0 ? Math.max(...scored.map(s => s.similarity)) : 1;
            if (maxScore > 0)
                scored.forEach(s => { s.similarity /= maxScore; });
            scored.sort((a, b) => b.similarity - a.similarity);
            results = scored.slice(0, topK).map((s, rank) => ({
                chunk: stored.chunks[s.index],
                similarity: Math.round(s.similarity * 10000) / 10000,
                rank: rank + 1,
            }));
        }
        else {
            // Hybrid: RRF fusion of vector + BM25
            const stats = buildBM25Stats(stored.chunks);
            const vectorScored = [];
            for (const i of validIndices) {
                const sim = cosineSimilarity(queryVec, vectors[i]);
                if (sim >= minSimilarity * 0.5)
                    vectorScored.push({ index: i, score: sim });
            }
            vectorScored.sort((a, b) => b.score - a.score);
            // BM25 top candidates
            const bm25Scored = [];
            for (const i of validIndices) {
                const score = bm25Score(query.text, stored.chunks[i].content, stats, i);
                if (score > 0)
                    bm25Scored.push({ index: i, score });
            }
            bm25Scored.sort((a, b) => b.score - a.score);
            // Reciprocal rank fusion
            const fused = reciprocalRankFusion(vectorScored.slice(0, 200), bm25Scored.slice(0, 200));
            results = fused.slice(0, topK).map((s, rank) => ({
                chunk: stored.chunks[s.chunkIndex],
                similarity: Math.round(s.combinedScore * 10000) / 10000,
                rank: rank + 1,
            }));
        }
        return { success: true, results };
    }
    catch (error) {
        return { success: false, results: [], message: String(error) };
    }
}
async function searchBatchVectors(rootPath, projectName, queries) {
    const allResults = [];
    for (const query of queries) {
        const r = await searchVectors(rootPath, projectName, query);
        allResults.push(r.success ? r.results : []);
    }
    return { success: true, results: allResults };
}
async function getIndexedFiles(rootPath, projectName) {
    try {
        const indexPath = getIndexPath(rootPath, projectName);
        if (!fs.existsSync(indexPath)) {
            return { success: true, files: [] };
        }
        const stored = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        const fileMap = new Map();
        for (const chunk of stored.chunks) {
            const existing = fileMap.get(chunk.filePath);
            if (existing) {
                existing.chunks++;
                existing.chars += chunk.content.length;
            }
            else {
                fileMap.set(chunk.filePath, { chunks: 1, chars: chunk.content.length, lang: chunk.language });
            }
        }
        const files = [];
        for (const [filePath, info] of fileMap) {
            files.push({ filePath, chunkCount: info.chunks, totalChars: info.chars, language: info.lang });
        }
        files.sort((a, b) => a.filePath.localeCompare(b.filePath));
        return { success: true, files };
    }
    catch (error) {
        return { success: false, files: [], message: String(error) };
    }
}
async function getFileChunks(rootPath, projectName, filePath) {
    try {
        const indexPath = getIndexPath(rootPath, projectName);
        if (!fs.existsSync(indexPath)) {
            return { success: true, chunks: [] };
        }
        const stored = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        const normalizedPath = filePath.replace(/\\/g, '/');
        const chunks = stored.chunks.filter(c => c.filePath.replace(/\\/g, '/') === normalizedPath);
        chunks.sort((a, b) => a.startLine - b.startLine);
        return { success: true, chunks };
    }
    catch (error) {
        return { success: false, chunks: [], message: String(error) };
    }
}
async function removeFilesFromIndex(rootPath, workingCopyPath, commitId, projectName, filePaths, onProgress) {
    try {
        const indexPath = getIndexPath(rootPath, projectName);
        if (!fs.existsSync(indexPath)) {
            return { success: false, message: 'No index found' };
        }
        const stored = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        const removeSet = new Set(filePaths.map(p => p.replace(/\\/g, '/')));
        const keptChunks = stored.chunks.filter(c => !removeSet.has(c.filePath.replace(/\\/g, '/')));
        const removedCount = stored.chunks.length - keptChunks.length;
        if (removedCount === 0) {
            return { success: true, index: stored.meta, message: 'No matching files found in index' };
        }
        // Rebuild vectors
        const report = (msg) => onProgress?.(msg);
        report(`Removing ${removedCount} chunks (${removeSet.size} files)...`);
        const { df, totalDocs } = buildVocabulary(keptChunks);
        report(`Re-vectorizing ${keptChunks.length} remaining chunks...`);
        const vectors = [];
        for (let i = 0; i < keptChunks.length; i++) {
            vectors.push(textToVector(keptChunks[i].content, df, totalDocs));
            if (i % 500 === 0 && i > 0) {
                report(`Re-vectorized ${i}/${keptChunks.length}...`);
            }
        }
        const fileSet = new Set(keptChunks.map(c => c.filePath));
        let totalTokens = 0;
        for (const c of keptChunks)
            totalTokens += c.tokenCount;
        const index = {
            ...stored.meta,
            totalChunks: keptChunks.length,
            totalFiles: fileSet.size,
            totalTokens,
            updatedAt: new Date().toISOString(),
        };
        const newStored = { meta: index, chunks: keptChunks };
        fs.writeFileSync(indexPath, JSON.stringify(newStored, null, 2), 'utf-8');
        saveEmbeddings(getEmbeddingsPath(rootPath, projectName), vectors);
        report(`Removed ${removeSet.size} files, ${keptChunks.length} chunks remaining`);
        return { success: true, index };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
async function ingestFiles(rootPath, filePaths, projectName, commitId, onProgress) {
    const dir = getVectorDir(rootPath, projectName);
    await fs.ensureDir(dir);
    const indexPath = getIndexPath(rootPath, projectName);
    const embeddingsPath = getEmbeddingsPath(rootPath, projectName);
    const fileResults = [];
    const allNewChunks = [];
    let filesSucceeded = 0;
    let filesFailed = 0;
    const supportedExts = new Set(file_parser_1.SUPPORTED_INGEST_EXTENSIONS.map(e => e.extension));
    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        if (!supportedExts.has(ext)) {
            fileResults.push({ name: fileName, success: false, chunksAdded: 0, error: `Unsupported format: ${ext}` });
            filesFailed++;
            continue;
        }
        if (!fs.existsSync(filePath)) {
            fileResults.push({ name: fileName, success: false, chunksAdded: 0, error: 'File not found' });
            filesFailed++;
            continue;
        }
        const stat = fs.statSync(filePath);
        if (stat.size > 500000) {
            fileResults.push({ name: fileName, success: false, chunksAdded: 0, error: 'File too large (>500KB)' });
            filesFailed++;
            continue;
        }
        onProgress?.(`[${i + 1}/${filePaths.length}] Parsing: ${fileName}`);
        const parseResult = await (0, file_parser_1.parseFileToText)(filePath);
        if (!parseResult.success || !parseResult.text) {
            fileResults.push({ name: fileName, success: false, chunksAdded: 0, error: parseResult.error || 'Empty content' });
            filesFailed++;
            continue;
        }
        onProgress?.(`[${i + 1}/${filePaths.length}] Chunking: ${fileName} (${parseResult.text.length} chars)`);
        // Use the file path as-is for tracking; normalize to forward slashes
        const virtualPath = filePath.replace(/\\/g, '/');
        const chunks = chunkFile(virtualPath, parseResult.text);
        allNewChunks.push(...chunks);
        fileResults.push({ name: fileName, success: true, chunksAdded: chunks.length });
        filesSucceeded++;
    }
    if (allNewChunks.length === 0) {
        return {
            success: filesFailed === 0,
            result: {
                projectName, filesProcessed: filePaths.length,
                filesSucceeded, filesFailed, totalChunksAdded: 0, fileResults,
            },
            message: filesFailed > 0 ? 'No files could be ingested' : 'No new chunks produced',
        };
    }
    onProgress?.(`Merging ${allNewChunks.length} new chunks with existing index...`);
    // Load existing index if any
    let existingChunks = [];
    if (fs.existsSync(indexPath)) {
        try {
            const stored = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            existingChunks = stored.chunks || [];
        }
        catch { /* start fresh */ }
    }
    const allChunks = [...existingChunks, ...allNewChunks];
    onProgress?.(`Rebuilding vocabulary for ${allChunks.length} total chunks...`);
    const { df } = buildVocabulary(allChunks);
    onProgress?.(`Vectorizing...`);
    const total = allChunks.length;
    const vectors = [];
    for (let i = 0; i < total; i++) {
        vectors.push(textToVector(allChunks[i].content, df, total));
        if ((i + 1) % 200 === 0)
            onProgress?.(`Vectorized ${i + 1}/${total} chunks`);
    }
    const totalTokens = allChunks.reduce((sum, c) => sum + c.tokenCount, 0);
    const uniqueFiles = new Set(allChunks.map(c => c.filePath)).size;
    const meta = {
        schemaVersion: 1,
        projectName,
        commitId,
        model: 'tfidf-v1',
        dimensions: VECTOR_DIMS,
        totalChunks: allChunks.length,
        totalFiles: uniqueFiles,
        totalTokens,
        createdAt: existingChunks.length > 0
            ? JSON.parse(fs.readFileSync(indexPath, 'utf-8')).meta.createdAt
            : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    const stored = { meta, chunks: allChunks };
    fs.writeFileSync(indexPath, JSON.stringify(stored, null, 2));
    const dimsBuf = Buffer.alloc(8);
    dimsBuf.writeUInt32LE(VECTOR_DIMS, 0);
    dimsBuf.writeUInt32LE(vectors.length, 4);
    const vecsBuf = Buffer.concat([dimsBuf, ...vectors.map(v => Buffer.from(v.buffer))]);
    fs.writeFileSync(embeddingsPath, vecsBuf);
    onProgress?.(`Done: ${allChunks.length} chunks indexed (${uniqueFiles} files, ${totalTokens.toLocaleString()} tokens)`);
    return {
        success: true,
        result: {
            projectName,
            filesProcessed: filePaths.length,
            filesSucceeded,
            filesFailed,
            totalChunksAdded: allNewChunks.length,
            fileResults,
            updatedIndex: meta,
        },
    };
}
function getSupportedExtensions() {
    return { extensions: file_parser_1.SUPPORTED_INGEST_EXTENSIONS };
}
async function exportVectorIndex(rootPath, projectName) {
    try {
        const indexPath = getIndexPath(rootPath, projectName);
        const embeddingsPath = getEmbeddingsPath(rootPath, projectName);
        if (!fs.existsSync(indexPath)) {
            return { success: false, message: 'No index found to export' };
        }
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        const embeddingsBuffer = fs.existsSync(embeddingsPath)
            ? fs.readFileSync(embeddingsPath).toString('base64')
            : '';
        const exportData = JSON.stringify({
            exportedAt: new Date().toISOString(),
            format: 'dbht-vector-export-v1',
            projectName,
            index: JSON.parse(indexContent),
            embeddingsBase64: embeddingsBuffer,
        });
        return { success: true, data: exportData };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
async function importVectorIndex(rootPath, projectName, data) {
    try {
        const parsed = JSON.parse(data);
        if (parsed.format !== 'dbht-vector-export-v1' || !parsed.index) {
            return { success: false, message: 'Invalid export format' };
        }
        const dir = getVectorDir(rootPath, projectName);
        await fs.ensureDir(dir);
        // Restore index
        const stored = parsed.index;
        fs.writeFileSync(getIndexPath(rootPath, projectName), JSON.stringify(stored, null, 2), 'utf-8');
        // Restore embeddings
        if (parsed.embeddingsBase64) {
            const buf = Buffer.from(parsed.embeddingsBase64, 'base64');
            fs.writeFileSync(getEmbeddingsPath(rootPath, projectName), buf);
        }
        return { success: true, index: stored.meta };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
// ==================== RAG integration ====================
async function enhanceRagContext(rootPath, projectName, query, topK = 5) {
    const result = await searchVectors(rootPath, projectName, {
        text: query,
        topK,
        minSimilarity: 0.3,
    });
    return {
        success: result.success,
        vectorResults: result.results,
        message: result.message,
    };
}
