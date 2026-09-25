'use client'

/**
 * The Atlas passive tree, drawn from the game's tree data (via poe2db — see
 * packages/data/PROVENANCE.md), with the guide's nodes marked:
 *
 *   gold ring  — a node the guide recommends
 *   red ring   — a trap node
 *   green      — a node you've ticked on this page (not read from the game)
 *
 * "Map" buttons elsewhere on the page frame and pulse a node here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TreeNode } from '@poe2/core'
import { atlasClusters, memoryForks } from '@/data/atlasTree'
import { atlasTrapNodes } from '@/data/trapNodes'
import { useAtlasProgress } from '@/hooks/useAtlasProgress'
import { useAtlasTree, type AtlasTree } from '@/lib/useAtlasTree'
import { extentOf, fitExtent, zoomAt, type Viewport } from '../tree/geometry'
import { hitTestAtlas, renderAtlas, type AtlasPalette } from './atlasRender'
import { useAtlasMap } from './AtlasMapContext'

function readPalette(el: HTMLElement): AtlasPalette {
  const css = getComputedStyle(el)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    edge: v('--line-strong', '#36343c'),
    node: v('--ink-mute', '#8f897f'),
    notable: v('--ink-dim', '#b1aca3'),
    guide: v('--accent', '#e3b341'),
    trap: v('--danger', '#e66767'),
    allocated: v('--good', '#199e70'),
    surface: v('--surface-sunken', '#09090b'),
    text: v('--ink', '#f3eee4'),
    focus: v('--accent', '#e3b341'),
    font: css.fontFamily || 'ui-sans-serif, system-ui, sans-serif',
  }
}

/** Every id carrying one of these names. */
function idsFor(atlas: AtlasTree, names: Iterable<string>): Set<number> {
  const out = new Set<number>()
  for (const name of names) for (const id of atlas.byName.get(name) ?? []) out.add(id)
  return out
}

const SUBTREE_LABEL: Record<string, string> = { AzmeriSpirit: 'Azmeri Spirits', RogueExiles: 'Rogue Exiles', StoneCircle: 'Stone Circles' }
const subtreeLabel = (t: string | undefined) =>
  !t ? null : SUBTREE_LABEL[t] ?? t.replace(/^Biome/, 'Biome: ').replace(/([a-z])([A-Z])/g, '$1 $2')

export function AtlasTreeMap() {
  const state = useAtlasTree()
  if (state.status === 'loading') {
    return <div className="skeleton h-[22rem] rounded-xl sm:h-[29rem]" aria-label="Loading the Atlas tree" />
  }
  if (state.status === 'error') {
    return (
      <p className="rounded-xl border border-line px-4 py-6 text-center text-sm text-ink-mute">
        The Atlas tree didn&apos;t load ({state.message}). The guide below still works.
      </p>
    )
  }
  return <AtlasMapCanvas atlas={state.atlas} />
}

