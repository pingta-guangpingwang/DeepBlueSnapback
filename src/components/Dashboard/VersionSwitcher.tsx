import { useVersionSwitch } from '../../hooks/useVersionSwitch'
import { useAppState } from '../../context/AppContext'

interface VersionSwitcherProps {
  repoPath: string
  viewedVersion: string | null
  isViewing: boolean
  onSwitchToVersion: (repoPath: string, version: string) => Promise<void>
  onReleaseVersion: () => Promise<void>
  switching: boolean
  error: string | null
}

export function VersionSwitcherBanner({
  repoPath, viewedVersion, isViewing, onSwitchToVersion, onReleaseVersion, switching, error,
}: VersionSwitcherProps) {
  if (!isViewing || !viewedVersion) return null

  return (
    <div className="version-switch-banner">
      <div className="version-switch-banner-left">
        <span className="version-switch-icon">🔒</span>
        <span className="version-switch-text">
          Read-only mode — viewing version <code>{viewedVersion.slice(0, 12)}</code>
        </span>
      </div>
      <div className="version-switch-banner-right">
        {switching && <span className="version-switch-loading">Switching...</span>}
        <button
          className="version-switch-return-btn"
          onClick={onReleaseVersion}
          disabled={switching}
        >
          Return to Live
        </button>
      </div>
      {error && <span className="version-switch-error">{error}</span>}
    </div>
  )
}

interface VersionViewButtonProps {
  version: string
  versionLabel: string
  repoPath: string
  isCurrentViewing: boolean
  onView: (version: string) => void
}

export function VersionViewButton({ version, versionLabel, repoPath, isCurrentViewing, onView }: VersionViewButtonProps) {
  return (
    <button
      className={`version-view-btn ${isCurrentViewing ? 'active' : ''}`}
      onClick={() => onView(version)}
      title={`View version ${versionLabel} in read-only mode`}
      style={{
        fontSize: '11px',
        padding: '2px 8px',
        border: '1px solid #60a5fa',
        borderRadius: '4px',
        background: isCurrentViewing ? '#2563eb' : 'transparent',
        color: isCurrentViewing ? '#fff' : '#60a5fa',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {isCurrentViewing ? 'Viewing' : 'View'}
    </button>
  )
}
