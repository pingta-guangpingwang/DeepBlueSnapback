import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import { parseFileToText, isBinaryFormat, SUPPORTED_INGEST_EXTENSIONS, type SupportedExtension } from './file-parser'

// ==================== Types ====================

export interface VectorChunk {
  id: string
  filePath: string
  startLine: number
  endLine: number
  content: string
  tokenCount: number
  language: string
  nodeId?: string
}

export interface VectorIndex {
  schemaVersion: number
  projectName: string
  commitId: string
  model: string
  dimensions: number
  totalChunks: number
  totalFiles: number
  totalTokens: number
  createdAt: string
  updatedAt: string
}

export interface StoredIndex {
  meta: VectorIndex
  chunks: VectorChunk[]
}

export interface VectorQuery {
  text: string
  topK?: number
  minSimilarity?: number
  fileTypes?: string[]
  nodeId?: string
}

export interface VectorSearchResult {
  chunk: VectorChunk
  similarity: number
  rank: number
}

export type VectorProgressFn = (msg: string) => void

// ==================== Text Chunking ====================

const CHUNK_MAX_CHARS = 2000
const CHUNK_IDEAL_CHARS = 1200

// Regex for function/class/method boundaries across common languages
const BLOCK_BOUNDARY = /^(\s*)(export\s+)?(async\s+)?(function\s+|class\s+|def\s+|func\s+|fn\s+|public\s+|private\s+|protected\s+|static\s+|\/\/\/\s*|###+\s|##\s|#\s)/m

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'tsx', '.js': 'javascript', '.jsx': 'jsx',
    '.py': 'python', '.java': 'java', '.cs': 'csharp', '.go': 'go',
    '.rs': 'rust', '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
    '.rb': 'ruby', '.php': 'php', '.kt': 'kotlin', '.swift': 'swift',
    '.dart': 'dart', '.lua': 'lua', '.md': 'markdown', '.json': 'json',
    '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml', '.html': 'html',
    '.css': 'css', '.scss': 'scss', '.sql': 'sql', '.sh': 'bash',
    '.bat': 'batch', '.ps1': 'powershell', '.toml': 'toml', '.ini': 'ini',
  }
  return map[ext] || ext.slice(1) || 'text'
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

function chunkFile(filePath: string, content: string): VectorChunk[] {
  const language = detectLanguage(filePath)
  const lines = content.split('\n')
  const chunks: VectorChunk[] = []

  // Find block boundaries
  const boundaries = [0]
  for (let i = 1; i < lines.length; i++) {
    if (BLOCK_BOUNDARY.test(lines[i])) {
      boundaries.push(i)
    }
  }
  boundaries.push(lines.length)

  // Merge small adjacent blocks
  const merged: number[] = [0]
  for (let i = 1; i < boundaries.length; i++) {
    const prevEnd = boundaries[i - 1]
    const currEnd = boundaries[i]
    const blockText = lines.slice(prevEnd, currEnd).join('\n')
    // Don't split very short blocks; merge with previous
    if (blockText.length < 200 && merged.length > 1 && i < boundaries.length - 1) {
      // skip this boundary (merge)
      continue
    }
    merged.push(currEnd)
  }

  // Actually, don't merge — just use boundaries as split points
  // and split large blocks further
  const splitPoints = [0]
  for (const b of boundaries.slice(1, -1)) {
    splitPoints.push(b)
  }
  splitPoints.push(lines.length)

  // Build chunks from split points, splitting oversized ones
  for (let i = 0; i < splitPoints.length - 1; i++) {
    const start = splitPoints[i]
    const end = splitPoints[i + 1]
    const blockLines = lines.slice(start, end)
    const blockText = blockLines.join('\n')

    if (blockText.trim().length === 0) continue

    if (blockText.length <= CHUNK_MAX_CHARS) {
      chunks.push({
        id: crypto.createHash('sha256').update(`${filePath}:${start}:${end}`).digest('hex').slice(0, 16),
        filePath,
        startLine: start,
        endLine: end,
        content: blockText,
        tokenCount: estimateTokens(blockText),
        language,
      })
    } else {
      // Split oversized block into sub-chunks
      let subStart = start
      while (subStart < end) {
        let subEnd = subStart
        let charCount = 0
        while (subEnd < end && charCount < CHUNK_IDEAL_CHARS) {
          charCount += (lines[subEnd]?.length || 0) + 1
          subEnd++
        }
        if (subEnd === subStart) subEnd = Math.min(subStart + 1, end)
        const subText = lines.slice(subStart, subEnd).join('\n')
        if (subText.trim().length > 0) {
          chunks.push({
            id: crypto.createHash('sha256').update(`${filePath}:${subStart}:${subEnd}`).digest('hex').slice(0, 16),
            filePath,
            startLine: subStart,
            endLine: subEnd,
            content: subText,
            tokenCount: estimateTokens(subText),
            language,
          })
        }
        subStart = subEnd
      }
    }
  }

  return chunks
}

