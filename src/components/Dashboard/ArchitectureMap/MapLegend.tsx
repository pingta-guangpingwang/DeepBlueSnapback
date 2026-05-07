export function MapLegend() {
  return (
    <div className="map-legend">
      <div className="map-legend-section">
        <span className="map-legend-title">Nodes</span>
        <div className="map-legend-item">
          <span className="map-legend-swatch" style={{ background: '#1e3a5f', borderColor: '#3b82f6' }} />
          <span>Building (root folder)</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-swatch" style={{ background: '#1e293b', borderColor: '#475569' }} />
          <span>Floor (subdirectory)</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-swatch" style={{ background: '#0f172a', borderColor: '#334155' }} />
          <span>Room (source file)</span>
        </div>
      </div>
      <div className="map-legend-section">
        <span className="map-legend-title">Edges</span>
        <div className="map-legend-item">
          <span className="map-legend-line" style={{ background: '#3b82f6' }} />
          <span>Pipeline (import)</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-line" style={{ background: '#8b5cf6', borderStyle: 'dashed' }} />
          <span>Hierarchy (extends)</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-line" style={{ background: '#10b981', borderStyle: 'dotted' }} />
          <span>Flow (call)</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-line" style={{ background: '#ef4444' }} />
          <span className="map-legend-highlight">Circular (cycle)</span>
        </div>
      </div>
    </div>
  )
}
