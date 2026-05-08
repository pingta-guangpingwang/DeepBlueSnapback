/**
 * 行级 Diff 工具
 * 比较两段文本，返回带颜色的行列表（SourceTree 风格）
 */

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  oldLineNo?: number
  newLineNo?: number
}

/**
 * 简单的行级 diff：按行对比，找出新增、删除、未变的行
 * 使用最长公共子序列 (LCS) 算法
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  // Build LCS table
  const m = oldLines.length
  const n = newLines.length

  // 对于大文件使用简化的逐行比较避免内存爆炸
  if (m * n > 2000000) {
    return simpleDiff(oldLines, newLines)
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find diff
  const result: DiffLine[] = []
  let i = m, j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'unchanged', content: oldLines[i - 1], oldLineNo: i, newLineNo: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', content: newLines[j - 1], newLineNo: j })
      j--
    } else {
      result.unshift({ type: 'removed', content: oldLines[i - 1], oldLineNo: i })
      i--
    }
  }

  return result
}

/**
 * 简化 diff：直接逐行比较（适用于大文件）
 */
function simpleDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = []
  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let idx = 0; idx < maxLen; idx++) {
    if (idx < oldLines.length && idx < newLines.length) {
      if (oldLines[idx] === newLines[idx]) {
        result.push({ type: 'unchanged', content: oldLines[idx], oldLineNo: idx + 1, newLineNo: idx + 1 })
      } else {
        result.push({ type: 'removed', content: oldLines[idx], oldLineNo: idx + 1 })
        result.push({ type: 'added', content: newLines[idx], newLineNo: idx + 1 })
      }
    } else if (idx < oldLines.length) {
      result.push({ type: 'removed', content: oldLines[idx], oldLineNo: idx + 1 })
    } else {
      result.push({ type: 'added', content: newLines[idx], newLineNo: idx + 1 })
    }
  }

  return result
}

/**
 * 统计 diff 结果
 */
export function getDiffStats(lines: DiffLine[]): { added: number; removed: number; unchanged: number } {
  let added = 0, removed = 0, unchanged = 0
  for (const line of lines) {
    if (line.type === 'added') added++
    else if (line.type === 'removed') removed++
    else unchanged++
  }
  return { added, removed, unchanged }
}
