import { useState, useRef, useEffect } from 'react'
import { useI18n } from '../../../i18n'
import type { CommandMessage, HorseFarmProject } from '../../../types/horseFarm'

interface CommandCenterProps {
  commands: CommandMessage[]
  projectIds: string[]
  hfProjects: Record<string, HorseFarmProject>
  onSend: (projectPath: string | null, content: string) => void
  onClear: () => void
}

export default function CommandCenter({ commands, projectIds, hfProjects, onSend, onClear }: CommandCenterProps) {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [targetProject, setTargetProject] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [commands])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(targetProject, trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="hf-command-center">
      <div className="hf-command-messages">
        {commands.length === 0 && (
          <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
            {t.horseFarm.commandPlaceholder}
          </div>
        )}
        {commands.map(msg => (
          <div key={msg.id} className={`hf-command-msg ${msg.sender}`}>
            {msg.projectPath && (
              <div className="msg-project">
                [{hfProjects[msg.projectPath]?.projectName || msg.projectPath.split('\\').pop()}]
              </div>
            )}
            <div>{msg.content}</div>
            <div className="msg-time">{formatTime(msg.timestamp)}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="hf-command-input-row">
        <select
          value={targetProject || ''}
          onChange={e => setTargetProject(e.target.value || null)}
        >
          <option value="">{t.horseFarm.commandTargetAll}</option>
          {projectIds.map(id => {
            const proj = hfProjects[id]
            return (
              <option key={id} value={id}>
                {proj?.projectName || id.split('\\').pop()}
              </option>
            )
          })}
        </select>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.horseFarm.commandPlaceholder}
        />
        <button onClick={handleSend}>{t.horseFarm.commandSend}</button>
        {commands.length > 0 && (
          <button
            onClick={onClear}
            style={{ padding: '6px 10px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
          >{t.horseFarm.commandClear}</button>
        )}
      </div>
    </div>
  )
}
