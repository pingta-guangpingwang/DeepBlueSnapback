import type { ArchitectureGraph } from './graph-types'

export interface DiffChange {
  path: string
  status: string   // 'added' | 'modified' | 'deleted'
  added: number
  removed: number
}

/**
 * Generate a meaningful Chinese commit message from change patterns.
 * Uses heuristics: file type analysis, change magnitude, naming patterns.
 * Designed as foundation for future LLM enhancement via --ai flag.
 */
function generateCommitMessage(changes: DiffChange[], graph?: ArchitectureGraph): {
  message: string
  summary: string
  suggestedLabels: string[]  // conventional commit labels like feat, fix, refactor, etc.
} {
  if (!changes || changes.length === 0) {
    return { message: '空提交', summary: '无文件变更', suggestedLabels: [] }
  }

  const added = changes.filter(c => c.status === 'added')
  const modified = changes.filter(c => c.status === 'modified')
  const deleted = changes.filter(c => c.status === 'deleted')

  // Analyze file types
  const byCategory: Record<string, string[]> = {}
  for (const c of changes) {
    const ext = c.path.split('.').pop()?.toLowerCase() || 'other'
    let cat: string
    if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) cat = '代码'
    else if (['css', 'scss', 'less', 'svg', 'png', 'jpg'].includes(ext)) cat = '样式/资源'
    else if (['json', 'yaml', 'yml', 'toml', 'ini', 'env'].includes(ext)) cat = '配置'
    else if (['md', 'txt', 'rst', 'adoc'].includes(ext)) cat = '文档'
    else if (['test', 'spec'].some(t => c.path.includes(t))) cat = '测试'
    else cat = '其他'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(c.path)
  }

  // Determine conventional commit type
  const suggestedLabels: string[] = []
  if (added.length > 0 && modified.length === 0 && deleted.length === 0) suggestedLabels.push('feat')
  if (modified.length > 0 && added.length === 0 && deleted.length === 0) suggestedLabels.push('refactor')
  if (added.length > 0 && modified.length > 0) suggestedLabels.push('feat')
  if (deleted.length > 0 && added.length === 0) suggestedLabels.push('chore')
  if (changes.some(c => c.path.includes('test') || c.path.includes('spec'))) suggestedLabels.push('test')
  if (changes.some(c => c.path.includes('.md') || c.path.includes('doc') || c.path.includes('README'))) suggestedLabels.push('docs')
  if (changes.some(c => c.path.includes('fix') || c.path.includes('bug'))) suggestedLabels.push('fix')

  // Build message parts
  const parts: string[] = []

  // Category-based summary
  const catEntries = Object.entries(byCategory)
  for (const [cat, files] of catEntries.slice(0, 3)) {
    const fileNames = files.slice(0, 2).map(f => f.split('/').pop() || f.split('\\').pop() || f)
    const remaining = files.length > 2 ? ` 等 ${files.length} 个文件` : ''
    parts.push(`${cat}: ${fileNames.join(', ')}${remaining}`)
  }

  // Line change summary
  const totalAdded = changes.reduce((s, c) => s + c.added, 0)
  const totalRemoved = changes.reduce((s, c) => s + c.removed, 0)
  parts.push(`(+${totalAdded} -${totalRemoved})`)

  const message = parts.join('；')

  // Generate detailed summary
  const actionWords: string[] = []
  if (added.length > 0) actionWords.push(`新增 ${added.length} 个文件`)
  if (modified.length > 0) actionWords.push(`修改 ${modified.length} 个文件`)
  if (deleted.length > 0) actionWords.push(`删除 ${deleted.length} 个文件`)

  const summary = actionWords.join('，') + `，共 +${totalAdded} -${totalRemoved} 行`

  return { message, summary, suggestedLabels }
}

/**
 * Attempt LLM-enhanced commit message via external AI (Claude Code / Cursor / etc.)
 * Falls back to heuristic if LLM is unavailable.
 */
export async function generateAICommitMessage(
  changes: DiffChange[],
  tool: string,
  getDiffContent?: (filePath: string) => Promise<string>,
): Promise<{ message: string; summary: string; suggestedLabels: string[]; source: 'ai' | 'heuristic' }> {
  // For now, use enhanced heuristic with tool awareness
  const base = generateCommitMessage(changes)

  let prefix = ''
  switch (tool) {
    case 'claude-code': prefix = '🤖 '; break
    case 'cursor': prefix = '🖱️ '; break
    case 'copilot': prefix = '💻 '; break
    default: prefix = ''
  }

  return {
    message: prefix + base.message,
    summary: base.summary,
    suggestedLabels: base.suggestedLabels,
    source: 'heuristic',
  }
}
