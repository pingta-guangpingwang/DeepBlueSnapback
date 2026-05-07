import { useState, useRef, useEffect, useCallback } from 'react'
import type { GraphEdge, NodePosition } from '../types/graph'

export interface FlowDot {
  id: string
  edgeId: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  progress: number // 0→1
  color: string
  glowColor: string
}

export interface FlowState {
  active: boolean
  speed: number // 0.25 ~ 3, default 1
  mode: 'single' | 'multi'
}

const EDGE_COLORS: Record<string, { line: string; glow: string }> = {
  pipeline:  { line: '#5ea8ff', glow: '#3d8bfd' },
  hierarchy: { line: '#a78bfa', glow: '#8b5cf6' },
  flow:      { line: '#34d399', glow: '#10b981' },
  circular:  { line: '#ff5555', glow: '#ef4444' },
}

export function useFlowAnimation(edges: GraphEdge[], positions: NodePosition[]) {
  const [flowActive, setFlowActive] = useState(false)
  const [flowSpeed, setFlowSpeed] = useState(1)
  const [flowMode, setFlowMode] = useState<'single' | 'multi'>('multi')
  const [flowDots, setFlowDots] = useState<FlowDot[]>([])
  const [glowingNodes, setGlowingNodes] = useState<Set<string>>(new Set())

  const animRef = useRef<number>(0)
  const lastTime = useRef<number>(0)
  const dotIdCounter = useRef(0)
  const singlePathIdx = useRef(0)

  // Build position lookup
  const posMap = new Map(positions.map(p => [p.id, p]))

  // Build adjacency: outgoing edges per node
  const outgoingMap = useRef<Map<string, GraphEdge[]>>(new Map())
  useEffect(() => {
    const m = new Map<string, GraphEdge[]>()
    for (const e of edges) {
      const list = m.get(e.source) || []
      list.push(e)
      m.set(e.source, list)
    }
    outgoingMap.current = m
  }, [edges])

  // Animation loop
  useEffect(() => {
    if (!flowActive || edges.length === 0) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      setFlowDots([])
      setGlowingNodes(new Set())
      return
    }

    lastTime.current = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime.current) / 1000, 0.1) // cap at 100ms
      lastTime.current = now

      setFlowDots(prev => {
        const baseSpeed = 0.35 // base: ~3 seconds per edge at speed 1
        const step = baseSpeed * flowSpeed * dt
        const next: FlowDot[] = []

        for (const dot of prev) {
          const newProgress = dot.progress + step
          if (newProgress >= 1) {
            // Dot reached target → glow the target node
            const sp = posMap.get(dot.edgeId.split('->')[1] || '')
            setGlowingNodes(g => {
              const nextSet = new Set(g)
              // Find target node from edge
              const edge = edges.find(e => e.id === dot.edgeId)
              if (edge) nextSet.add(edge.target)
              // Remove after a delay via another mechanism
              return nextSet
            })
            // In multi mode, loop the dot back to start
            if (flowMode === 'multi') {
              next.push({ ...dot, progress: newProgress - 1 })
            }
            // In single mode, dot is removed; a new one picks the next edge
          } else {
            next.push({ ...dot, progress: newProgress })
          }
        }

        // Spawn new dots if needed
        if (flowMode === 'multi') {
          // Ensure every visible edge has at least one dot
          const coveredEdges = new Set(next.map(d => d.edgeId))
          for (const edge of edges) {
            if (coveredEdges.has(edge.id)) continue
            const sp = posMap.get(edge.source)
            const tp = posMap.get(edge.target)
            if (!sp || !tp) continue
            const colors = EDGE_COLORS[edge.type] || EDGE_COLORS.pipeline
            next.push({
              id: `flow-${dotIdCounter.current++}`,
              edgeId: edge.id,
              sourceX: sp.x + sp.width / 2,
              sourceY: sp.y + sp.height / 2,
              targetX: tp.x + tp.width / 2,
              targetY: tp.y + tp.height / 2,
              progress: Math.random(), // stagger start positions
              color: colors.line,
              glowColor: colors.glow,
            })
          }
        } else {
          // Single mode: one dot traversing the graph
          if (next.length === 0 && edges.length > 0) {
            // Pick next edge in traversal
            const edge = edges[singlePathIdx.current % edges.length]
            singlePathIdx.current++
            const sp = posMap.get(edge.source)
            const tp = posMap.get(edge.target)
            if (sp && tp) {
              const colors = EDGE_COLORS[edge.type] || EDGE_COLORS.pipeline
              next.push({
                id: `flow-${dotIdCounter.current++}`,
                edgeId: edge.id,
                sourceX: sp.x + sp.width / 2,
                sourceY: sp.y + sp.height / 2,
                targetX: tp.x + tp.width / 2,
                targetY: tp.y + tp.height / 2,
                progress: 0,
                color: colors.line,
                glowColor: colors.glow,
              })
            }
          }
        }

        return next
      })

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [flowActive, flowSpeed, flowMode, edges, posMap])

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
