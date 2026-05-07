import { useState, useRef, useEffect, useCallback } from 'react'
import type { GraphEdge, NodePosition } from '../types/graph'

export interface FlowDot {
  id: string
  edgeId: string
  // Bezier curve control points (matching EdgeRenderer path)
  sx: number; sy: number     // start: right edge center of source node
  cp1x: number; cp1y: number // control point 1
  cp2x: number; cp2y: number // control point 2
  tx: number; ty: number     // end: left edge center of target node
  progress: number           // 0→1
  color: string
  glowColor: string
}

const EDGE_COLORS: Record<string, { line: string; glow: string }> = {
  pipeline:  { line: '#5ea8ff', glow: '#3d8bfd' },
  hierarchy: { line: '#a78bfa', glow: '#8b5cf6' },
  flow:      { line: '#34d399', glow: '#10b981' },
  circular:  { line: '#ff5555', glow: '#ef4444' },
}

/** Compute bezier point at progress t (0→1), matching EdgeRenderer path */
export function bezierPoint(dot: FlowDot): { cx: number; cy: number } {
  const { sx, sy, cp1x, cp1y, cp2x, cp2y, tx, ty, progress: t } = dot
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t
  return {
    cx: mt3 * sx + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * tx,
    cy: mt3 * sy + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * ty,
  }
}

/** Build bezier control points matching EdgeRenderer.tsx */
function buildBezier(sp: NodePosition, tp: NodePosition) {
  const sx = sp.x + sp.width        // right edge center of source
  const sy = sp.y + sp.height / 2
  const tx = tp.x                   // left edge center of target
  const ty = tp.y + tp.height / 2

  const dx = Math.abs(tx - sx) * 0.4
  return {
    sx, sy,
    cp1x: sx + dx, cp1y: sy,
    cp2x: tx - dx, cp2y: ty,
    tx, ty,
  }
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

  const posMap = new Map(positions.map(p => [p.id, p]))

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
      const dt = Math.min((now - lastTime.current) / 1000, 0.1)
      lastTime.current = now

      setFlowDots(prev => {
        const baseSpeed = 0.35
        const step = baseSpeed * flowSpeed * dt
        const next: FlowDot[] = []

        for (const dot of prev) {
          const newProgress = dot.progress + step
          if (newProgress >= 1) {
            // Dot reached target → glow the target node
            const edge = edges.find(e => e.id === dot.edgeId)
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

        // Spawn new dots for uncovered edges (multi mode)
        if (flowMode === 'multi') {
          const coveredEdges = new Set(next.map(d => d.edgeId))
          for (const edge of edges) {
            if (coveredEdges.has(edge.id)) continue
            const sp = posMap.get(edge.source)
            const tp = posMap.get(edge.target)
            if (!sp || !tp) continue
            const colors = EDGE_COLORS[edge.type] || EDGE_COLORS.pipeline
            const bez = buildBezier(sp, tp)
            next.push({
              id: `flow-${dotIdCounter.current++}`,
              edgeId: edge.id,
              ...bez,
              progress: Math.random(),
              color: colors.line,
              glowColor: colors.glow,
            })
          }
        } else {
          // Single mode: one dot traversing graph sequentially
          if (next.length === 0 && edges.length > 0) {
            const edge = edges[singlePathIdx.current % edges.length]
            singlePathIdx.current++
            const sp = posMap.get(edge.source)
            const tp = posMap.get(edge.target)
            if (sp && tp) {
              const colors = EDGE_COLORS[edge.type] || EDGE_COLORS.pipeline
              const bez = buildBezier(sp, tp)
              next.push({
                id: `flow-${dotIdCounter.current++}`,
                edgeId: edge.id,
                ...bez,
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
