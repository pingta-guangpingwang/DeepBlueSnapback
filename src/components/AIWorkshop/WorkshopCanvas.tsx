import { useRef, useEffect } from 'react'
import type { DBVSVisualFile } from '../../types/ai-workshop'
import { WorkshopScene } from './WorkshopScene'

interface Props {
  data: DBVSVisualFile
  cameraMode: 'follow' | 'free'
}

export default function WorkshopCanvas({ data, cameraMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<WorkshopScene | null>(null)

  // Init / dispose
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const scene = new WorkshopScene(el)
    sceneRef.current = scene
    return () => { scene.dispose(); sceneRef.current = null }
  }, [])

  // Sync data
  useEffect(() => {
    sceneRef.current?.update(data)
  }, [data])

  // Sync camera mode
  useEffect(() => {
    sceneRef.current?.setCameraMode(cameraMode)
  }, [cameraMode])

  // Resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) sceneRef.current?.resize(width, height)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return <div ref={containerRef} className="ws-viewport" style={{ position: 'relative' }} />
}
