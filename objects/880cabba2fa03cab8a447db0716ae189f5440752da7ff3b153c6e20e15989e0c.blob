import { useI18n } from '../../../i18n'
import type { GraphNode, GraphEdge } from '../../../types/graph'

interface MapTooltipProps {
  node: GraphNode | null
  edge: GraphEdge | null
  x: number
  y: number
  visible: boolean
}

export function MapTooltip({ node, edge, x, y, visible }: MapTooltipProps) {
  const { t } = useI18n()

  if (!visible || (!node && !edge)) return null

  return (
    <div
      className="map-tooltip"
      style={{ left: x + 12, top: y + 12 }}
    >
      {node && (
        <div className="map-tooltip-content">
          <div className="map-tooltip-header">
            <span className="map-tooltip-type">{node.type.toUpperCase()}</span>
            <span className="map-tooltip-label">{node.label}</span>
          </div>
          <div className="map-tooltip-stats">
            <span>{t.graph.nodeFiles}: {node.fileCount}</span>
            <span>{t.graph.nodeLines}: {node.lineCount.toLocaleString()}</span>
            <span>{t.graph.nodeExports}: {node.exportsCount}</span>
          </div>
          {node.path && (
            <div className="map-tooltip-path">{node.path}</div>
          )}
          {node.children && node.children.length > 0 && (
            <div className="map-tooltip-hint">
              {t.graph.doubleClickHint.replace('{action}', t.graph.expand)}
            </div>
          )}
        </div>
      )}
      {edge && (
        <div className="map-tooltip-content">
          <div className="map-tooltip-header">
            <span className={`map-tooltip-type map-tooltip-edge-${edge.type}`}>{edge.type.toUpperCase()}</span>
            {edge.label && <span className="map-tooltip-label">{edge.label}</span>}
          </div>
          <div className="map-tooltip-stats">
            <span>{t.graph.nodeIncoming}: {edge.weight}</span>
            <span>{t.graph.nodeFiles}: {edge.files.length}</span>
          </div>
          <div className="map-tooltip-files">
            {edge.files.slice(0, 3).map(f => (
              <div key={f} className="map-tooltip-file">{f}</div>
            ))}
            {edge.files.length > 3 && <div className="map-tooltip-more">+{edge.files.length - 3} {t.graph.more}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
