interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: TreeNode[]
}

export interface FlatTreeNode {
  node: TreeNode
  depth: number
  isExpanded: boolean
}

export function flattenTree(
  nodes: TreeNode[],
  expandedDirs: Set<string>,
  depth = 0,
): FlatTreeNode[] {
  const result: FlatTreeNode[] = []
  for (const node of nodes) {
    const isDir = node.isDirectory
    const expanded = isDir && expandedDirs.has(node.path)
    result.push({ node, depth, isExpanded: expanded })
    if (isDir && expanded && node.children.length > 0) {
      result.push(...flattenTree(node.children, expandedDirs, depth + 1))
    }
  }
  return result
}
