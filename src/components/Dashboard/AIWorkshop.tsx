import { useState } from 'react'
import { useAppState } from '../../context/AppContext'
import { useAIWorkshop } from '../../hooks/useAIWorkshop'
import HUD from '../AIWorkshop/HUD'
import WorkshopCanvas from '../AIWorkshop/WorkshopCanvas'
import EventLog from '../AIWorkshop/EventLog'

const STATUS_ICON: Record<string, string> = {
  empty: '⬜',
  active: '🟦',
  complete: '🟩',
  building: '🟧',
}

export default function AIWorkshop() {
  const [state] = useAppState()
  const { data, isStale, isSynced } = useAIWorkshop(state.projectPath ?? '')
  const [cameraMode, setCameraMode] = useState<'follow' | 'free'>('follow')

  return (
    <div className="workshop-container">
      <HUD
        characterName={data.character.name}
        gold={data.stats.gold}
        tasksCompleted={data.stats.tasksCompleted}
        linesChanged={data.stats.linesChanged}
        cameraMode={cameraMode}
        isStale={isStale}
        onToggleCamera={() => setCameraMode(m => m === 'follow' ? 'free' : 'follow')}
      />
      <div className="ws-main-area">
        <WorkshopCanvas data={data} cameraMode={cameraMode} />
        <div className="ws-module-panel">
          <div className="ws-module-title">Modules</div>
          {data.modules.map(m => (
            <div
              key={m.id}
              className={`ws-module-item ${data.character.position === m.id ? 'ws-module-active' : ''}`}
            >
              <span className="ws-module-dot">{STATUS_ICON[m.status] ?? '⬜'}</span>
              <span className="ws-module-name">{m.name}</span>
            </div>
          ))}
        </div>
        <EventLog data={data} />
      </div>
      {!isSynced && (
        <div className="workshop-sync-banner">
          <span className="sync-dot" />
          Waiting for AI data sync...
        </div>
      )}
    </div>
  )
}
