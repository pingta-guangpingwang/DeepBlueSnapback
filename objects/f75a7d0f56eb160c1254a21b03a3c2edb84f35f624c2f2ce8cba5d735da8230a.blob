import { useI18n } from '../../../i18n'

export function MapLegend() {
  const { t } = useI18n()

  return (
    <div className="map-legend">
      <div className="map-legend-section">
        <span className="map-legend-title">{String(t.graph.legendNodes)}</span>
        <div className="map-legend-item">
          <span className="map-legend-swatch" style={{ background: '#142c5e', borderColor: '#4da2ff' }} />
          <span>{String(t.graph.building)}</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-swatch" style={{ background: '#162542', borderColor: '#5b7fbf' }} />
          <span>{String(t.graph.floor)}</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-swatch" style={{ background: '#111c2e', borderColor: '#3e5270' }} />
          <span>{String(t.graph.room)}</span>
        </div>
      </div>
      <div className="map-legend-section">
        <span className="map-legend-title">{String(t.graph.legendEdges)}</span>
        <div className="map-legend-item">
          <span className="map-legend-line" style={{ background: '#5ea8ff' }} />
          <span>{String(t.graph.pipeline)}</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-line" style={{ background: '#a78bfa', borderStyle: 'dashed' }} />
          <span>{String(t.graph.hierarchy)}</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-line" style={{ background: '#34d399', borderStyle: 'dotted' }} />
          <span>{String(t.graph.flow)}</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-line" style={{ background: '#ff5555' }} />
          <span className="map-legend-highlight">{String(t.graph.circular)}</span>
        </div>
      </div>
    </div>
  )
}
