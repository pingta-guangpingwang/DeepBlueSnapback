import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import * as ts from 'typescript'

// ==================== Parsed Structures ====================

export interface ImportRef {
  modulePath: string // the module being imported from
  names: string[] // imported names
  isDefault: boolean
}

export interface ExportRef {
  name: string
  kind: 'function' | 'class' | 'variable' | 'type' | 'default'
}

export interface CallRef {
  name: string // function/method being called
  line: number
}

export interface ClassRef {
  name: string
  baseClass?: string
  methods: string[]
}

export interface ParsedFile {
  path: string // relative to project root
  absolutePath: string
  imports: ImportRef[]
  exports: ExportRef[]
  functions: string[]
  classes: ClassRef[]
  calls: CallRef[]
  lines: number
  hash: string // content hash for cache invalidation
}

export interface ParseResult {
  success: boolean
  files: ParsedFile[]
  errors: string[]
  totalFiles: number
  cachedFiles: number
}

// ==================== Core Analyzer ====================

// File extensions to parse
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.dbvs', '.svn', 'dist', 'build',
  '.next', '.nuxt', 'coverage', '__pycache__', 'vendor',
  'objects', 'commits', 'graphs', 'quality', 'analysis-cache',
  'tmp', '.cache'
])

// Binary / non-source file extensions
const SKIP_EXTENSIONS = new Set([
  '.json', '.css', '.scss', '.less', '.svg', '.png', '.jpg', '.gif',
  '.ico', '.woff', '.woff2', '.eot', '.ttf', '.map', '.d.ts',
  '.glb', '.gltf', '.obj', '.fbx', '.bin', '.exe', '.dll',
  '.so', '.dylib', '.wasm', '.pyc', '.lock', '.log'
])

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function shouldSkipPath(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase()
  const base = path.basename(filePath)

  if (base.startsWith('.')) return true
  if (SKIP_EXTENSIONS.has(ext)) return true

  // Check if file is readable text (skip binaries)
  try {
    const buf = await fs.readFile(filePath, { encoding: null })
    if (buf.length === 0) return true
    // Binary check: if more than 10% of first 1000 bytes are non-printable
    const sample = buf.slice(0, 1000)
    let nonPrintable = 0
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i]
      if (byte !== 0) { // skip null bytes (common in UTF-16, buffers)
        if (byte < 9 || (byte > 13 && byte < 32)) nonPrintable++
      }
    }
    if (nonPrintable > sample.length * 0.1) return true
  } catch {
    return true
  }

  return false
}

function parseTypeScriptFile(filePath: string, content: string): {
  imports: ImportRef[]
  exports: ExportRef[]
  functions: string[]
  classes: ClassRef[]
  calls: CallRef[]
} {
  const imports: ImportRef[] = []
  const exports: ExportRef[] = []
  const functions: string[] = []
  const classes: ClassRef[] = []
  const calls: CallRef[] = []

  let sourceFile: ts.SourceFile
  try {
    sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true // setParentNodes
    )
  } catch {
    return { imports, exports, functions, classes, calls }
  }

  function walk(node: ts.Node): void {
    try {
      // Import declarations
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importClause = node.importClause
          const names: string[] = []
          let isDefault = false

          if (importClause) {
            if (importClause.name) {
              names.push(importClause.name.text)
              isDefault = true
            }
            if (importClause.namedBindings) {
              if (ts.isNamedImports(importClause.namedBindings)) {
                importClause.namedBindings.elements.forEach(el => {
                  names.push(el.name.text)
                })
              } else if (ts.isNamespaceImport(importClause.namedBindings)) {
                names.push(importClause.namedBindings.name.text)
              }
            }
          }

          imports.push({
            modulePath: moduleSpecifier.text,
            names,
            isDefault,
          })
        }
      }

      // Export declarations
      if (ts.isExportDeclaration(node)) {
        const clause = node.exportClause
        if (clause && ts.isNamedExports(clause)) {
          clause.elements.forEach(el => {
            exports.push({ name: el.name.text, kind: 'variable' })
          })
        }
      }

      // Export assignments (export default ...)
      if (ts.isExportAssignment(node)) {
        exports.push({ name: 'default', kind: 'default' })
      }

      // Variable statements with export modifier
      if (ts.isVariableStatement(node)) {
        const hasExport = node.modifiers?.some(
          m => m.kind === ts.SyntaxKind.ExportKeyword
        )
        node.declarationList.declarations.forEach(decl => {
          const name = decl.name.getText(sourceFile)
          if (hasExport) {
            const kind = decl.initializer && ts.isArrowFunction(decl.initializer)
              ? 'function' : 'variable'
            exports.push({ name, kind })
          }
        })
      }

      // Function declarations
      if (ts.isFunctionDeclaration(node)) {
        const name = node.name?.text
        if (name) {
          functions.push(name)
          const modifiers = ts.getCombinedModifierFlags(node as ts.Declaration)
          if (modifiers & ts.ModifierFlags.Export ||
              modifiers & ts.ModifierFlags.ExportDefault) {
            exports.push({ name, kind: 'function' })
          }
        }
      }

      // Class declarations
      if (ts.isClassDeclaration(node)) {
        const name = node.name?.text
        if (name) {
          const baseClass = node.heritageClauses
            ?.find(h => h.token === ts.SyntaxKind.ExtendsKeyword)
            ?.types[0]?.expression.getText(sourceFile)

          const methods: string[] = []
          node.members.forEach(member => {
            if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
              const methodName = member.name?.getText(sourceFile)
              if (methodName) methods.push(methodName)
            }
          })

          classes.push({ name, baseClass, methods })

          const modifiers = ts.getCombinedModifierFlags(node as ts.Declaration)
          if (modifiers & ts.ModifierFlags.Export ||
              modifiers & ts.ModifierFlags.ExportDefault) {
            exports.push({ name, kind: 'class' })
          }
        }
      }

      // Call expressions (top-level and inside functions)
      if (ts.isCallExpression(node)) {
        const expr = node.expression
        let callName = ''
        if (ts.isIdentifier(expr)) {
          callName = expr.text
        } else if (ts.isPropertyAccessExpression(expr)) {
          callName = expr.name.text
        }

        if (callName && callName.length > 0) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
          calls.push({ name: callName, line: line + 1 })
        }
      }

      ts.forEachChild(node, walk)
    } catch {
      // Skip malformed AST nodes
    }
  }

  walk(sourceFile)
  return { imports, exports, functions, classes, calls }
}

