import { useI18n } from '../../../i18n'
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
  { key: 'module', label: 'moduleView', desc: 'moduleViewDesc' },
  { key: 'calls', label: 'callsView', desc: 'callsViewDesc' },
  { key: 'inheritance', label: 'inheritanceView', desc: 'inheritanceViewDesc' },
  { key: 'circular', label: 'circularView', desc: 'circularViewDesc' },
  { key: 'unused', label: 'unusedView', desc: 'unusedViewDesc' },
]

export function MapControls({
  viewMode, filter, onViewModeChange, onFilterChange, onRefresh, loading,
}: MapControlsProps) {
  const { t } = useI18n()

  const gt = (key: string): string => (t.graph as Record<string, string>)[key] || key

  return (
    <div className="map-controls">
      <div className="map-controls-row">
        <div className="map-view-modes">
          {VIEW_MODES.map(m => (
            <button
              key={m.key}
              className={`map-view-btn ${viewMode === m.key ? 'active' : ''}`}
              onClick={() => onViewModeChange(m.key)}
              title={gt(m.desc)}
            >
              {gt(m.label)}
            </button>
          ))}
        </div>
        <div className="map-controls-actions">
          <button
            className="map-refresh-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? t.graph.loading : `↻ ${t.graph.refresh}`}
          </button>
        </div>
      </div>
      <div className="map-controls-row map-filter-row">
        <input
          type="text"
          className="map-search-input"
          placeholder={t.graph.searchPlaceholder}
          value={filter.searchQuery}
          onChange={e => onFilterChange({ searchQuery: e.target.value })}
        />
        <label className="map-filter-check">
          <input
            type="checkbox"
            checked={filter.onlyHighRisk}
            onChange={e => onFilterChange({ onlyHighRisk: e.target.checked })}
          />
          {t.graph.highRiskOnly}
        </label>
        <label className="map-filter-weight">
          {t.graph.minWeight}:
          <select
            value={filter.minEdgeWeight}
            onChange={e => onFilterChange({ minEdgeWeight: Number(e.target.value) })}
          >
            <option value={0}>{t.graph.all}</option>
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
