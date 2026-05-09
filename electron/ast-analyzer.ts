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
  skippedDirs: number
  skippedDirNames: string[]
  foundExtensions: string[]
  scannedPath: string
}

export type ParseProgressFn = (msg: string) => void

// ==================== Core Analyzer ====================

// File extensions to parse
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',  // JS/TS
  '.py', '.pyw',   // Python
  '.java', '.kt', '.kts',  // JVM
  '.cs',                    // C#
  '.go',                    // Go
  '.rs',                    // Rust
  '.c', '.cpp', '.cxx', '.h', '.hpp', '.hxx',  // C/C++
  '.rb',                    // Ruby
  '.php',                   // PHP
  '.swift',                 // Swift
  '.dart',                  // Dart
  '.lua',                   // Lua
])

// Directories to skip — only truly universal non-source dirs
// DBHT-internal dirs (objects, commits, graphs, etc.) are NOT skipped globally
// because they could be legitimate project directories outside of .dbvs
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.dbvs', '.svn',
  '.next', '.nuxt', '__pycache__',
])

// DBHT-internal directory names that are only skipped inside .dbvs
const DBHT_META_DIRS = new Set([
  'objects', 'commits', 'graphs', 'quality', 'analysis-cache',
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
  if (base.startsWith('DBHT-')) return true
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

// --- Python parser ---

const PY_KEYWORDS = new Set([
  'False','None','True','and','as','assert','async','await','break','class',
  'continue','def','del','elif','else','except','finally','for','from','global',
  'if','import','in','is','lambda','nonlocal','not','or','pass','raise','return',
  'try','while','with','yield',
])

function parsePythonFile(content: string): {
  imports: ImportRef[]; exports: ExportRef[]; functions: string[]; classes: ClassRef[]; calls: CallRef[]
} {
  const imports: ImportRef[] = []; const exports: ExportRef[] = []; const functions: string[] = []; const classes: ClassRef[] = []; const calls: CallRef[] = []
  const lines = content.split('\n')
  let inDocstring = false

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const lineNum = i + 1
    const trimmed = rawLine.trim()

    // Handle multi-line docstrings """ and '''
    if (!inDocstring) {
      const dsTriple = trimmed.match(/^("""|''')/)
      const dsEnd = trimmed.match(/"""|'''/)
      if (dsTriple) {
        if (dsEnd && dsEnd.index! > 0) { continue } // single-line docstring
        inDocstring = true; continue
      }
    }
    if (inDocstring) {
      if (trimmed.includes('"""') || trimmed.includes("'''")) inDocstring = false
      continue
    }

    if (!trimmed || trimmed.startsWith('#')) continue

    const indent = rawLine.search(/\S/)
    if (indent < 0) continue

    // import X, Y  or  import X as Z
    if (indent === 0) {
      const imp = trimmed.match(/^import\s+(.+)$/)
      if (imp) {
        const names = imp[1].split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean)
        imports.push({ modulePath: names[0] || imp[1], names, isDefault: false })
        continue
      }
      const from = trimmed.match(/^from\s+([\w.]+)\s+import\s+(.+)$/)
      if (from) {
        const mod = from[1]; let raw = from[2].trim()
        // Handle multi-line imports: from X import (
        if (raw === '(') {
          raw = ''
          for (let j = i + 1; j < lines.length; j++) {
            const nl = lines[j].trim()
            if (nl === ')') break
            raw += nl
          }
        }
        const names = raw === '*' ? ['*'] : raw.split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean)
        imports.push({ modulePath: mod, names, isDefault: false })
        continue
      }
    }

    // async def / def name(
    if (indent === 0) {
      const fn = trimmed.match(/^(?:async\s+)?def\s+(\w+)\s*\(/)
      if (fn) { const n = fn[1]; functions.push(n); exports.push({ name: n, kind: 'function' }); continue }
    }

    // class Name(Base1, Base2):
    if (indent === 0) {
      const cls = trimmed.match(/^class\s+(\w+)(?:\(([^)]*)\))?\s*:/)
      if (cls) {
        const name = cls[1]; const bases = cls[2]?.trim()
        const baseClass = bases ? bases.split(',')[0].trim().split('.')[0].trim() : undefined
        const methods: string[] = []
        // Scan forward for indented defs belonging to this class
        for (let j = i + 1; j < lines.length; j++) {
          const nLine = lines[j]; const nTrim = nLine.trim()
          if (!nTrim || nTrim.startsWith('#')) continue
          const nIndent = nLine.search(/\S/)
          if (nIndent <= indent) break
          const m = nTrim.match(/^(?:async\s+)?def\s+(\w+)\s*\(/)
          if (m) methods.push(m[1])
        }
        classes.push({ name, baseClass, methods })
        exports.push({ name, kind: 'class' })
        continue
      }
    }

    // Top-level variable assignment
    if (indent === 0) {
      const assign = trimmed.match(/^(\w+)\s*=\s*.+/)
      if (assign && !PY_KEYWORDS.has(assign[1])) {
        exports.push({ name: assign[1], kind: 'variable' })
        continue
      }
    }

    // Function calls: name(...) or obj.method(...)
    const callRe = /(?<!\w)(\w+(?:\.\w+)*)\s*\(/g
    let cm: RegExpExecArray | null
    while ((cm = callRe.exec(trimmed)) !== null) {
      const parts = cm[1].split('.')
      const cname = parts[parts.length - 1]
      if (!PY_KEYWORDS.has(cname)) calls.push({ name: cname, line: lineNum })
    }
  }
  return { imports, exports, functions, classes, calls }
}

// --- C-family parser (Java, C#, C, C++, Go, Rust, Kotlin, Swift, Dart, PHP) ---

const C_LIKE_KEYWORDS = new Set([
  'if','else','for','while','do','switch','case','default','break','continue',
  'return','goto','try','catch','finally','throw','throws','new','delete',
  'sizeof','typeof','class','struct','enum','interface','extends','implements',
  'public','private','protected','static','final','abstract','virtual','override',
  'const','volatile','inline','extern','typedef','namespace','using','package',
  'import','export','include','define','ifdef','ifndef','endif','pragma','error',
  'true','false','null','nullptr','this','super','base','self','void','var','let',
  'async','await','yield','from','as','is','not','and','or','in','assert','raise',
  'print','echo','printf','sprintf','malloc','free','sizeof','alignof','noexcept','decltype',
  'fn','func','function','def','mut','pub','impl','trait','dyn','ref','box','unsafe','where','type',
  'elif','elseif','endif','end','begin','rescue','ensure','module','defined','require','require_once',
  '__halt_compiler','match',
])

interface LangPattern {
  commentLine: string   // e.g. '//' or '#'
  commentBlock?: { open: string; close: string }
  imports: Array<{ re: RegExp; modIdx: number; nameIdx?: number }>  // nameIdx for 'from X import Y' style
  functionDef: RegExp    // captures group 1 = name
  classDef: RegExp       // captures group 1 = name, group 2 = optional bases
  methodRe?: RegExp      // captures group 1 = name, for methods inside classes
  callRe: RegExp         // captures group 1 = full call path
}

function parseWithPatterns(content: string, p: LangPattern): {
  imports: ImportRef[]; exports: ExportRef[]; functions: string[]; classes: ClassRef[]; calls: CallRef[]
} {
  const imports: ImportRef[] = []; const exports: ExportRef[] = []; const functions: string[] = []; const classes: ClassRef[] = []; const calls: CallRef[] = []
  const lines = content.split('\n')
  let inBlock = false

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const lineNum = i + 1
    const trimmed = rawLine.trim()

    // Block comment handling
    if (p.commentBlock) {
      if (inBlock) {
        if (trimmed.includes(p.commentBlock.close)) { inBlock = false }
        continue
      }
      if (trimmed.startsWith(p.commentBlock.open) || trimmed.includes(p.commentBlock.open)) {
        if (!trimmed.includes(p.commentBlock.close, trimmed.indexOf(p.commentBlock.open) + p.commentBlock.open.length)) {
          inBlock = true
        }
        continue
      }
    }

    if (!trimmed || trimmed.startsWith(p.commentLine)) continue

    const indent = rawLine.search(/\S/)
    const isTop = indent === 0

    // Imports — only top-level
    if (isTop) {
      let matched = false
      for (const imp of p.imports) {
        const m = trimmed.match(imp.re)
        if (m) {
          const mod = m[imp.modIdx]
          const name = imp.nameIdx !== undefined ? m[imp.nameIdx] : undefined
          const names = name ? name.split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean) : [mod]
          imports.push({ modulePath: mod, names, isDefault: false })
          matched = true; break
        }
      }
      if (matched) continue
    }

    // Function definitions
    if (isTop) {
      const fn = trimmed.match(p.functionDef)
      if (fn) { const n = fn[1]; functions.push(n); exports.push({ name: n, kind: 'function' }); continue }
    }

    // Class/struct/interface definitions
    if (isTop) {
      const cls = trimmed.match(p.classDef)
      if (cls) {
        const name = cls[1]; const bases = cls[2]?.trim()
        let baseClass: string | undefined
        if (bases) {
          // Extract first base class name (before any extends/implements/where keywords)
          baseClass = bases.split(/[,:\s]/)[0].trim()
          if (!baseClass || C_LIKE_KEYWORDS.has(baseClass.toLowerCase())) baseClass = undefined
        }
        const methods: string[] = []
        if (p.methodRe) {
          for (let j = i + 1; j < lines.length; j++) {
            const nLine = lines[j]; const nTrim = nLine.trim()
            if (!nTrim || nTrim.startsWith(p.commentLine)) continue
            if (p.commentBlock && (nTrim.startsWith(p.commentBlock.open) || nTrim.includes(p.commentBlock.open))) continue
            const nIndent = nLine.search(/\S/)
            if (nIndent <= indent) break
            const meth = nTrim.match(p.methodRe)
            if (meth) methods.push(meth[1])
          }
        }
        classes.push({ name, baseClass, methods })
        exports.push({ name, kind: 'class' })
        continue
      }
    }

    // Top-level variable/const assignment
    if (isTop) {
      const assign = trimmed.match(/^(?:export\s+)?(?:let|var|const|val|mut|static\s+)?\s*(\w+)\s*[:=]\s*.+/)
      if (assign) {
        const vname = assign[1]
        if (!C_LIKE_KEYWORDS.has(vname.toLowerCase()) && !vname.startsWith('_')) {
          exports.push({ name: vname, kind: 'variable' })
        }
      }
    }

    // Function calls
    let cm: RegExpExecArray | null
    p.callRe.lastIndex = 0
    while ((cm = p.callRe.exec(trimmed)) !== null) {
      const parts = cm[1].split('.')
      const cname = parts[parts.length - 1]
      if (!C_LIKE_KEYWORDS.has(cname.toLowerCase())) calls.push({ name: cname, line: lineNum })
    }
  }
  return { imports, exports, functions, classes, calls }
}

// --- Language pattern definitions ---

const JAVA_PATTERNS: LangPattern = {
  commentLine: '//', commentBlock: { open: '/*', close: '*/' },
  imports: [{ re: /^import\s+([\w.*]+)\s*;?$/, modIdx: 1 }],
  functionDef: /^(?:public\s+|private\s+|protected\s+|static\s+|final\s+|abstract\s+|synchronized\s+)*(?:[\w<>[\],\s]+\s+)?(\w+)\s*\(/,
  classDef: /^(?:public\s+|private\s+|protected\s+|static\s+|abstract\s+)*(?:class|interface|enum)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w\s,]+))?\s*\{?/,
  methodRe: /^(?:public\s+|private\s+|protected\s+|static\s+|final\s+|abstract\s+|synchronized\s+)*(?:[\w<>[\],\s]+\s+)?(\w+)\s*\(/,
  callRe: /(?<!\w)(\w+(?:\.\w+)*)\s*\(/g,
}

const CS_PATTERNS: LangPattern = {
  commentLine: '//', commentBlock: { open: '/*', close: '*/' },
  imports: [{ re: /^using\s+([\w.]+)\s*;?$/, modIdx: 1 }],
  functionDef: /^(?:public\s+|private\s+|protected\s+|internal\s+|static\s+|virtual\s+|override\s+|abstract\s+|async\s+|partial\s+|unsafe\s+|extern\s+|sealed\s+)*(?:[\w<>[\],\s?]+\s+)?(\w+)\s*[<(]/,
  classDef: /^(?:public\s+|private\s+|protected\s+|internal\s+|static\s+|abstract\s+|sealed\s+|partial\s+)*(?:class|struct|interface|enum|record)\s+(\w+)(?:\s*:\s*([^{]+))?\s*\{?/,
  methodRe: /^(?:public\s+|private\s+|protected\s+|internal\s+|static\s+|virtual\s+|override\s+|abstract\s+|async\s+|partial\s+|unsafe\s+|extern\s+|sealed\s+)*(?:[\w<>[\],\s?]+\s+)?(\w+)\s*[<(]/,
  callRe: /(?<!\w)(\w+(?:\.\w+)*)\s*\(/g,
}

const GO_PATTERNS: LangPattern = {
  commentLine: '//', commentBlock: { open: '/*', close: '*/' },
  imports: [{ re: /^import\s+"([^"]+)"/, modIdx: 1 }, { re: /^import\s+(\w+)\s+"([^"]+)"/, modIdx: 2 }],
  functionDef: /^func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/,
  classDef: /^type\s+(\w+)\s+struct\s*\{?/,  // Go has structs, not classes
  methodRe: /^func\s+\([^)]*\)\s+(\w+)\s*\(/,
  callRe: /(?<!\w)(\w+(?:\.\w+)*)\s*\(/g,
}

const RUST_PATTERNS: LangPattern = {
  commentLine: '//', commentBlock: { open: '/*', close: '*/' },
  imports: [{ re: /^use\s+([\w:]+(?:::\{[^}]+\})?)\s*;?$/, modIdx: 1 }],
  functionDef: /^(?:pub\s+|unsafe\s+|async\s+|extern\s+)*(?:fn|async\s+fn)\s+(\w+)\s*[<(]/,
  classDef: /^(?:pub\s+)?(?:struct|trait|enum)\s+(\w+)(?:[<][^>]*[>])?\s*(?:[:]\s*([^{]+))?\s*\{?/,
  methodRe: /^(?:pub\s+|unsafe\s+|async\s+|extern\s+)*(?:fn|async\s+fn)\s+(\w+)\s*[<(]/,
  callRe: /(?<!\w)(\w+(?:::?\w+)*)\s*\(/g,
}

const C_CPP_PATTERNS: LangPattern = {
  commentLine: '//', commentBlock: { open: '/*', close: '*/' },
  imports: [{ re: /^#include\s+[<"]([^>"]+)[>"]/, modIdx: 1 }],
  functionDef: /^(?:[\w:*&\s]+\s+)?(\w+)\s*\([^)]*\)\s*(?:const\s*)?(?:noexcept\s*)?\{?/,
  classDef: /^(?:class|struct|enum\s+class|enum)\s+(\w+)(?:\s*:\s*(?:public|private|protected)\s+(\w+))?\s*\{?/,
  methodRe: /^(?:virtual\s+|static\s+|const\s+|override\s+|final\s+)*(?:[\w:*&\s]+)\s+(\w+)\s*\(/,
  callRe: /(?<!\w)(\w+(?:\.\w+|->\w+)*)\s*\(/g,
}

const PHP_PATTERNS: LangPattern = {
  commentLine: '//', commentBlock: { open: '/*', close: '*/' },
  imports: [{ re: /^use\s+([\w\\]+)\s*;?$/, modIdx: 1 }, { re: /^(?:require|include)(?:_once)?\s*['"]([^'"]+)['"]\s*;?$/, modIdx: 1 }],
  functionDef: /^(?:public\s+|private\s+|protected\s+|static\s+|final\s+|abstract\s+)*function\s+(\w+)\s*\(/,
  classDef: /^(?:abstract\s+|final\s+)*(?:class|interface|trait|enum)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{?/,
  methodRe: /^(?:public\s+|private\s+|protected\s+|static\s+|final\s+|abstract\s+)*function\s+(\w+)\s*\(/,
  callRe: /(?<!\w)(\w+(?:->\w+|::\w+)*)\s*\(/g,
}

const KOTLIN_PATTERNS: LangPattern = {
  commentLine: '//', commentBlock: { open: '/*', close: '*/' },
  imports: [{ re: /^import\s+([\w.*]+)\s*;?$/, modIdx: 1 }],
  functionDef: /^(?:suspend\s+|inline\s+|operator\s+|infix\s+|tailrec\s+|external\s+)*(?:fun|suspend\s+fun)\s+(\w+)\s*[<(]/,
  classDef: /^(?:abstract\s+|open\s+|sealed\s+|data\s+|inner\s+|enum\s+|annotation\s+)*(?:class|object|interface|enum\s+class)\s+(\w+)(?:\s*[:(]\s*([^{]+))?\s*\{?/,
  methodRe: /^(?:suspend\s+|inline\s+|operator\s+|infix\s+|tailrec\s+|external\s+|override\s+)*(?:fun|suspend\s+fun)\s+(\w+)\s*[<(]/,
  callRe: /(?<!\w)(\w+(?:\.\w+|\.\.\w+|\?\?\w+)*)\s*\(/g,
}

const SWIFT_PATTERNS: LangPattern = {
  commentLine: '//', commentBlock: { open: '/*', close: '*/' },
  imports: [{ re: /^import\s+(?:typealias\s+|struct\s+|class\s+|enum\s+|protocol\s+|func\s+|let\s+|var\s+|extension\s+)?(\w+)\s*;?$/, modIdx: 1 }],
  functionDef: /^(?:public\s+|private\s+|internal\s+|fileprivate\s+|open\s+|static\s+|class\s+|mutating\s+|override\s+|convenience\s+|required\s+|throws\s+|rethrows\s+|async\s+)*(?:func|init|deinit)\s+(\w+)\s*[<(]/,
  classDef: /^(?:public\s+|private\s+|internal\s+|fileprivate\s+|open\s+|final\s+|indirect\s+)*(?:class|struct|enum|protocol|extension|actor)\s+(\w+)(?:\s*:\s*([^{]+))?\s*\{?/,
  methodRe: /^(?:public\s+|private\s+|internal\s+|fileprivate\s+|open\s+|static\s+|class\s+|mutating\s+|override\s+|convenience\s+|required\s+|throws\s+|rethrows\s+|async\s+)*(?:func|init|deinit)\s+(\w+)\s*[<(]/,
  callRe: /(?<!\w)(\w+(?:\.\w+)*)\s*\(/g,
}

const DART_PATTERNS: LangPattern = {
  commentLine: '//', commentBlock: { open: '/*', close: '*/' },
  imports: [{ re: /^import\s+['"]([^'"]+)['"]\s*;?$/, modIdx: 1 }],
  functionDef: /^(?:Future\s*[<]\w+[>]\s+)?(?:void\s+|int\s+|String\s+|bool\s+|double\s+|dynamic\s+|var\s+|final\s+|const\s+)?(\w+)\s*\(/,
  classDef: /^(?:abstract\s+|sealed\s+|mixin\s+|base\s+|final\s+|interface\s+)*(?:class|mixin|enum|extension\s+type)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{?/,
  methodRe: /^(?:void\s+|int\s+|String\s+|bool\s+|double\s+|dynamic\s+|var\s+|final\s+|const\s+|static\s+)?(\w+)\s*\(/,
  callRe: /(?<!\w)(\w+(?:\.\w+)*)\s*\(/g,
}

const RUBY_PATTERNS: LangPattern = {
  commentLine: '#',
  imports: [{ re: /^(?:require|require_relative|load)\s+['"]([^'"]+)['"]/, modIdx: 1 }],
  functionDef: /^def\s+(?:self\.)?(\w+[!?]?)\s*[(\b]/,
  classDef: /^(?:class|module)\s+(\w+)(?:[<]\s*([^{]+))?\s*$/,
  methodRe: /^def\s+(?:self\.)?(\w+[!?]?)\s*[(\b]/,
  callRe: /(?<!\w)(\w+(?:\.\w+|\.\.\w+)*)\s*[(\[]/g,
}

const LUA_PATTERNS: LangPattern = {
  commentLine: '--', commentBlock: { open: '--[[', close: ']]' },
  imports: [{ re: /^(?:local\s+)?(\w+)\s*=\s*require\s*[(]['"]([^'"]+)['"][)]/, modIdx: 2 }],
  functionDef: /^(?:local\s+)?function\s+(\w+(?:[.:]\w+)?)\s*\(/,
  classDef: /^(?:local\s+)?(\w+)\s*=\s*\{/,  // Lua uses prototype-based OOP, approximate
  methodRe: /^function\s+\w+[.:](\w+)\s*\(/,
  callRe: /(?<!\w)(\w+(?:[.:]\w+)*)\s*\(/g,
}

// --- Extension → parser dispatch ---

const LANG_PATTERNS: Record<string, LangPattern> = {
  '.java': JAVA_PATTERNS,
  '.cs': CS_PATTERNS,
  '.go': GO_PATTERNS,
  '.rs': RUST_PATTERNS,
  '.c': C_CPP_PATTERNS, '.cpp': C_CPP_PATTERNS, '.cxx': C_CPP_PATTERNS,
  '.h': C_CPP_PATTERNS, '.hpp': C_CPP_PATTERNS, '.hxx': C_CPP_PATTERNS,
  '.php': PHP_PATTERNS,
  '.kt': KOTLIN_PATTERNS, '.kts': KOTLIN_PATTERNS,
  '.swift': SWIFT_PATTERNS,
  '.dart': DART_PATTERNS,
  '.rb': RUBY_PATTERNS,
  '.lua': LUA_PATTERNS,
}

function parseOtherFile(ext: string, content: string): {
  imports: ImportRef[]; exports: ExportRef[]; functions: string[]; classes: ClassRef[]; calls: CallRef[]
} {
  if (ext === '.py' || ext === '.pyw') return parsePythonFile(content)
  const patterns = LANG_PATTERNS[ext]
  if (patterns) return parseWithPatterns(content, patterns)
  return { imports: [], exports: [], functions: [], classes: [], calls: [] }
}

// --- File-level dispatch ---

async function parseFile(filePath: string, projectRoot: string): Promise<ParsedFile | null> {
  const content = await fs.readFile(filePath, 'utf-8')
  const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/')
  const hash = hashContent(content)
  const lines = content.split('\n').length

  const ext = path.extname(filePath).toLowerCase()
  let imports: ImportRef[], exports: ExportRef[], functions: string[], classes: ClassRef[], calls: CallRef[]

  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
    ({ imports, exports, functions, classes, calls } = parseTypeScriptFile(filePath, content))
  } else {
    ({ imports, exports, functions, classes, calls } = parseOtherFile(ext, content))
  }

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
  stats: { total: number; cached: number; skippedDirs: number; skippedDirNames: string[]; foundExtensions: Set<string> },
  depth: number = 0,
  onProgress?: ParseProgressFn
): Promise<void> {
  if (depth > 30) return // prevent runaway recursion

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
      if (baseName.startsWith('.')) {
        stats.skippedDirs++
        stats.skippedDirNames.push(baseName)
        continue
      }
      if (SKIP_DIRS.has(baseName)) {
        stats.skippedDirs++
        stats.skippedDirNames.push(baseName)
        continue
      }
      // Only skip DBHT meta dirs when inside .dbvs
      if (DBHT_META_DIRS.has(baseName) && path.basename(dirPath) === '.dbvs') {
        stats.skippedDirs++
        stats.skippedDirNames.push(baseName)
        continue
      }
      if (depth <= 2) onProgress?.(`Scanning: ${path.relative(projectRoot, fullPath).replace(/\\/g, '/')}/`)
      await scanDirectory(fullPath, projectRoot, cacheDir, results, errors, stats, depth + 1, onProgress)
      continue
    }

    if (!entry.isFile()) continue

    const ext = path.extname(baseName).toLowerCase()
    if (!SOURCE_EXTENSIONS.has(ext)) {
      stats.foundExtensions.add(ext || '(no ext)')
      continue
    }

    // Skip .d.ts files
    if (baseName.endsWith('.d.ts')) continue

    stats.total++

    // Progress: report every 10 files (and first 5 to show early activity)
    if (onProgress && (stats.total <= 5 || stats.total % 10 === 0)) {
      const rel = path.relative(projectRoot, fullPath).replace(/\\/g, '/')
      onProgress(`Parsing (${stats.total} files): ${rel}`)
    }

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
  repoPath: string,
  onProgress?: ParseProgressFn
): Promise<ParseResult> {
  const results: ParsedFile[] = []
  const errors: string[] = []
  const stats = { total: 0, cached: 0, skippedDirs: 0, skippedDirNames: [] as string[], foundExtensions: new Set<string>() }

  onProgress?.('Starting scan...')

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
  await scanDirectory(projectPath, projectPath, cacheDir, results, errors, stats, 0, onProgress)

  onProgress?.(`Scan complete: ${stats.total} source files found (${stats.cached} cached) in ${((Date.now() - startTime) / 1000).toFixed(1)}s`)

  // Save cache entries for newly parsed files
  if (cacheDir) {
    let savedCount = 0
    for (const file of results) {
      const cacheKey = file.hash + '_' + file.path.replace(/[\\/]/g, '_')
      const cachePath = path.join(cacheDir, cacheKey + '.json')
      if (!(await fs.pathExists(cachePath))) {
        try {
          // Save without absolute path (reconstructed on load)
          const { absolutePath, ...toCache } = file
          await fs.writeJson(cachePath, toCache)
          savedCount++
        } catch {
          // Best effort
        }
      }
    }
    if (savedCount > 0) onProgress?.(`Cached ${savedCount} new files`)
  }

  return {
    success: true,
    files: results,
    errors,
    totalFiles: stats.total,
    cachedFiles: stats.cached,
    skippedDirs: stats.skippedDirs,
    skippedDirNames: stats.skippedDirNames,
    foundExtensions: [...stats.foundExtensions],
    scannedPath: projectPath,
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