async function parseFile(filePath: string, projectRoot: string): Promise<ParsedFile | null> {
  const content = await fs.readFile(filePath, 'utf-8')
  const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/')
  const hash = hashContent(content)
  const lines = content.split('\n').length

  const { imports, exports, functions, classes, calls } = parseTypeScriptFile(filePath, content)

  return {
    path: relPath,
    absolutePath: filePath,
    imports,
    exports,
    functions,
    classes,
    calls,
    lines,
    hash,
  }
}

async function scanDirectory(
  dirPath: string,
  projectRoot: string,
  cacheDir: string | null,
  results: ParsedFile[],
  errors: string[],
  stats: { total: number; cached: number }
): Promise<void> {
  let entries: fs.Dirent[]
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true })
  } catch (err) {
    errors.push(`Cannot read directory ${dirPath}: ${String(err)}`)
    return
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const baseName = entry.name

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(baseName) || baseName.startsWith('.')) continue
      await scanDirectory(fullPath, projectRoot, cacheDir, results, errors, stats)
      continue
    }

    if (!entry.isFile()) continue

    const ext = path.extname(baseName).toLowerCase()
    if (!SOURCE_EXTENSIONS.has(ext)) continue

    // Skip .d.ts files
    if (baseName.endsWith('.d.ts')) continue

    stats.total++

    // Check cache
    let cached = false
    if (cacheDir) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8')
        const fileHash = hashContent(content)
        const cacheKey = fileHash + '_' + path.relative(projectRoot, fullPath).replace(/[\\/]/g, '_')
        const cachePath = path.join(cacheDir, cacheKey + '.json')

        if (await fs.pathExists(cachePath)) {
          const cachedResult = await fs.readJson(cachePath) as ParsedFile
          // Reconstruct absolute path (may differ if project was moved)
          cachedResult.absolutePath = fullPath
          results.push(cachedResult)
          stats.cached++
          cached = true
        }
      } catch {
        // Cache miss, parse normally
      }
    }

    if (!cached) {
      const parsed = await parseFile(fullPath, projectRoot)
      if (parsed) {
        results.push(parsed)
      }
    }
  }
}

export async function parseProject(
  projectPath: string,
  repoPath: string
): Promise<ParseResult> {
  const results: ParsedFile[] = []
  const errors: string[] = []
  const stats = { total: 0, cached: 0 }

  // Setup cache directory inside the root repository (graph data dir)
  const rootPath = path.resolve(repoPath, '..', '..') // repoPath = <root>/repositories/<name>
  let cacheDir: string | null = null
  try {
    cacheDir = path.join(rootPath, 'analysis-cache')
    await fs.ensureDir(cacheDir)
  } catch {
    // Cache unavailable, parse without it
  }

  const startTime = Date.now()
  await scanDirectory(projectPath, projectPath, cacheDir, results, errors, stats)
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

  // Save cache entries for newly parsed files
  if (cacheDir) {
    for (const file of results) {
      const cacheKey = file.hash + '_' + file.path.replace(/[\\/]/g, '_')
      const cachePath = path.join(cacheDir, cacheKey + '.json')
      if (!(await fs.pathExists(cachePath))) {
        try {
          // Save without absolute path (reconstructed on load)
          const { absolutePath, ...toCache } = file
          await fs.writeJson(cachePath, toCache)
        } catch {
          // Best effort
        }
      }
    }
  }

  return {
    success: true,
    files: results,
    errors,
    totalFiles: stats.total,
    cachedFiles: stats.cached,
  }
}

// ==================== Singleton for IPC ====================

let lastParseResult: ParseResult | null = null

export function getCachedParseResult(): ParseResult | null {
  return lastParseResult
}

export function setCachedParseResult(result: ParseResult): void {
  lastParseResult = result
}
