import type { GraphEdge } from '../../../types/graph'

interface EdgeRendererProps {
  edge: GraphEdge
  sourceX: number
  sourceY: number
  sourceW: number
  sourceH: number
  targetX: number
  targetY: number
  targetW: number
  targetH: number
  scale: number
}

const EDGE_COLORS: Record<string, string> = {
  pipeline: '#5ea8ff',
  hierarchy: '#a78bfa',
  flow: '#34d399',
  circular: '#ff5555',
}

const EDGE_DASH: Record<string, string> = {
  pipeline: '',
  hierarchy: '7,4',
  flow: '4,3',
  circular: '',
}

export function EdgeRenderer({
  edge,
  sourceX, sourceY, sourceW, sourceH,
  targetX, targetY, targetW, targetH,
  scale,
}: EdgeRendererProps) {
  const color = EDGE_COLORS[edge.type] || '#8899aa'
  const dash = EDGE_DASH[edge.type] || ''
  const strokeWidth = edge.type === 'circular' ? 2.5 : edge.type === 'pipeline' ? 1.3 : 1
  const opacity = edge.type === 'flow' ? 0.55 : edge.type === 'circular' ? 0.95 : 0.75

  // Connect from right center of source to left center of target
  const sx = sourceX + sourceW
  const sy = sourceY + sourceH / 2
  const tx = targetX
  const ty = targetY + targetH / 2

  // Bezier curve control points
  const dx = Math.abs(tx - sx) * 0.4
  const cpx1 = sx + dx
  const cpy1 = sy
  const cpx2 = tx - dx
  const cpy2 = ty

  const path = `M ${sx} ${sy} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${tx} ${ty}`

  // Arrow at target end
  const arrowSize = 5 * scale
  const angle = Math.atan2(ty - cpy2, tx - cpx2)
  const ax1 = tx - arrowSize * Math.cos(angle - Math.PI / 6)
  const ay1 = ty - arrowSize * Math.sin(angle - Math.PI / 6)
  const ax2 = tx - arrowSize * Math.cos(angle + Math.PI / 6)
  const ay2 = ty - arrowSize * Math.sin(angle + Math.PI / 6)

  return (
    <g>
      <path
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        fill="none"
        opacity={opacity}
        style={{ pointerEvents: 'stroke' }}
      />
      <polygon
        points={`${tx},${ty} ${ax1},${ay1} ${ax2},${ay2}`}
        fill={color}
        opacity={opacity}
      />
      {edge.label && scale > 0.5 && (
        <text
          x={(sx + tx) / 2}
          y={(sy + ty) / 2 - 5}
          fill={color}
          fontSize={Math.max(8, 9.5 * scale)}
          textAnchor="middle"
          opacity={0.8}
          fontFamily="'Segoe UI', system-ui, sans-serif"
          fontWeight={500}
        >
          {edge.label.length > 20 ? edge.label.slice(0, 18) + '...' : edge.label}
        </text>
      )}
    </g>
  )
}