function AtlasMapCanvas({ atlas }: { atlas: AtlasTree }) {
  const { tree } = atlas
  const { request, focus, clear } = useAtlasMap()
  const { isClusterAllocated, isForkAllocated } = useAtlasProgress()

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [hovered, setHovered] = useState<TreeNode | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [pulse, setPulse] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  // --- what to mark ---------------------------------------------------------
  const guide = useMemo(
    () => idsFor(atlas, [...atlasClusters.flatMap((c) => c.treeNodes ?? []), ...memoryForks.flatMap((f) => f.treeNodes ?? [])]),
    [atlas],
  )
  const trap = useMemo(() => idsFor(atlas, atlasTrapNodes.flatMap((t) => t.treeNodes ?? [])), [atlas])
  const allocated = useMemo(
    () =>
      idsFor(atlas, [
        ...atlasClusters.filter((c) => isClusterAllocated(c.id)).flatMap((c) => c.treeNodes ?? []),
        ...memoryForks.filter((f) => isForkAllocated(f.id)).flatMap((f) => f.treeNodes ?? []),
      ]),
    [atlas, isClusterAllocated, isForkAllocated],
  )
  const focused = useMemo(() => (request ? idsFor(atlas, request.names) : new Set<number>()), [atlas, request])

  // --- sizing and framing ---------------------------------------------------
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const r = entry!.contentRect
      setSize({ width: Math.round(r.width), height: Math.round(r.height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fitAll = useCallback(() => {
    if (size.width && size.height) setViewport(fitExtent(tree.extent, size.width, size.height, 0.06))
  }, [tree, size.width, size.height])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- framing waits on the size a ResizeObserver reports
    if (viewport === null) fitAll()
  }, [viewport, fitAll])

  // Frame a requested node, then pulse it for a moment.
  useEffect(() => {
    if (!request || !size.width || !size.height) return
    const points = [...focused].map((id) => tree.node(id)).filter((n): n is TreeNode => !!n)
    const extent = extentOf(points, 700)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- framing waits on the size a ResizeObserver reports
    if (extent) setViewport(fitExtent(extent, size.width, size.height, 0.1))
    setHovered(points[0] ?? null)
    setPointer({ x: size.width / 2, y: size.height / 2 })
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = (now - start) / 900
      if (t >= 3) {
        setPulse(null)
        return
      }
      setPulse(t % 1)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // Re-run per request (nonce), not when the size settles mid-animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce])

  // --- painting -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !viewport || !size.width || !size.height) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderAtlas(ctx, {
      tree,
      viewport,
      width: size.width,
      height: size.height,
      palette: readPalette(wrap),
      guide,
      trap,
      allocated,
      focused,
      hovered: hovered?.id ?? null,
      pulse,
    })
  }, [tree, viewport, size, guide, trap, allocated, focused, hovered, pulse])

  // --- interaction ----------------------------------------------------------
  const dragRef = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)
  const pinchRef = useRef<globalThis.Map<number, { x: number; y: number }>>(new globalThis.Map())
  const pinchDistance = useRef(0)

  const pick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!viewport) return
    const rect = e.currentTarget.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    setPointer({ x: sx, y: sy })
    setHovered(hitTestAtlas(tree, sx, sy, viewport, size.width, size.height))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinchRef.current.size === 2) {
      const [a, b] = [...pinchRef.current.values()]
      pinchDistance.current = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      dragRef.current = null
      return
    }
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!viewport) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (pinchRef.current.has(e.pointerId)) pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinchRef.current.size === 2) {
      const [a, b] = [...pinchRef.current.values()]
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      if (pinchDistance.current > 0 && distance > 0) {
        const midX = (a!.x + b!.x) / 2 - rect.left
        const midY = (a!.y + b!.y) / 2 - rect.top
        setViewport((vp) => (vp ? zoomAt(vp, distance / pinchDistance.current, midX, midY, size.width, size.height) : vp))
      }
      pinchDistance.current = distance
      return
    }
    const drag = dragRef.current
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true
      drag.x = e.clientX
      drag.y = e.clientY
      setViewport((vp) => (vp ? { ...vp, cx: vp.cx - dx / vp.scale, cy: vp.cy - dy / vp.scale } : vp))
      return
    }
    if (e.pointerType === 'mouse') pick(e)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pinchRef.current.delete(e.pointerId)
    if (pinchRef.current.size < 2) pinchDistance.current = 0
    const drag = dragRef.current
    dragRef.current = null
    if (drag && drag.id === e.pointerId && !drag.moved && e.pointerType !== 'mouse') pick(e)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * 0.0015)
      setViewport((vp) => (vp ? zoomAt(vp, factor, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height) : vp))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = (factor: number) =>
    setViewport((vp) => (vp ? zoomAt(vp, factor, size.width / 2, size.height / 2, size.width, size.height) : vp))

  // --- search ---------------------------------------------------------------
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const seen = new globalThis.Map<string, TreeNode>()
    for (const node of tree.allNodes()) {
      if (!node.name || seen.has(node.name)) continue
      const hit = node.name.toLowerCase().includes(q) || node.stats.some((s) => s.toLowerCase().includes(q))
      if (hit) seen.set(node.name, node)
    }
    return [...seen.values()]
      .sort((a, b) => Number(b.name.toLowerCase().includes(q)) - Number(a.name.toLowerCase().includes(q)) || b.kind - a.kind)
      .slice(0, 8)
  }, [tree, query])

  const tags = hovered
    ? [
        guide.has(hovered.id) ? { label: 'In the guide', tone: 'text-accent border-accent/40' } : null,
        trap.has(hovered.id) ? { label: 'Trap node', tone: 'text-danger border-danger/40' } : null,
        allocated.has(hovered.id) ? { label: 'You ticked this', tone: 'text-good border-good/40' } : null,
      ].filter((t): t is { label: string; tone: string } => !!t)
    : []

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a node — name or effect"
            aria-label="Find an Atlas node"
            className="w-full rounded-lg border border-line bg-surface-sunken px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent-line focus:outline-none"
          />
          {results.length ? (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface-raised shadow-[var(--lift-raised)]">
              {results.map((n) => (
                <li key={n.name}>
                  <button
                    type="button"
                    onClick={() => {
                      focus([n.name], n.name)
                      setQuery('')
                    }}
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-overlay"
                  >
                    <span className="truncate text-ink">{n.name}</span>
                    <span className="shrink-0 text-[11px] text-ink-mute">{subtreeLabel(atlas.subtree.get(n.id))}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-dim" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-accent" /> Guide
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-danger" /> Trap
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-good" /> Ticked here
          </li>
        </ul>
      </div>

      <div
        id="atlas-map"
        ref={wrapRef}
        className="relative h-[22rem] w-full scroll-mt-32 touch-none overflow-hidden rounded-xl border border-line bg-surface-sunken select-none sm:h-[29rem]"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
          style={{ width: size.width || undefined, height: size.height || undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={(e) => e.pointerType === 'mouse' && !request && setHovered(null)}
          role="img"
          aria-label={`Atlas passive tree: ${guide.size} guide nodes, ${trap.size} trap nodes, ${allocated.size} ticked. Drag to pan, scroll or pinch to zoom.`}
        />

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {[
            { label: 'Zoom in', text: '+', on: () => zoomBy(1.4) },
            { label: 'Zoom out', text: '−', on: () => zoomBy(1 / 1.4) },
            {
              label: 'Show the whole tree',
              text: 'fit',
              on: () => {
                clear()
                setHovered(null)
                fitAll()
              },
            },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.on}
              aria-label={b.label}
              title={b.label}
              className="size-8 rounded-md border border-line bg-surface-raised/90 text-sm text-ink-dim backdrop-blur transition-colors hover:text-ink"
            >
              {b.text}
            </button>
          ))}
        </div>

        {request ? (
          <div className="absolute top-2 left-2 flex max-w-[70%] items-center gap-2 rounded-md border border-accent-line bg-surface-raised/90 px-2.5 py-1 text-xs text-ink backdrop-blur">
            <span className="truncate">Showing {request.label}</span>
            <button type="button" onClick={clear} aria-label="Clear" className="text-ink-mute hover:text-ink">
              ✕
            </button>
          </div>
        ) : null}

        {hovered ? (
          <div
            className="pointer-events-none absolute z-10 w-60 max-w-[80%] rounded-lg border border-line bg-surface-raised/95 p-2.5 shadow-[var(--lift-raised)] backdrop-blur"
            style={{
              left: Math.min(Math.max(8, pointer.x + 14), Math.max(8, size.width - 248)),
              top: Math.min(Math.max(8, pointer.y + 14), Math.max(8, size.height - 140)),
            }}
          >
            <div className="text-xs font-semibold text-ink">{hovered.name || 'Atlas'}</div>
            {subtreeLabel(atlas.subtree.get(hovered.id)) ? (
              <div className="mt-0.5 text-[10px] text-ink-mute">{subtreeLabel(atlas.subtree.get(hovered.id))}</div>
            ) : null}
            {hovered.stats.length ? (
              <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-ink-dim">
                {hovered.stats.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            {tags.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span key={t.label} className={`rounded border px-1.5 py-px text-[10px] ${t.tone}`}>
                    {t.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-[10px] leading-relaxed text-ink-mute">
        Node positions and effects come from the game&apos;s Atlas tree data, via poe2db. Green marks what you&apos;ve
        ticked on this page — it isn&apos;t read from your account.
      </p>
    </div>
  )
}