// ==================== TF-IDF Vectorizer ====================

const VECTOR_DIMS = 768

// Character n-gram extraction
function extractTrigrams(text: string): Map<string, number> {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ')
  const counts = new Map<string, number>()
  for (let i = 0; i < normalized.length - 2; i++) {
    const gram = normalized.slice(i, i + 3)
    counts.set(gram, (counts.get(gram) || 0) + 1)
  }
  return counts
}

// Simple hash function for trigram → dimension index
function hashGram(gram: string, dims: number): number {
  let h = 0
  for (let i = 0; i < gram.length; i++) {
    h = ((h << 5) - h + gram.charCodeAt(i)) | 0
  }
  return ((h % dims) + dims) % dims
}

function buildVocabulary(chunks: VectorChunk[]): { df: Uint32Array; totalDocs: number } {
  const df = new Uint32Array(VECTOR_DIMS)
  for (const chunk of chunks) {
    const grams = extractTrigrams(chunk.content)
    const seenInDoc = new Set<number>()
    for (const gram of grams.keys()) {
      const dim = hashGram(gram, VECTOR_DIMS)
      if (!seenInDoc.has(dim)) {
        seenInDoc.add(dim)
        df[dim]++
      }
    }
  }
  return { df, totalDocs: chunks.length }
}

function textToVector(text: string, df: Uint32Array, totalDocs: number): Float32Array {
  const tf = new Float32Array(VECTOR_DIMS)
  const grams = extractTrigrams(text)

  for (const [gram, count] of grams) {
    const dim = hashGram(gram, VECTOR_DIMS)
    const docFreq = df[dim] || 1
    const idf = Math.log((totalDocs + 1) / (docFreq + 1)) + 1
    tf[dim] += count * idf
  }

  // L2 normalize
  let norm = 0
  for (let i = 0; i < VECTOR_DIMS; i++) {
    norm += tf[i] * tf[i]
  }
  norm = Math.sqrt(norm)
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIMS; i++) {
      tf[i] /= norm
    }
  }
  return tf
}

// ==================== Storage ====================

function getVectorDir(rootPath: string, projectName: string): string {
  return path.join(rootPath, 'vectors', projectName)
}

function getIndexPath(rootPath: string, projectName: string): string {
  return path.join(getVectorDir(rootPath, projectName), 'index.json')
}

function getEmbeddingsPath(rootPath: string, projectName: string): string {
  return path.join(getVectorDir(rootPath, projectName), 'embeddings.bin')
}

function saveEmbeddings(filePath: string, vectors: Float32Array[]): void {
  if (vectors.length === 0) {
    fs.writeFileSync(filePath, Buffer.alloc(0))
    return
  }

  const dims = vectors[0].length
  const count = vectors.length
  const header = Buffer.alloc(8)
  header.writeUInt32LE(dims, 0)
  header.writeUInt32LE(count, 4)

  const body = Buffer.alloc(count * dims * 4)
  for (let i = 0; i < count; i++) {
    const vec = vectors[i]
    for (let j = 0; j < dims; j++) {
      body.writeFloatLE(vec[j], (i * dims + j) * 4)
    }
  }

  fs.writeFileSync(filePath, Buffer.concat([header, body]))
}

