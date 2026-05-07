import { useState, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'

interface BuildingNode {
  name: string
  path: string
  fileCount: number
  lineCount: number
  children: BuildingNode[]
}

interface Connection {
  from: string
  to: string
  count: number
  type: string
}

function BuildingCard({ building, connections, onExpand }: {
  building: BuildingNode
  connections: Connection[]
  onExpand: (name: string) => void
}) {
  const { t } = useI18n()
  const relatedConnections = connections.filter(c => c.from === building.name || c.to === building.name)
  const uniqueRelated = [...new Set(relatedConnections.map(c => c.from === building.name ? c.to : c.from))]

  return (
    <div className="simple-building-card" onClick={() => onExpand(building.name)}>
      <div className="simple-building-header">
        <span className="simple-building-icon">🏢</span>
        <span className="simple-building-name">{building.name}</span>
      </div>
      <div className="simple-building-stats">
        <span>{t.simpleView.floors}: {building.children.length}</span>
        <span>{t.simpleView.rooms}: {building.fileCount}</span>
        <span>{t.simpleView.pipes}: {relatedConnections.length}</span>
      </div>
      {uniqueRelated.length > 0 && (
        <div className="simple-building-connections">
          <span className="simple-connections-label">{t.simpleView.connectedTo}:</span>
          <div className="simple-connection-tags">
            {uniqueRelated.slice(0, 3).map(name => (
              <span key={name} className="simple-connection-tag">{name}</span>
            ))}
            {uniqueRelated.length > 3 && (
              <span className="simple-connection-more">+{uniqueRelated.length - 3}</span>
            )}
          </div>
        </div>
      )}
      <div className="simple-building-floors">
        {building.children.slice(0, 3).map(floor => (
          <div key={floor.name} className="simple-floor-row">
            <span className="simple-floor-icon">📂</span>
            <span className="simple-floor-name">{floor.name}</span>
            <span className="simple-floor-rooms">{floor.children.length} {t.simpleView.rooms}</span>
          </div>
        ))}
        {building.children.length > 3 && (
          <div className="simple-floor-more">
            +{building.children.length - 3} {t.simpleView.moreFloors}
          </div>
        )}
      </div>
    </div>
  )
}

function BuildingDetail({ building, connections, onBack }: {
  building: BuildingNode
  connections: Connection[]
  onBack: () => void
}) {
  const { t } = useI18n()
  const relatedConnections = connections.filter(c => c.from === building.name || c.to === building.name)

  return (
    <div className="simple-building-detail">
      <button className="simple-detail-back" onClick={onBack}>
        ← {t.simpleView.backToCity}
      </button>
      <div className="simple-detail-header">
        <span className="simple-building-icon-lg">🏢</span>
        <div>
          <h2>{building.name}</h2>
          <span className="simple-detail-subtitle">
            {building.children.length} {t.simpleView.floors}, {building.fileCount} {t.simpleView.rooms}, {building.lineCount} {t.simpleView.lines}
          </span>
        </div>
      </div>

      {relatedConnections.length > 0 && (
        <div className="simple-detail-pipes">
          <h3>🔗 {t.simpleView.pipelines}</h3>
          <div className="simple-pipes-list">
            {relatedConnections.map((c, i) => {
              const isOutgoing = c.from === building.name
              return (
                <div key={i} className={`simple-pipe ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                  <span className="simple-pipe-arrow">{isOutgoing ? '→' : '←'}</span>
                  <span className="simple-pipe-target">{isOutgoing ? c.to : c.from}</span>
                  <span className="simple-pipe-type">{c.type}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="simple-detail-floors">
        <h3>🏗️ {t.simpleView.floors}</h3>
        {building.children.map(floor => (
          <div key={floor.name} className="simple-floor-detail">
            <div className="simple-floor-header">
              <span>{floor.name}</span>
              <span className="simple-floor-stats">
                {floor.children.length} {t.simpleView.rooms} · {floor.lineCount} {t.simpleView.lines}
              </span>
            </div>
            <div className="simple-room-grid">
              {floor.children.slice(0, 6).map(room => (
                <div key={room.name} className="simple-room-chip">
                  <span className="simple-room-icon">📄</span>
                  <span>{room.name}</span>
                </div>
              ))}
              {floor.children.length > 6 && (
                <span className="simple-room-more">+{floor.children.length - 6}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SimpleView() {
  const [state] = useAppState()
  const { t } = useI18n()
  const [buildings, setBuildings] = useState<BuildingNode[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!state.projectPath) return
    loadData()
  }, [state.projectPath])

  const loadData = async () => {
    setLoading(true)
    try {
      const files = await window.electronAPI.listFiles(state.projectPath)
      if (!files.success || !files.files) return

      const root: BuildingNode = { name: '', path: state.projectPath, fileCount: 0, lineCount: 0, children: [] }
      const dirMap = new Map<string, BuildingNode>()

      // First pass: ensure all directories exist
      for (const f of files.files) {
        if (f.name.startsWith('.') && f.name !== '.tsx' && f.name !== '.ts' && f.name !== '.js') continue
        const parts = f.path.replace(/\\/g, '/').split('/')
        // Build directory nodes for all path segments
        let dirPath = ''
        for (const part of parts.slice(0, -1)) {
          dirPath = dirPath ? dirPath + '/' + part : part
          if (!dirMap.has(dirPath)) {
            dirMap.set(dirPath, {
              name: part,
              path: dirPath,
              fileCount: 0,
              lineCount: 0,
              children: [],
            })
          }
        }
      }

      // Attach children to parents
      for (const [dirPath, node] of dirMap) {
        const parentPath = dirPath.includes('/') ? dirPath.substring(0, dirPath.lastIndexOf('/')) : ''
        if (parentPath === '') {
          root.children.push(node)
        } else {
          const parent = dirMap.get(parentPath)
          if (parent && !parent.children.some(c => c.name === node.name)) {
            parent.children.push(node)
          }
        }
      }

      // Count files per directory
      for (const f of files.files) {
        if (f.isDirectory || f.name.startsWith('.')) continue
        const parts = f.path.replace(/\\/g, '/').split('/')
        // File belongs to its parent directory
        const dirPath = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
        const parent = dirMap.get(dirPath) || root
        parent.fileCount++
        // Add as leaf node
        const fileNode: BuildingNode = {
          name: parts[parts.length - 1],
          path: f.path,
          fileCount: 0,
          lineCount: 0,
          children: [],
        }
        parent.children.push(fileNode)
      }

      // Only keep top-level dirs with content
      const topLevel = root.children.filter(c => c.children.length > 0)
      setBuildings(topLevel)
      setConnections([])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const selected = buildings.find(b => b.name === selectedBuilding)

  if (loading) {
    return <div className="simple-view-loading">{t.graph.loading}</div>
  }

  if (selected) {
    return (
      <BuildingDetail
        building={selected}
        connections={connections}
        onBack={() => setSelectedBuilding(null)}
      />
    )
  }

  if (buildings.length === 0) {
    return (
      <div className="simple-view-empty">
        <span style={{ fontSize: '48px' }}>🏗️</span>
        <p>{t.simpleView.emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="simple-view">
      <div className="simple-view-header">
        <h2>{t.simpleView.title}</h2>
        <span className="simple-view-subtitle">
          {buildings.length} {t.simpleView.buildings}, {buildings.reduce((s, b) => s + b.fileCount, 0)} {t.simpleView.rooms}, {connections.length} {t.simpleView.pipes}
        </span>
      </div>
      <div className="simple-building-grid">
        {buildings.map(b => (
          <BuildingCard
            key={b.name}
            building={b}
            connections={connections}
            onExpand={setSelectedBuilding}
          />
        ))}
      </div>
    </div>
  )
}
