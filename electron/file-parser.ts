import * as fs from 'fs-extra'
import * as path from 'path'

const mammoth = require('mammoth')
const pdfParse = require('pdf-parse')

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

export function isBinaryFormat(extension: string): boolean {
  return BINARY_EXTENSIONS.has(extension.toLowerCase())
}

async function parsePdfToText(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const buffer = await fs.readFile(filePath)
    const data = await pdfParse(buffer)
    const text = (data?.text || '').trim()
    if (!text) return { success: false, error: 'PDF contains no extractable text (scanned image?)' }
    return { success: true, text }
  } catch (err: any) {
    return { success: false, error: `PDF parse error: ${err.message || String(err)}` }
  }
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
