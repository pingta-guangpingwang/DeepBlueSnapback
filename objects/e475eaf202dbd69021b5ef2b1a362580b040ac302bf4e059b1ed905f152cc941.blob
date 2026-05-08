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
  building: { bg: '#142c5e', border: '#4da2ff', text: '#d6e5ff' },
  floor: { bg: '#162542', border: '#5b7fbf', text: '#cddbf5' },
  room: { bg: '#111c2e', border: '#3e5270', text: '#a8bcd4' },
}

export function NodeRenderer({ node, position, isSelected, isCollapsed, isHighRisk, scale }: NodeRendererProps) {
  const colors = TYPE_COLORS[node.type] || TYPE_COLORS.room
  const { x, y, width, height } = position

  const borderColor = isSelected ? '#70b8ff' : isHighRisk ? '#ff6464' : colors.border
  const borderWidth = isSelected ? 2 : isHighRisk ? 2 : 1
  const bgColor = isHighRisk
    ? 'rgba(255, 80, 80, 0.12)'
    : isSelected
      ? 'rgba(59, 130, 246, 0.25)'
      : colors.bg
  const fontSize = Math.max(9.5, Math.min(12, 10.5 * scale))
  const iconSize = Math.max(9, Math.min(13, 11 * scale))

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
        padding: '0 8px',
        gap: '5px',
        fontSize,
        color: colors.text,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontWeight: node.type === 'building' ? 600 : node.type === 'floor' ? 500 : 450,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'border-color 0.15s, background 0.15s',
        boxSizing: 'border-box',
        userSelect: 'none',
        zIndex: isSelected ? 10 : node.type === 'building' ? 3 : node.type === 'floor' ? 2 : 1,
        textShadow: '0 1px 2px rgba(0,0,0,0.7)',
        letterSpacing: '0.02em',
      }}
      title={`${node.label}\nFiles: ${node.fileCount}\nLines: ${node.lineCount}\nExports: ${node.exportsCount}`}
    >
      <span style={{ fontSize: iconSize, flexShrink: 0, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>{icon}</span>
      <span style={{
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: node.type === 'building' ? 600 : node.type === 'floor' ? 500 : 450,
      }}>
        {node.label}
      </span>
      {badge && (
        <span style={{
          background: 'rgba(255,255,255,0.12)',
          borderRadius: '3px',
          padding: '0 4px',
          fontSize: Math.max(8, fontSize - 2),
          flexShrink: 0,
          fontWeight: 500,
          color: '#c4d5e8',
        }}>
          {badge}
        </span>
      )}
      {isCollapsed && node.children && node.children.length > 0 && (
        <span style={{
          fontSize: iconSize,
          flexShrink: 0,
          marginLeft: '2px',
          color: '#809ec0',
        }}>+{node.children.length}</span>
      )}
    </div>
  )
}
