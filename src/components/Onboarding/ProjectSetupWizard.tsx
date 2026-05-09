import { useState } from 'react'
import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'

type WorkMode = 'ai' | 'manual' | 'hybrid'

const MODES: { key: WorkMode; icon: string; color: string }[] = [
  { key: 'ai', icon: '🤖', color: '#7c3aed' },
  { key: 'manual', icon: '✋', color: '#2563eb' },
  { key: 'hybrid', icon: '🔀', color: '#16a34a' },
]

export default function ProjectSetupWizard() {
  const [state, dispatch] = useAppState()
  const { t } = useI18n()
  const [step, setStep] = useState(0)
  const [action, setAction] = useState<'create' | 'import' | null>(null)
  const [projectName, setProjectName] = useState('')
  const [importPath, setImportPath] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode>('hybrid')
  const [snapshotEnabled, setSnapshotEnabled] = useState(true)
  const [snapshotInterval, setSnapshotInterval] = useState(30)
  const [working, setWorking] = useState(false)

  const close = async () => {
    await window.electronAPI.setOnboardingCompleted(true)
    dispatch({ type: 'SET_SHOW_ONBOARDING', payload: false })
  }

  const handleFinish = async () => {
    if (!state.rootRepositoryPath) return
    setWorking(true)
    try {
      if (action === 'create' && projectName.trim()) {
        const result = await window.electronAPI.createProject(state.rootRepositoryPath, projectName.trim())
        if (!result.success) {
          dispatch({ type: 'SET_MESSAGE', payload: result.message || 'Failed to create project' })
          setWorking(false)
          return
        }
      } else if (action === 'import' && importPath && projectName.trim()) {
        const result = await window.electronAPI.registerProject(state.rootRepositoryPath, importPath, projectName.trim(), true)
        if (!result.success) {
          dispatch({ type: 'SET_MESSAGE', payload: result.message || 'Failed to import project' })
          setWorking(false)
          return
        }
      }
    } catch (err) {
      dispatch({ type: 'SET_MESSAGE', payload: String(err) })
      setWorking(false)
      return
    }

    // Save preferences
    try {
      localStorage.setItem('dbht_work_mode', workMode)
      localStorage.setItem('dbht_auto_snapshot', JSON.stringify({ enabled: snapshotEnabled, interval: snapshotInterval }))
    } catch { /* ignore */ }

    // Refresh project list then close
    try {
      const projResult = await window.electronAPI.getProjects(state.rootRepositoryPath)
      if (projResult.success && projResult.projects) {
        dispatch({ type: 'SET_PROJECTS', payload: projResult.projects })
      }
    } catch { /* ignore */ }

    await close()
  }

  const canProceed = () => {
    if (step === 0) {
      if (!action) return false
      if (action === 'create') return projectName.trim().length > 0
      if (action === 'import') return projectName.trim().length > 0 && importPath.length > 0
      return false
    }
    return true
  }

  const selectImportFolder = async () => {
    const folder = await window.electronAPI.selectFolder()
    if (folder) {
      setImportPath(folder)
      if (!projectName) {
        setProjectName(folder.split(/[/\\]/).pop() || '')
      }
    }
  }

  return (
    <div className="onboarding-overlay" onClick={close}>
      <div className="onboarding-card" style={{ maxWidth: '560px', width: '560px' }} onClick={e => e.stopPropagation()}>
        {/* Progress bar */}
        <div className="onboarding-progress">
          <div
            className="onboarding-progress-fill"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>

        <div className="onboarding-content" style={{ padding: '20px 28px' }}>
          {/* Step 1: Choose action */}
          {step === 0 && (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#1f2937' }}>{t.setupWizard.step1Title}</h2>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6b7280' }}>{t.setupWizard.step1Desc}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => setAction('create')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px', border: `2px solid ${action === 'create' ? '#4f46e5' : '#e5e7eb'}`,
                    borderRadius: '10px', background: action === 'create' ? '#eef2ff' : '#fff',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: '28px' }}>🆕</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>{t.setupWizard.createNew}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{t.setupWizard.createNewDesc}</div>
                  </div>
                </button>

                <button
                  onClick={() => setAction('import')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px', border: `2px solid ${action === 'import' ? '#4f46e5' : '#e5e7eb'}`,
                    borderRadius: '10px', background: action === 'import' ? '#eef2ff' : '#fff',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: '28px' }}>📥</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>{t.setupWizard.importExisting}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{t.setupWizard.importExistingDesc}</div>
                  </div>
                </button>
              </div>

              {action && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                      {t.setupWizard.projectName}
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      placeholder={t.setupWizard.projectNamePlaceholder}
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: '13px',
                        border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {action === 'import' && (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                        {t.setupWizard.projectPath}
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={importPath}
                          readOnly
                          placeholder={t.setupWizard.selectPath}
                          style={{
                            flex: 1, padding: '8px 12px', fontSize: '13px',
                            border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none',
                            background: '#f9fafb', color: '#6b7280', cursor: 'default',
                          }}
                        />
                        <button
                          onClick={selectImportFolder}
                          style={{
                            padding: '8px 14px', fontSize: '12px', fontWeight: 500,
                            border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          {t.setupWizard.selectPath}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 2: Work mode */}
          {step === 1 && (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#1f2937' }}>{t.setupWizard.step2Title}</h2>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6b7280' }}>{t.setupWizard.step2Desc}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {MODES.map(mode => (
                  <button
                    key={mode.key}
                    onClick={() => setWorkMode(mode.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 16px',
                      border: `2px solid ${workMode === mode.key ? mode.color : '#e5e7eb'}`,
                      borderRadius: '10px',
                      background: workMode === mode.key ? `${mode.color}08` : '#fff',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>{mode.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>
                        {mode.key === 'ai' ? t.setupWizard.modeAI :
                         mode.key === 'manual' ? t.setupWizard.modeManual :
                         t.setupWizard.modeHybrid}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {mode.key === 'ai' ? t.setupWizard.modeAIDesc :
                         mode.key === 'manual' ? t.setupWizard.modeManualDesc :
                         t.setupWizard.modeHybridDesc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Auto-snapshot */}
          {step === 2 && (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#1f2937' }}>{t.setupWizard.step3Title}</h2>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6b7280' }}>{t.setupWizard.step3Desc}</p>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: '#f9fafb', borderRadius: '8px',
                border: '1px solid #e5e7eb', marginBottom: '16px',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{t.setupWizard.snapshotEnabled}</span>
                <button
                  onClick={() => setSnapshotEnabled(!snapshotEnabled)}
                  style={{
                    width: '48px', height: '26px', borderRadius: '13px', border: 'none',
                    background: snapshotEnabled ? '#16a34a' : '#d1d5db',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: snapshotEnabled ? '25px' : '3px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>

              {snapshotEnabled && (
                <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>
                    {t.setupWizard.snapshotInterval}: {snapshotInterval} min
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={snapshotInterval}
                    onChange={e => setSnapshotInterval(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#4f46e5' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                    <span>5 min</span>
                    <span>120 min</span>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#9ca3af' }}>{t.setupWizard.snapshotHint}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Step dots */}
        <div className="onboarding-step-dots">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              className={`onboarding-dot ${i === step ? 'active' : ''}`}
              onClick={() => setStep(i)}
              style={i === step ? { background: '#4f46e5' } : {}}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={close}>
            {t.onboarding.skip}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 0 && (
              <button className="onboarding-prev" onClick={() => setStep(step - 1)}>
                {t.setupWizard.back}
              </button>
            )}
            {step < 2 ? (
              <button
                className="onboarding-next"
                style={{ background: '#4f46e5' }}
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                {t.onboarding.next}
              </button>
            ) : (
              <button
                className="onboarding-finish"
                style={{ background: '#16a34a' }}
                onClick={handleFinish}
                disabled={!canProceed() || working}
              >
                {working ? (action === 'create' ? t.setupWizard.creating : t.setupWizard.importing) : t.setupWizard.finish}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