function loadEmbeddings(filePath: string): Float32Array[] {
  if (!fs.existsSync(filePath)) return []

  const data = fs.readFileSync(filePath)
  if (data.length < 8) return []

  const dims = data.readUInt32LE(0)
  const count = data.readUInt32LE(4)

  if (data.length < 8 + count * dims * 4) return []

  const vectors: Float32Array[] = []
  for (let i = 0; i < count; i++) {
    const vec = new Float32Array(dims)
    for (let j = 0; j < dims; j++) {
      vec[j] = data.readFloatLE(8 + (i * dims + j) * 4)
    }
    vectors.push(vec)
  }
  return vectors
}

// ==================== Search ====================

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const dims = a.length
  let dot = 0
  for (let i = 0; i < dims; i++) {
    dot += a[i] * b[i]
  }
  // Both vectors are already L2-normalized, so dot product = cosine similarity
  return Math.max(0, Math.min(1, dot))
}

// ==================== Public API ====================

export async function buildVectorIndex(
  rootPath: string,
  workingCopyPath: string,
  commitId: string,
  projectName: string,
  filePaths?: string[],
  onProgress?: VectorProgressFn,
): Promise<{ success: boolean; index?: VectorIndex; message?: string }> {
  try {
    const dir = getVectorDir(rootPath, projectName)
    await fs.ensureDir(dir)

    // Collect files
    const report = (msg: string) => onProgress?.(msg)

    report('Scanning project files...')
    let allFiles: string[] = []

    if (filePaths && filePaths.length > 0) {
      allFiles = filePaths.filter(p => {
        try {
          const stat = fs.statSync(p)
          return stat.isFile()
        } catch { return false }
      })
    } else {
      // Walk the working copy, skipping common non-source dirs
      const skipDirs = new Set(['node_modules', '.git', '.dbvs', '__pycache__', 'dist', 'build',
        '.next', '.nuxt', 'target', 'bin', 'obj', 'vendor', '.venv', 'venv', 'env'])
      const walkDir = (dirPath: string) => {
        try {
          for (const entry of fs.readdirSync(dirPath)) {
            if (skipDirs.has(entry)) continue
            const fullPath = path.join(dirPath, entry)
            try {
              const stat = fs.statSync(fullPath)
              if (stat.isDirectory()) {
                walkDir(fullPath)
              } else if (stat.isFile() && stat.size < 500_000) {
                allFiles.push(fullPath)
              }
            } catch { /* skip inaccessible */ }
          }
        } catch { /* skip inaccessible dir */ }
      }
      walkDir(workingCopyPath)
    }

    if (allFiles.length === 0) {
      return { success: false, message: 'No files found to index' }
    }

    // Chunk files
    report(`Chunking ${allFiles.length} files...`)
    const allChunks: VectorChunk[] = []
    let totalTokens = 0
    const sourceExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.go',
      '.rs', '.cpp', '.c', '.h', '.rb', '.php', '.kt', '.swift', '.dart', '.lua',
      '.md', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.sql', '.sh'])

    let fileIndex = 0
    for (const filePath of allFiles) {
      const ext = path.extname(filePath).toLowerCase()
      if (!sourceExts.has(ext)) continue
      fileIndex++
      try {
        const relPath = path.relative(workingCopyPath, filePath).replace(/\\/g, '/')
        const content = fs.readFileSync(filePath, 'utf-8')
        if (content.trim().length === 0) continue
        report(`[${fileIndex}/${allFiles.length}] ${relPath}`)
        const chunks = chunkFile(filePath, content)
        for (const chunk of chunks) {
          totalTokens += chunk.tokenCount
        }
        allChunks.push(...chunks)
      } catch { /* skip unreadable files */ }
    }

    if (allChunks.length === 0) {
      return { success: false, message: 'No chunkable content found in files' }
    }

    // Build vocabulary
    report(`Building vocabulary from ${allChunks.length} chunks...`)
    const { df, totalDocs } = buildVocabulary(allChunks)

    // Vectorize all chunks
    report(`Vectorizing ${allChunks.length} chunks (${VECTOR_DIMS} dimensions)...`)
    const vectors: Float32Array[] = []
    for (let i = 0; i < allChunks.length; i++) {
      vectors.push(textToVector(allChunks[i].content, df, totalDocs))
      if (i % 500 === 0 && i > 0) {
        report(`Vectorized ${i}/${allChunks.length} chunks...`)
      }
    }

    // Save index metadata + chunks
    const fileSet = new Set(allChunks.map(c => c.filePath))
    const index: VectorIndex = {
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
    }

    const stored: StoredIndex = { meta: index, chunks: allChunks }
    fs.writeFileSync(getIndexPath(rootPath, projectName), JSON.stringify(stored, null, 2), 'utf-8')

    // Save embeddings binary
    saveEmbeddings(getEmbeddingsPath(rootPath, projectName), vectors)

    report(`Index built: ${index.totalChunks} chunks, ${index.totalFiles} files, ${index.totalTokens} tokens`)
    return { success: true, index }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

export async function getVectorStatus(
  rootPath: string,
  projectName: string,
): Promise<{ success: boolean; index?: VectorIndex; message?: string }> {
  try {
    const indexPath = getIndexPath(rootPath, projectName)
    if (!fs.existsSync(indexPath)) {
      return { success: true, index: undefined }
    }
    const stored: StoredIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    return { success: true, index: stored.meta }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

export async function deleteVectorIndex(
  rootPath: string,
  projectName: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const dir = getVectorDir(rootPath, projectName)
    if (fs.existsSync(dir)) {
      fs.removeSync(dir)
    }
    return { success: true, message: 'Vector index deleted' }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

export async function searchVectors(
  rootPath: string,
  projectName: string,
  query: VectorQuery,
): Promise<{ success: boolean; results: VectorSearchResult[]; message?: string }> {
  try {
    const indexPath = getIndexPath(rootPath, projectName)
    const embeddingsPath = getEmbeddingsPath(rootPath, projectName)

    if (!fs.existsSync(indexPath) || !fs.existsSync(embeddingsPath)) {
      return { success: false, results: [], message: 'Vector index not found. Build index first.' }
    }

    const stored: StoredIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    const vectors = loadEmbeddings(embeddingsPath)

    if (vectors.length !== stored.chunks.length) {
      return { success: false, results: [], message: 'Index data mismatch. Rebuild index.' }
    }

    const topK = query.topK || 10
    const minSimilarity = query.minSimilarity || 0.0

    // Build a dummy DF for the query vector
    const { df, totalDocs } = buildVocabulary(stored.chunks)
    const queryVec = textToVector(query.text, df, totalDocs)

    // Compute similarities
    type ScoredChunk = { index: number; similarity: number }
    const scored: ScoredChunk[] = []

    for (let i = 0; i < vectors.length; i++) {
      const chunk = stored.chunks[i]

      // Apply filters
      if (query.fileTypes && query.fileTypes.length > 0) {
        const ext = path.extname(chunk.filePath).toLowerCase()
        if (!query.fileTypes.some(t => ext === t || ext === `.${t}`)) continue
      }
      if (query.nodeId && chunk.nodeId !== query.nodeId) continue

      const sim = cosineSimilarity(queryVec, vectors[i])
      if (sim >= minSimilarity) {
        scored.push({ index: i, similarity: sim })
      }
    }

    // Sort by similarity descending
    scored.sort((a, b) => b.similarity - a.similarity)

    const results: VectorSearchResult[] = scored.slice(0, topK).map((s, rank) => ({
      chunk: stored.chunks[s.index],
      similarity: Math.round(s.similarity * 10000) / 10000,
      rank: rank + 1,
    }))

    return { success: true, results }
  } catch (error) {
    return { success: false, results: [], message: String(error) }
  }
}

export async function searchBatchVectors(
  rootPath: string,
  projectName: string,
  queries: VectorQuery[],
): Promise<{ success: boolean; results: VectorSearchResult[][]; message?: string }> {
  const allResults: VectorSearchResult[][] = []
  for (const query of queries) {
    const r = await searchVectors(rootPath, projectName, query)
    allResults.push(r.success ? r.results : [])
  }
  return { success: true, results: allResults }
}

// ==================== File Info ====================

export interface IndexedFileInfo {
  filePath: string
  chunkCount: number
  totalChars: number
  language: string
}

export async function getIndexedFiles(
  rootPath: string,
  projectName: string,
): Promise<{ success: boolean; files: IndexedFileInfo[]; message?: string }> {
  try {
    const indexPath = getIndexPath(rootPath, projectName)
    if (!fs.existsSync(indexPath)) {
      return { success: true, files: [] }
    }
    const stored: StoredIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    const fileMap = new Map<string, { chunks: number; chars: number; lang: string }>()
    for (const chunk of stored.chunks) {
      const existing = fileMap.get(chunk.filePath)
      if (existing) {
        existing.chunks++
        existing.chars += chunk.content.length
      } else {
        fileMap.set(chunk.filePath, { chunks: 1, chars: chunk.content.length, lang: chunk.language })
      }
    }
    const files: IndexedFileInfo[] = []
    for (const [filePath, info] of fileMap) {
      files.push({ filePath, chunkCount: info.chunks, totalChars: info.chars, language: info.lang })
    }
    files.sort((a, b) => a.filePath.localeCompare(b.filePath))
    return { success: true, files }
  } catch (error) {
    return { success: false, files: [], message: String(error) }
  }
}

export async function removeFilesFromIndex(
  rootPath: string,
  workingCopyPath: string,
  commitId: string,
  projectName: string,
  filePaths: string[],
  onProgress?: VectorProgressFn,
): Promise<{ success: boolean; index?: VectorIndex; message?: string }> {
  try {
    const indexPath = getIndexPath(rootPath, projectName)
    if (!fs.existsSync(indexPath)) {
      return { success: false, message: 'No index found' }
    }
    const stored: StoredIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    const removeSet = new Set(filePaths.map(p => p.replace(/\\/g, '/')))
    const keptChunks = stored.chunks.filter(c => !removeSet.has(c.filePath.replace(/\\/g, '/')))
    const removedCount = stored.chunks.length - keptChunks.length
    if (removedCount === 0) {
      return { success: true, index: stored.meta, message: 'No matching files found in index' }
    }
    // Rebuild vectors
    const report = (msg: string) => onProgress?.(msg)
    report(`Removing ${removedCount} chunks (${removeSet.size} files)...`)
    const { df, totalDocs } = buildVocabulary(keptChunks)
    report(`Re-vectorizing ${keptChunks.length} remaining chunks...`)
    const vectors: Float32Array[] = []
    for (let i = 0; i < keptChunks.length; i++) {
      vectors.push(textToVector(keptChunks[i].content, df, totalDocs))
      if (i % 500 === 0 && i > 0) {
        report(`Re-vectorized ${i}/${keptChunks.length}...`)
      }
    }
    const fileSet = new Set(keptChunks.map(c => c.filePath))
    let totalTokens = 0
    for (const c of keptChunks) totalTokens += c.tokenCount

    const index: VectorIndex = {
      ...stored.meta,
      totalChunks: keptChunks.length,
      totalFiles: fileSet.size,
      totalTokens,
      updatedAt: new Date().toISOString(),
    }
    const newStored: StoredIndex = { meta: index, chunks: keptChunks }
    fs.writeFileSync(indexPath, JSON.stringify(newStored, null, 2), 'utf-8')
    saveEmbeddings(getEmbeddingsPath(rootPath, projectName), vectors)
    report(`Removed ${removeSet.size} files, ${keptChunks.length} chunks remaining`)
    return { success: true, index }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

export async function ingestFiles(
  rootPath: string,
  filePaths: string[],
  projectName: string,
  commitId: string,
  onProgress?: VectorProgressFn,
): Promise<{ success: boolean; result?: {
  projectName: string
  filesProcessed: number
  filesSucceeded: number
  filesFailed: number
  totalChunksAdded: number
  fileResults: Array<{ name: string; success: boolean; chunksAdded: number; error?: string }>
  updatedIndex?: VectorIndex
}; message?: string }> {
  const dir = getVectorDir(rootPath, projectName)
  await fs.ensureDir(dir)

  const indexPath = getIndexPath(rootPath, projectName)
  const embeddingsPath = getEmbeddingsPath(rootPath, projectName)

  const fileResults: Array<{ name: string; success: boolean; chunksAdded: number; error?: string }> = []
  const allNewChunks: VectorChunk[] = []
  let filesSucceeded = 0
  let filesFailed = 0

  const supportedExts = new Set(SUPPORTED_INGEST_EXTENSIONS.map(e => e.extension))

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i]
    const fileName = path.basename(filePath)
    const ext = path.extname(filePath).toLowerCase()

    if (!supportedExts.has(ext)) {
      fileResults.push({ name: fileName, success: false, chunksAdded: 0, error: `Unsupported format: ${ext}` })
      filesFailed++
      continue
    }

    if (!fs.existsSync(filePath)) {
      fileResults.push({ name: fileName, success: false, chunksAdded: 0, error: 'File not found' })
      filesFailed++
      continue
    }

    const stat = fs.statSync(filePath)
    if (stat.size > 500000) {
      fileResults.push({ name: fileName, success: false, chunksAdded: 0, error: 'File too large (>500KB)' })
      filesFailed++
      continue
    }

    onProgress?.(`[${i + 1}/${filePaths.length}] Parsing: ${fileName}`)

    const parseResult = await parseFileToText(filePath)
    if (!parseResult.success || !parseResult.text) {
      fileResults.push({ name: fileName, success: false, chunksAdded: 0, error: parseResult.error || 'Empty content' })
      filesFailed++
      continue
    }

    onProgress?.(`[${i + 1}/${filePaths.length}] Chunking: ${fileName} (${parseResult.text.length} chars)`)

    // Use the file path as-is for tracking; normalize to forward slashes
    const virtualPath = filePath.replace(/\\/g, '/')
    const chunks = chunkFile(virtualPath, parseResult.text)
    allNewChunks.push(...chunks)
    fileResults.push({ name: fileName, success: true, chunksAdded: chunks.length })
    filesSucceeded++
  }

  if (allNewChunks.length === 0) {
    return {
      success: filesFailed === 0,
      result: {
        projectName, filesProcessed: filePaths.length,
        filesSucceeded, filesFailed, totalChunksAdded: 0, fileResults,
      },
      message: filesFailed > 0 ? 'No files could be ingested' : 'No new chunks produced',
    }
  }

  onProgress?.(`Merging ${allNewChunks.length} new chunks with existing index...`)

  // Load existing index if any
  let existingChunks: VectorChunk[] = []
  if (fs.existsSync(indexPath)) {
    try {
      const stored: StoredIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      existingChunks = stored.chunks || []
    } catch { /* start fresh */ }
  }

  const allChunks = [...existingChunks, ...allNewChunks]

  onProgress?.(`Rebuilding vocabulary for ${allChunks.length} total chunks...`)
  const { df } = buildVocabulary(allChunks)

  onProgress?.(`Vectorizing...`)
  const total = allChunks.length
  const vectors: Float32Array[] = []
  for (let i = 0; i < total; i++) {
    vectors.push(textToVector(allChunks[i].content, df, total))
    if ((i + 1) % 200 === 0) onProgress?.(`Vectorized ${i + 1}/${total} chunks`)
  }

  const totalTokens = allChunks.reduce((sum, c) => sum + c.tokenCount, 0)
  const uniqueFiles = new Set(allChunks.map(c => c.filePath)).size

  const meta: VectorIndex = {
    schemaVersion: 1,
    projectName,
    commitId,
    model: 'tfidf-v1',
    dimensions: VECTOR_DIMS,
    totalChunks: allChunks.length,
    totalFiles: uniqueFiles,
    totalTokens,
    createdAt: existingChunks.length > 0
      ? (JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as StoredIndex).meta.createdAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const stored: StoredIndex = { meta, chunks: allChunks }
  fs.writeFileSync(indexPath, JSON.stringify(stored, null, 2))

  const dimsBuf = Buffer.alloc(8)
  dimsBuf.writeUInt32LE(VECTOR_DIMS, 0)
  dimsBuf.writeUInt32LE(vectors.length, 4)
  const vecsBuf = Buffer.concat([dimsBuf, ...vectors.map(v => Buffer.from(v.buffer))])
  fs.writeFileSync(embeddingsPath, vecsBuf)

  onProgress?.(`Done: ${allChunks.length} chunks indexed (${uniqueFiles} files, ${totalTokens.toLocaleString()} tokens)`)

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
  }
}

export function getSupportedExtensions(): { extensions: SupportedExtension[] } {
  return { extensions: SUPPORTED_INGEST_EXTENSIONS }
}

export async function exportVectorIndex(
  rootPath: string,
  projectName: string,
): Promise<{ success: boolean; data?: string; message?: string }> {
  try {
    const indexPath = getIndexPath(rootPath, projectName)
    const embeddingsPath = getEmbeddingsPath(rootPath, projectName)
    if (!fs.existsSync(indexPath)) {
      return { success: false, message: 'No index found to export' }
    }
    const indexContent = fs.readFileSync(indexPath, 'utf-8')
    const embeddingsBuffer = fs.existsSync(embeddingsPath)
      ? fs.readFileSync(embeddingsPath).toString('base64')
      : ''
    const exportData = JSON.stringify({
      exportedAt: new Date().toISOString(),
      format: 'dbht-vector-export-v1',
      projectName,
      index: JSON.parse(indexContent),
      embeddingsBase64: embeddingsBuffer,
    })
    return { success: true, data: exportData }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

export async function importVectorIndex(
  rootPath: string,
  projectName: string,
  data: string,
): Promise<{ success: boolean; index?: VectorIndex; message?: string }> {
  try {
    const parsed = JSON.parse(data)
    if (parsed.format !== 'dbht-vector-export-v1' || !parsed.index) {
      return { success: false, message: 'Invalid export format' }
    }
    const dir = getVectorDir(rootPath, projectName)
    await fs.ensureDir(dir)
    // Restore index
    const stored: StoredIndex = parsed.index
    fs.writeFileSync(getIndexPath(rootPath, projectName), JSON.stringify(stored, null, 2), 'utf-8')
    // Restore embeddings
    if (parsed.embeddingsBase64) {
      const buf = Buffer.from(parsed.embeddingsBase64, 'base64')
      fs.writeFileSync(getEmbeddingsPath(rootPath, projectName), buf)
    }
    return { success: true, index: stored.meta }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

// ==================== RAG integration ====================

export async function enhanceRagContext(
  rootPath: string,
  projectName: string,
  query: string,
  topK = 5,
): Promise<{ success: boolean; vectorResults: VectorSearchResult[]; message?: string }> {
  const result = await searchVectors(rootPath, projectName, {
    text: query,
    topK,
    minSimilarity: 0.3,
  })

  return {
    success: result.success,
    vectorResults: result.results,
    message: result.message,
  }
}
