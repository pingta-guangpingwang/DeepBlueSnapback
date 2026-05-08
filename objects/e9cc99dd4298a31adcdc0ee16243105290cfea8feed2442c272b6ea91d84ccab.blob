import { useState } from 'react'
import type { GraphDiff } from '../../types/graph'

interface GraphDiffViewProps {
  diff: GraphDiff | null
  loading: boolean
  error: string | null
  versionA: string | null
  versionB: string | null
  onClose: () => void
}

export function GraphDiffView({ diff, loading, error, versionA, versionB, onClose }: GraphDiffViewProps) {
  const [view, setView] = useState<'summary' | 'nodes' | 'edges'>('summary')

  if (!diff && !loading) return null

  const formatId = (id: string) => id.length > 30 ? id.slice(0, 14) + '...' + id.slice(-8) : id

  return (
    <div className="graph-diff-panel">
      <div className="graph-diff-header">
        <h4>Graph Comparison</h4>
        <div className="graph-diff-versions">
          <code>{versionA ? formatId(versionA) : '—'}</code>
          <span className="graph-diff-arrow">vs</span>
          <code>{versionB ? formatId(versionB) : '—'}</code>
        </div>
        <div className="graph-diff-actions">
          <div className="graph-diff-tabs">
            <button className={`graph-diff-tab ${view === 'summary' ? 'active' : ''}`} onClick={() => setView('summary')}>Summary</button>
            <button className={`graph-diff-tab ${view === 'nodes' ? 'active' : ''}`} onClick={() => setView('nodes')}>Nodes</button>
            <button className={`graph-diff-tab ${view === 'edges' ? 'active' : ''}`} onClick={() => setView('edges')}>Edges</button>
          </div>
          <button className="graph-diff-close" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="graph-diff-body">
        {loading && <p className="graph-diff-loading">Comparing graphs...</p>}
        {error && <p className="graph-diff-error">{error}</p>}

        {diff && view === 'summary' && (
          <div className="graph-diff-summary">
            <div className="graph-diff-stat added">
              <span className="graph-diff-stat-value">+{diff.summary.nodesAdded}</span>
              <span className="graph-diff-stat-label">Nodes Added</span>
            </div>
            <div className="graph-diff-stat removed">
              <span className="graph-diff-stat-value">−{diff.summary.nodesRemoved}</span>
              <span className="graph-diff-stat-label">Nodes Removed</span>
            </div>
            <div className="graph-diff-stat modified">
              <span className="graph-diff-stat-value">~{diff.summary.nodesModified}</span>
              <span className="graph-diff-stat-label">Nodes Modified</span>
            </div>
            <div className="graph-diff-stat added">
              <span className="graph-diff-stat-value">+{diff.summary.edgesAdded}</span>
              <span className="graph-diff-stat-label">Edges Added</span>
            </div>
            <div className="graph-diff-stat removed">
              <span className="graph-diff-stat-value">−{diff.summary.edgesBroken}</span>
              <span className="graph-diff-stat-label">Edges Broken</span>
            </div>
          </div>
        )}

        {diff && view === 'nodes' && (
          <div className="graph-diff-nodes">
            {diff.addedNodes.length > 0 && (
              <div className="graph-diff-section">
                <h5 className="graph-diff-section-title added">Added Nodes ({diff.addedNodes.length})</h5>
                <div className="graph-diff-node-list">
                  {diff.addedNodes.map(n => (
                    <div key={n.id} className="graph-diff-node-item added">
                      <span className="graph-diff-node-type">{n.type}</span>
                      <span className="graph-diff-node-label">{n.label}</span>
                      <span className="graph-diff-node-path">{n.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {diff.removedNodes.length > 0 && (
              <div className="graph-diff-section">
                <h5 className="graph-diff-section-title removed">Removed Nodes ({diff.removedNodes.length})</h5>
                <div className="graph-diff-node-list">
                  {diff.removedNodes.map(n => (
                    <div key={n.id} className="graph-diff-node-item removed">
                      <span className="graph-diff-node-type">{n.type}</span>
                      <span className="graph-diff-node-label">{n.label}</span>
                      <span className="graph-diff-node-path">{n.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {diff.modifiedNodes.length > 0 && (
              <div className="graph-diff-section">
                <h5 className="graph-diff-section-title modified">Modified Nodes ({diff.modifiedNodes.length})</h5>
                <div className="graph-diff-node-list">
                  {diff.modifiedNodes.map(({ before, after }) => (
                    <div key={before.id} className="graph-diff-node-item modified">
                      <span className="graph-diff-node-label">{before.label}</span>
                      <div className="graph-diff-node-changes">
                        {before.fileCount !== after.fileCount && (
                          <span>Files: {before.fileCount} → {after.fileCount}</span>
                        )}
                        {before.lineCount !== after.lineCount && (
                          <span>Lines: {before.lineCount} → {after.lineCount}</span>
                        )}
                        {before.exportsCount !== after.exportsCount && (
                          <span>Exports: {before.exportsCount} → {after.exportsCount}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {diff.addedNodes.length === 0 && diff.removedNodes.length === 0 && diff.modifiedNodes.length === 0 && (
              <p className="graph-diff-empty">No node changes between these versions.</p>
            )}
          </div>
        )}

        {diff && view === 'edges' && (
          <div className="graph-diff-nodes">
            {diff.addedEdges.length > 0 && (
              <div className="graph-diff-section">
                <h5 className="graph-diff-section-title added">Added Edges ({diff.addedEdges.length})</h5>
                <div className="graph-diff-edge-list">
                  {diff.addedEdges.map(e => (
                    <div key={e.id} className={`graph-diff-edge-item edge-${e.type}`}>
                      <span className="graph-diff-edge-type">{e.type}</span>
                      <code>{formatId(e.source)}</code>
                      <span>→</span>
                      <code>{formatId(e.target)}</code>
                      {e.label && <span className="graph-diff-edge-label">({e.label})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {diff.brokenEdges.length > 0 && (
              <div className="graph-diff-section">
                <h5 className="graph-diff-section-title removed">Broken Edges ({diff.brokenEdges.length})</h5>
                <div className="graph-diff-edge-list">
                  {diff.brokenEdges.map(e => (
                    <div key={e.id} className={`graph-diff-edge-item broken edge-${e.type}`}>
                      <span className="graph-diff-edge-type">{e.type}</span>
                      <code>{formatId(e.source)}</code>
                      <span>→</span>
                      <code>{formatId(e.target)}</code>
                      {e.label && <span className="graph-diff-edge-label">({e.label})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {diff.addedEdges.length === 0 && diff.brokenEdges.length === 0 && (
              <p className="graph-diff-empty">No edge changes between these versions.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
