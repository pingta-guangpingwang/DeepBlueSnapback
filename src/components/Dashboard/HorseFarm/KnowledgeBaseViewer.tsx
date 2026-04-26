import { useState, useEffect } from 'react'
import { useI18n } from '../../../i18n'
import type { HorseFarmProject } from '../../../types/horseFarm'

interface KnowledgeBaseViewerProps {
  activeProject: string | null
  hfProjects: Record<string, HorseFarmProject>
}

export default function KnowledgeBaseViewer({ activeProject, hfProjects }: KnowledgeBaseViewerProps) {
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const hfProj = activeProject ? hfProjects[activeProject] : undefined

  useEffect(() => {
    if (!hfProj) {
      setContent('')
      return
    }
    const projectPath = hfProj.projectPath
    setLoading(true)
    window.electronAPI.readKnowledgeBase(projectPath)
      .then(res => {
        if (res.success && res.content) {
          setContent(res.content)
        } else {
          setContent('')
        }
      })
      .catch(() => setContent(''))
      .finally(() => setLoading(false))
  }, [activeProject, hfProj?.projectPath])

  if (!activeProject || !hfProj) {
    return (
      <div className="hf-empty-state">
        <p>{t.horseFarm.kbEmpty}</p>
      </div>
    )
  }

  if (loading) {
    return <div className="hf-loading"><span>📚</span> {t.horseFarm.kbLoading}</div>
  }

  if (!content) {
    return (
      <div className="hf-empty-state">
        <p>{t.horseFarm.kbEmpty}</p>
      </div>
    )
  }

  return (
    <div className="hf-kb-container">
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0', fontSize: '16px' }}>{hfProj.projectName} — {t.horseFarm.subTabKB}</h3>
      </div>
      <div className="hf-kb-content">{content}</div>
    </div>
  )
}
