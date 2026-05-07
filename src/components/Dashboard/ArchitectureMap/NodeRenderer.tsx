import type { GraphNode, NodePosition } from '../../../types/graph'

interface NodeRendererProps {
  node: GraphNode
  position: NodePosition
  isSelected: boolean
  isCollapsed: boolean
  isHighRisk: boolean
  scale: number
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  building: { bg: '#1e3a5f', border: '#3b82f6', text: '#e0e7ff' },
  floor: { bg: '#1e293b', border: '#475569', text: '#cbd5e1' },
  room: { bg: '#0f172a', border: '#334155', text: '#94a3b8' },
}

export function NodeRenderer({ node, position, isSelected, isCollapsed, isHighRisk, scale }: NodeRendererProps) {
  const colors = TYPE_COLORS[node.type] || TYPE_COLORS.room
  const { x, y, width, height } = position

  const borderColor = isSelected ? '#60a5fa' : isHighRisk ? '#ef4444' : colors.border
  const borderWidth = isSelected ? 2 : isHighRisk ? 2 : 1
  const bgColor = isHighRisk ? 'rgba(239, 68, 68, 0.1)' : colors.bg
  const fontSize = Math.max(10, Math.min(12, 11 * scale))
  const iconSize = Math.max(8, Math.min(14, 12 * scale))

  const icon = node.type === 'building' ? '\u{1F3E2}' : node.type === 'floor' ? '\u{1F3E2}' : '\u{1F4C4}'
  const badge = node.fileCount > 0 ? `${node.fileCount}` : ''

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        background: bgColor,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: node.type === 'building' ? '8px' : node.type === 'floor' ? '6px' : '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        gap: '4px',
        fontSize,
        color: colors.text,
        fontFamily: 'Consolas, monospace',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'border-color 0.15s, background 0.15s',
        boxSizing: 'border-box',
        userSelect: 'none',
        zIndex: isSelected ? 10 : node.type === 'building' ? 3 : node.type === 'floor' ? 2 : 1,
      }}
      title={`${node.label}\nFiles: ${node.fileCount}\nLines: ${node.lineCount}\nExports: ${node.exportsCount}`}
    >
      <span style={{ fontSize: iconSize, flexShrink: 0 }}>{icon}</span>
      <span style={{
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: node.type === 'building' ? 600 : 400,
      }}>
        {node.label}
      </span>
      {badge && (
        <span style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '3px',
          padding: '0 3px',
          fontSize: Math.max(8, fontSize - 2),
          flexShrink: 0,
        }}>
          {badge}
        </span>
      )}
      {isCollapsed && node.children && node.children.length > 0 && (
        <span style={{ fontSize: iconSize, flexShrink: 0, marginLeft: '2px' }}>+{node.children.length}</span>
      )}
    </div>
  )
}
