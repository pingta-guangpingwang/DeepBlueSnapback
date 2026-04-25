import type { CameraMode } from '../../types/ai-workshop'

interface HUDProps {
  characterName: string
  gold: number
  tasksCompleted: number
  linesChanged: number
  cameraMode: CameraMode
  isStale: boolean
  onToggleCamera: () => void
}

export default function HUD({
  characterName, gold, tasksCompleted, linesChanged, cameraMode, isStale, onToggleCamera,
}: HUDProps) {
  return (
    <div className="ws-hud">
      <div className="ws-hud-left">
        <div className="ws-hud-stat">
          <span className="ws-hud-icon">🧙</span>
          <span className="ws-hud-val">{characterName}</span>
        </div>
        <div className="ws-hud-stat ws-hud-gold">
          <span className="ws-hud-icon">💰</span>
          <span className="ws-hud-val">{gold}</span>
        </div>
        <div className="ws-hud-stat">
          <span className="ws-hud-icon">🏆</span>
          <span className="ws-hud-val">{tasksCompleted}</span>
        </div>
        <div className="ws-hud-stat">
          <span className="ws-hud-icon">📝</span>
          <span className="ws-hud-val">{linesChanged} lines</span>
        </div>
      </div>
      <div className="ws-hud-right">
        <span className={`ws-status ${isStale ? 'ws-status-idle' : 'ws-status-live'}`}>
          {isStale ? '⏳ Idle' : '🟢 Live'}
        </span>
        <button className="ws-cam-btn" onClick={onToggleCamera}>
          {cameraMode === 'follow' ? '📹' : '🔍'}
        </button>
      </div>
    </div>
  )
}
