import { useState } from 'react'
import { useI18n } from '../../../i18n'
import type { HorseFarmProject } from '../../../types/horseFarm'
import type { Project } from '../../../context/AppContext'

interface PreProjectWorkflowProps {
  hfProject: HorseFarmProject
  project: Project | undefined
  onClose: () => void
  updateRequirements: (requirements: string) => void
  updateSummary: (summary: string) => void
  setPhase: (phase: HorseFarmProject['phase']) => void
  setMindmapPath: (path: string) => void
  setKnowledgeBasePath: (path: string) => void
  addSystemMessage: (content: string, type?: 'chat' | 'command' | 'status' | 'error') => void
}

type Step = 'requirements' | 'summarizing' | 'mindmapping' | 'done'

export default function PreProjectWorkflow({
  hfProject, project,
  onClose, updateRequirements, updateSummary, setPhase, setMindmapPath, setKnowledgeBasePath,
  addSystemMessage,
}: PreProjectWorkflowProps) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>(
    hfProject.phase === 'active' ? 'done' : hfProject.phase === 'mindmap' ? 'done' : 'requirements'
  )
  const [requirements, setRequirements] = useState(hfProject.requirements || '')
  const [summary, setSummary] = useState(hfProject.summary || '')
  const [loading, setLoading] = useState(false)

  const projectName = hfProject.projectName
  const projectPath = hfProject.projectPath

  const handleGenerateSummary = async () => {
    if (!requirements.trim()) return
    setLoading(true)
    setStep('summarizing')
    addSystemMessage(`${projectName}: ${t.horseFarm.summarizing}`, 'status')

    try {
      const result = await window.electronAPI.generateProjectSummary(projectPath, requirements)
      if (result.success && result.summary) {
        setSummary(result.summary)
        updateSummary(result.summary)
        updateRequirements(requirements)
        await window.electronAPI.saveHorseFarmData(projectPath, { requirements, summary: result.summary })
        addSystemMessage(`${projectName}: ${t.horseFarm.workflowComplete}`, 'status')
        setPhase('summarizing')
      } else {
        addSystemMessage(`${projectName}: ${result.message || 'Summary generation failed'}`, 'error')
      }
    } catch (err) {
      addSystemMessage(`${projectName}: ${String(err)}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateMindMap = async () => {
    setLoading(true)
    setStep('mindmapping')
    addSystemMessage(`${projectName}: ${t.horseFarm.generatingMindmap}`, 'status')

    try {
      const mindRes = await window.electronAPI.generateMindMap(projectPath, summary || requirements)
      if (mindRes.success && mindRes.filePath) {
        setMindmapPath(mindRes.filePath)
      }

      const kbRes = await window.electronAPI.generateKnowledgeBase(projectPath, projectName, summary || requirements, requirements)
      if (kbRes.success && kbRes.filePath) {
        setKnowledgeBasePath(kbRes.filePath)
        addSystemMessage(`${projectName}: ${t.horseFarm.generatingKB}`, 'status')
      }

      setPhase('active')
      setStep('done')
      addSystemMessage(`${projectName}: ${t.horseFarm.workflowComplete}`, 'status')
    } catch (err) {
      addSystemMessage(`${projectName}: ${String(err)}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const stepLabels = [
    { key: 'requirements', label: t.horseFarm.phaseRequirements },
    { key: 'summarizing', label: t.horseFarm.projectSummary },
    { key: 'mindmapping', label: t.horseFarm.mindMapPreview },
  ]

  return (
    <div className="hf-workflow-overlay" onClick={onClose}>
      <div className="hf-workflow-modal" onClick={e => e.stopPropagation()}>
        <div className="hf-workflow-header">
          <h3>{t.horseFarm.workflowTitle} — {projectName}</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="hf-workflow-steps">
          {stepLabels.map((sl, i) => (
            <div
              key={sl.key}
              className={`hf-workflow-step-indicator ${
                step === 'done' ? 'done' :
                step === sl.key || (step === 'summarizing' && i === 1) || (step === 'mindmapping' && i === 2) ? 'active' : ''
              }`}
            >
              {i + 1}. {sl.label}
            </div>
          ))}
        </div>

        <div className="hf-workflow-body">
          {(step === 'requirements' || step === 'summarizing') && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                {t.horseFarm.requirementsLabel}
              </label>
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder={t.horseFarm.requirementsPlaceholder}
                disabled={step === 'summarizing'}
              />
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                {t.horseFarm.requirementsHint}
              </div>
            </div>
          )}

          {step === 'summarizing' && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>🤖</div>
              <p>{t.horseFarm.summarizing}</p>
              {summary && (
                <div style={{
                  marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px',
                  border: '1px solid #bbf7d0', textAlign: 'left', fontSize: '13px', color: '#374151',
                  whiteSpace: 'pre-wrap',
                }}>
                  {summary}
                </div>
              )}
            </div>
          )}

          {step === 'mindmapping' && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>🧠</div>
              <p>{t.horseFarm.generatingMindmap}</p>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#059669' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <p style={{ fontSize: '16px', fontWeight: 600 }}>{t.horseFarm.workflowComplete}</p>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                {summary || requirements}
              </p>
            </div>
          )}
        </div>

        <div className="hf-workflow-footer">
          <button onClick={onClose}>{t.common.cancel}</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step === 'requirements' && (
              <button className="primary" onClick={handleGenerateSummary} disabled={loading || !requirements.trim()}>
                {t.horseFarm.generateSummary}
              </button>
            )}
            {step === 'summarizing' && summary && (
              <button className="primary" onClick={handleGenerateMindMap} disabled={loading}>
                {t.horseFarm.generateMindmap}
              </button>
            )}
            {step === 'summarizing' && !summary && (
              <button disabled style={{ opacity: 0.5 }}>
                {t.horseFarm.summarizing}
              </button>
            )}
            {step === 'done' && (
              <button className="primary" onClick={onClose}>
                {t.horseFarm.complete}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
