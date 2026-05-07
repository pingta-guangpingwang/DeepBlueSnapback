import { useState, useRef, useEffect, useCallback } from 'react'
import type { GraphEdge } from '../types/graph'

/** Lightweight flow dot: stores edge + progress, position computed at render time from live node positions */
export interface FlowDot {
  id: string
  edgeId: string
  progress: number   // 0→1 along the edge
  color: string
  glowColor: string
}

const EDGE_COLORS: Record<string, { line: string; glow: string }> = {
  pipeline:  { line: '#5ea8ff', glow: '#3d8bfd' },
  hierarchy: { line: '#a78bfa', glow: '#8b5cf6' },
  flow:      { line: '#34d399', glow: '#10b981' },
  circular:  { line: '#ff5555', glow: '#ef4444' },
}

export function useFlowAnimation(edges: GraphEdge[]) {
  const [flowActive, setFlowActive] = useState(false)
  const [flowSpeed, setFlowSpeed] = useState(1)
  const [flowMode, setFlowMode] = useState<'single' | 'multi'>('multi')
  const [flowDots, setFlowDots] = useState<FlowDot[]>([])
  const [glowingNodes, setGlowingNodes] = useState<Set<string>>(new Set())

  const animRef = useRef<number>(0)
  const lastTime = useRef<number>(0)
  const dotIdCounter = useRef(0)
  const singlePathIdx = useRef(0)
  const edgesRef = useRef<GraphEdge[]>(edges)
  edgesRef.current = edges

  // Animation loop — only manages progress, no spatial data
  useEffect(() => {
    if (!flowActive || edges.length === 0) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      setFlowDots([])
      setGlowingNodes(new Set())
      return
    }

    lastTime.current = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime.current) / 1000, 0.1)
      lastTime.current = now

      const currentEdges = edgesRef.current

      setFlowDots(prev => {
        const baseSpeed = 0.35
        const step = baseSpeed * flowSpeed * dt
        const next: FlowDot[] = []

        for (const dot of prev) {
          const newProgress = dot.progress + step
          if (newProgress >= 1) {
            const edge = currentEdges.find(e => e.id === dot.edgeId)
            if (edge) {
              setGlowingNodes(g => {
                const nextSet = new Set(g)
                nextSet.add(edge.target)
                return nextSet
              })
            }
            if (flowMode === 'multi') {
              next.push({ ...dot, progress: newProgress - 1 })
            }
          } else {
            next.push({ ...dot, progress: newProgress })
          }
        }

        // Multi mode: ensure every edge has a dot
        if (flowMode === 'multi') {
          const coveredEdges = new Set(next.map(d => d.edgeId))
          for (const edge of currentEdges) {
            if (coveredEdges.has(edge.id)) continue
            const colors = EDGE_COLORS[edge.type] || EDGE_COLORS.pipeline
            next.push({
              id: `flow-${dotIdCounter.current++}`,
              edgeId: edge.id,
              progress: Math.random(),
              color: colors.line,
              glowColor: colors.glow,
            })
          }
        } else {
          // Single mode: one dot traversing graph
          if (next.length === 0 && currentEdges.length > 0) {
            const edge = currentEdges[singlePathIdx.current % currentEdges.length]
            singlePathIdx.current++
            const colors = EDGE_COLORS[edge.type] || EDGE_COLORS.pipeline
            next.push({
              id: `flow-${dotIdCounter.current++}`,
              edgeId: edge.id,
              progress: 0,
              color: colors.line,
              glowColor: colors.glow,
            })
          }
        }

        return next
      })

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [flowActive, flowSpeed, flowMode, edges.length])

  // Decay glowing nodes after 800ms
  useEffect(() => {
    if (!flowActive || glowingNodes.size === 0) return
    const timer = setTimeout(() => {
      setGlowingNodes(new Set())
    }, 800)
    return () => clearTimeout(timer)
  }, [flowActive, glowingNodes])

  const startFlow = useCallback(() => {
    dotIdCounter.current = 0
    singlePathIdx.current = 0
    setFlowActive(true)
  }, [])

  const stopFlow = useCallback(() => {
    setFlowActive(false)
  }, [])

  return {
    flowActive,
    flowSpeed,
    flowMode,
    flowDots,
    glowingNodes,
    setFlowSpeed,
    setFlowMode,
    startFlow,
    stopFlow,
  }
}
