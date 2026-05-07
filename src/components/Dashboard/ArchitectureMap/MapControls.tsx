import type { GraphViewMode, GraphFilter } from '../../../types/graph'

interface MapControlsProps {
  viewMode: GraphViewMode
  filter: GraphFilter
  onViewModeChange: (mode: GraphViewMode) => void
  onFilterChange: (filter: Partial<GraphFilter>) => void
  onRefresh: () => void
  loading: boolean
}

const VIEW_MODES: Array<{ key: GraphViewMode; label: string; desc: string }> = [
  { key: 'module', label: 'Modules', desc: 'Folder/file tree structure' },
  { key: 'calls', label: 'Call Graph', desc: 'Function call relationships' },
  { key: 'inheritance', label: 'Inheritance', desc: 'Class hierarchy' },
  { key: 'circular', label: 'Circular Deps', desc: 'Dependency cycles' },
  { key: 'unused', label: 'Orphans', desc: 'Unused/dead code' },
]

export function MapControls({
  viewMode, filter, onViewModeChange, onFilterChange, onRefresh, loading,
}: MapControlsProps) {
  return (
    <div className="map-controls">
      <div className="map-controls-row">
        <div className="map-view-modes">
          {VIEW_MODES.map(m => (
            <button
              key={m.key}
              className={`map-view-btn ${viewMode === m.key ? 'active' : ''}`}
              onClick={() => onViewModeChange(m.key)}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="map-controls-actions">
          <button
            className="map-refresh-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>
      </div>
      <div className="map-controls-row map-filter-row">
        <input
          type="text"
          className="map-search-input"
          placeholder="Search node..."
          value={filter.searchQuery}
          onChange={e => onFilterChange({ searchQuery: e.target.value })}
        />
        <label className="map-filter-check">
          <input
            type="checkbox"
            checked={filter.onlyHighRisk}
            onChange={e => onFilterChange({ onlyHighRisk: e.target.checked })}
          />
          High risk only
        </label>
        <label className="map-filter-weight">
          Min weight:
          <select
            value={filter.minEdgeWeight}
            onChange={e => onFilterChange({ minEdgeWeight: Number(e.target.value) })}
          >
            <option value={0}>All</option>
            <option value={1}>≥ 1</option>
            <option value={3}>≥ 3</option>
            <option value={5}>≥ 5</option>
            <option value={10}>≥ 10</option>
          </select>
        </label>
      </div>
    </div>
  )
}
