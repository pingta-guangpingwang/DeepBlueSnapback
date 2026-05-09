import * as fs from 'fs-extra'
import * as path from 'path'

const mammoth = require('mammoth')
const PDFParser = require('pdf2json')

export interface SupportedExtension {
  extension: string
  description: string
  category: 'document' | 'data' | 'web' | 'code'
}

export const SUPPORTED_INGEST_EXTENSIONS: SupportedExtension[] = [
  { extension: '.pdf',  description: 'PDF Document',     category: 'document' },
  { extension: '.docx', description: 'Word Document',     category: 'document' },
  { extension: '.txt',  description: 'Plain Text',        category: 'document' },
  { extension: '.md',   description: 'Markdown',          category: 'document' },
  { extension: '.csv',  description: 'CSV Spreadsheet',   category: 'data' },
  { extension: '.json', description: 'JSON Data',         category: 'data' },
  { extension: '.xml',  description: 'XML Document',      category: 'data' },
  { extension: '.yaml', description: 'YAML Config',       category: 'data' },
  { extension: '.yml',  description: 'YAML Config',       category: 'data' },
  { extension: '.toml', description: 'TOML Config',       category: 'data' },
  { extension: '.ini',  description: 'INI Config',        category: 'data' },
  { extension: '.html', description: 'HTML Document',     category: 'web' },
  { extension: '.htm',  description: 'HTML Document',     category: 'web' },
  { extension: '.css',  description: 'CSS Stylesheet',    category: 'web' },
  { extension: '.scss', description: 'SCSS Stylesheet',   category: 'web' },
  { extension: '.ts',   description: 'TypeScript',        category: 'code' },
  { extension: '.tsx',  description: 'TSX React',         category: 'code' },
  { extension: '.js',   description: 'JavaScript',        category: 'code' },
  { extension: '.jsx',  description: 'JSX React',         category: 'code' },
  { extension: '.py',   description: 'Python',            category: 'code' },
  { extension: '.java', description: 'Java',              category: 'code' },
  { extension: '.cs',   description: 'C#',                category: 'code' },
  { extension: '.go',   description: 'Go',                category: 'code' },
  { extension: '.rs',   description: 'Rust',              category: 'code' },
  { extension: '.cpp',  description: 'C++',               category: 'code' },
  { extension: '.c',    description: 'C',                 category: 'code' },
  { extension: '.h',    description: 'C/C++ Header',      category: 'code' },
  { extension: '.hpp',  description: 'C++ Header',        category: 'code' },
  { extension: '.rb',   description: 'Ruby',              category: 'code' },
  { extension: '.php',  description: 'PHP',               category: 'code' },
  { extension: '.kt',   description: 'Kotlin',            category: 'code' },
  { extension: '.swift',description: 'Swift',             category: 'code' },
  { extension: '.dart', description: 'Dart',              category: 'code' },
  { extension: '.lua',  description: 'Lua',               category: 'code' },
  { extension: '.sh',   description: 'Shell Script',      category: 'code' },
  { extension: '.sql',  description: 'SQL',               category: 'code' },
  { extension: '.bat',  description: 'Batch Script',      category: 'code' },
  { extension: '.ps1',  description: 'PowerShell',        category: 'code' },
]

const BINARY_EXTENSIONS = new Set(['.pdf', '.docx'])

const SUPPORTED_EXT_SET = new Set(SUPPORTED_INGEST_EXTENSIONS.map(e => e.extension))

const SKIP_DIRS = new Set(['node_modules', '.git', '.dbvs', '__pycache__', 'dist', 'build',
  '.next', '.nuxt', 'target', 'bin', 'obj', 'vendor', '.venv', 'venv', 'env', '.svn', '.hg',
  'graphs', 'vectors', '.vscode', '.idea'])

// Files whose name starts with these prefixes are DBHT-internal and should be excluded
function isInternalFile(baseName: string): boolean {
  if (baseName.startsWith('DBHT-')) return true
  if (baseName.startsWith('.dbvs-')) return true
  if (baseName.startsWith('._')) return true
  return false
}

export function isBinaryFormat(extension: string): boolean {
  return BINARY_EXTENSIONS.has(extension.toLowerCase())
}

export function findSupportedFiles(rootDir: string): string[] {
  const results: string[] = []
  try {
    const entries = fs.readdirSync(rootDir)
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue
      const fullPath = path.join(rootDir, entry)
      try {
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          results.push(...findSupportedFiles(fullPath))
        } else if (stat.isFile() && stat.size < 5_000_000) {
          if (isInternalFile(entry)) continue
          const ext = path.extname(entry).toLowerCase()
          if (SUPPORTED_EXT_SET.has(ext)) results.push(fullPath)
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* skip inaccessible */ }
  return results
}

function parsePdfToText(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
  return new Promise(resolve => {
    const parser = new PDFParser()
    parser.on('pdfParser_dataReady', () => {
      try {
        const text = (parser.getRawTextContent() || '').trim()
        if (!text) {
          resolve({ success: false, error: 'PDF contains no extractable text (scanned image?)' })
        } else {
          resolve({ success: true, text })
        }
      } catch (err: any) {
        resolve({ success: false, error: `PDF text extract error: ${err.message || String(err)}` })
      }
    })
    parser.on('pdfParser_dataError', (err: any) => {
      resolve({ success: false, error: `PDF parse error: ${err?.parserError?.message || String(err)}` })
    })
    parser.loadPDF(filePath)
  })
}

async function parseDocxToText(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const buffer = await fs.readFile(filePath)
    const result = await mammoth.extractRawText({ buffer })
    const text = (result?.value || '').trim()
    if (!text) return { success: false, error: 'DOCX contains no extractable text' }
    return { success: true, text }
  } catch (err: any) {
    return { success: false, error: `DOCX parse error: ${err.message || String(err)}` }
  }
}

export async function parseFileToText(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.pdf') return parsePdfToText(filePath)
  if (ext === '.docx') return parseDocxToText(filePath)
  try {
    const text = await fs.readFile(filePath, 'utf-8')
    return { success: true, text }
  } catch (err: any) {
    return { success: false, error: `Read error: ${err.message || String(err)}` }
  }
}
