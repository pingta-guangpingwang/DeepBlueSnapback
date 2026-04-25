import { useEffect, useRef, useState } from 'react'
import type { DBVSVisualFile } from '../../types/ai-workshop'

interface LogEntry {
  id: number
  time: string
  text: string
  type: 'info' | 'success' | 'warning' | 'error'
}

let nextId = 0

function formatTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

function diffEvents(prev: DBVSVisualFile | null, curr: DBVSVisualFile): LogEntry[] {
  const events: LogEntry[] = []
  if (!prev) {
    events.push({ id: nextId++, time: formatTime(), text: `🧙 ${curr.character.name} enters the world`, type: 'info' })
    return events
  }

  // Character moved
  if (prev.character.position !== curr.character.position) {
    const target = curr.modules.find(m => m.id === curr.character.position)
    events.push({ id: nextId++, time: formatTime(), text: `🚶 Moved to ${target?.name ?? curr.character.position}`, type: 'info' })
  }

  // Character action changed
  if (prev.character.action !== curr.character.action) {
    const labels: Record<string, string> = { idle: 'taking a break', walking: 'on the move', fighting: '⚔️ in combat!', celebrating: '🎉 Victory!', resting: '😴 resting' }
    const types: Record<string, 'info' | 'error' | 'success' | 'warning'> = { idle: 'info', walking: 'info', fighting: 'error', celebrating: 'success', resting: 'warning' }
    events.push({ id: nextId++, time: formatTime(), text: labels[curr.character.action] ?? curr.character.action, type: types[curr.character.action] ?? 'info' })
  }

  // HP changed
  if (prev.character.hp !== curr.character.hp) {
    const diff = curr.character.hp - prev.character.hp
    events.push({
      id: nextId++, time: formatTime(),
      text: diff > 0 ? `💚 HP restored +${diff}` : `💔 HP ${diff}`,
      type: diff > 0 ? 'success' : 'error',
    })
  }

  // Level up
  if (prev.character.level !== curr.character.level) {
    events.push({ id: nextId++, time: formatTime(), text: `⬆️ Level up! Now Lv.${curr.character.level}`, type: 'success' })
  }

  // Task changes
  for (const task of curr.tasks) {
    const prevTask = prev.tasks.find(t => t.id === task.id)
    if (!prevTask) {
      events.push({ id: nextId++, time: formatTime(), text: `📋 New task: ${task.description}`, type: 'info' })
    } else if (prevTask.status !== task.status) {
      if (task.status === 'completed') {
        events.push({ id: nextId++, time: formatTime(), text: `🏆 Defeated: ${task.description} (+${task.reward}💰)`, type: 'success' })
      } else if (task.status === 'active' && prevTask.status === 'pending') {
        events.push({ id: nextId++, time: formatTime(), text: `⚔️ Engaged: ${task.description}`, type: 'warning' })
      } else if (task.status === 'failed') {
        events.push({ id: nextId++, time: formatTime(), text: `💀 Failed: ${task.description}`, type: 'error' })
      }
    }
  }

  // Module changes
  for (const mod of curr.modules) {
    const prevMod = prev.modules.find(m => m.id === mod.id)
    if (!prevMod) {
      events.push({ id: nextId++, time: formatTime(), text: `🔨 New module: ${mod.name}`, type: 'warning' })
    } else if (prevMod.status !== mod.status) {
      if (mod.status === 'complete') {
        events.push({ id: nextId++, time: formatTime(), text: `✅ Module complete: ${mod.name}`, type: 'success' })
      } else if (mod.status === 'building') {
        events.push({ id: nextId++, time: formatTime(), text: `🔨 Building: ${mod.name}`, type: 'warning' })
      }
    }
  }

  return events
}

export default function EventLog({ data }: { data: DBVSVisualFile }) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const prevRef = useRef<DBVSVisualFile | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const newEvents = diffEvents(prevRef.current, data)
    if (newEvents.length > 0) {
      setEntries(prev => [...prev, ...newEvents].slice(-50))
    }
    prevRef.current = data
  }, [data])

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [entries])

  if (entries.length === 0) return null

  return (
    <div className="ws-event-log" ref={listRef}>
      {entries.map(e => (
        <div key={e.id} className={`ws-log-entry ws-log-${e.type}`}>
          <span className="ws-log-time">{e.time}</span>
          <span className="ws-log-text">{e.text}</span>
        </div>
      ))}
    </div>
  )
}
