/**
 * Canvas painter for the Atlas tree map.
 *
 * Separate from the character tree's painter (components/tree/render.ts): that
 * one is tuned for a 4,975-node tree with ascendancy wheels and weapon sets.
 * The Atlas has 576 nodes and different marks — guide nodes, trap nodes, what
 * the player has ticked — so it gets its own small layer stack, and shares the
 * viewport maths in components/tree/geometry.ts.
 *
 * Layers: edges -> plain nodes -> ticked nodes -> guide/trap rings -> focus
 * pulse -> labels.
 */

import type { PassiveTree, TreeNode } from '@poe2/core'
import { NODE_KIND } from '@poe2/core'
import { treeToScreen, visibleBounds, type Viewport } from '../tree/geometry'

export interface AtlasPalette {
  edge: string
  node: string
  notable: string
  guide: string
  trap: string
  allocated: string
  surface: string
  text: string
  focus: string
  /** Resolved font-family (canvas can't read CSS variables). */
  font: string
}

export interface AtlasRenderOptions {
  tree: PassiveTree
  viewport: Viewport
  width: number
  height: number
  palette: AtlasPalette
  guide: Set<number>
  trap: Set<number>
  allocated: Set<number>
  focused: Set<number>
  hovered: number | null
  /** 0..1 phase of the focus pulse; null when not animating. */
  pulse: number | null
}

/** Marks grow with zoom but stay legible when zoomed right out. */
function zoomFactor(scale: number): number {
  return Math.min(2.4, Math.max(0.75, scale / 0.055))
}

export function nodeRadius(node: TreeNode, scale: number): number {
  const base =
    node.kind === NODE_KIND.keystone ? 6.5 : node.kind === NODE_KIND.start ? 6 : node.kind === NODE_KIND.notable ? 4 : 2.3
  return base * zoomFactor(scale)
}

export function renderAtlas(ctx: CanvasRenderingContext2D, o: AtlasRenderOptions): void {
  const { tree, viewport: vp, width, height, palette: p } = o
  const b = visibleBounds(vp, width, height)
  const inView = (n: TreeNode) => n.x >= b.minX && n.x <= b.maxX && n.y >= b.minY && n.y <= b.maxY
  const at = (n: TreeNode) => treeToScreen(n.x, n.y, vp, width, height)

  ctx.clearRect(0, 0, width, height)

  // --- edges ----------------------------------------------------------------
  ctx.lineCap = 'round'
  ctx.strokeStyle = p.edge
  ctx.lineWidth = Math.max(0.8, 1.3 * zoomFactor(vp.scale) * 0.7)
  ctx.beginPath()
  const allocatedEdges: Array<[TreeNode, TreeNode]> = []
  for (const [a, c] of tree.edgePairs()) {
    const na = tree.node(a)
    const nc = tree.node(c)
    if (!na || !nc || (!inView(na) && !inView(nc))) continue
    if (o.allocated.has(a) && o.allocated.has(c)) {
      allocatedEdges.push([na, nc])
      continue
    }
    const pa = at(na)
    const pc = at(nc)
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pc.x, pc.y)
  }
  ctx.stroke()

  ctx.strokeStyle = p.allocated
  ctx.lineWidth = Math.max(1.4, 2.2 * zoomFactor(vp.scale) * 0.7)
  ctx.beginPath()
  for (const [na, nc] of allocatedEdges) {
    const pa = at(na)
    const pc = at(nc)
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pc.x, pc.y)
  }
  ctx.stroke()

  // --- nodes ----------------------------------------------------------------
  for (const node of tree.allNodes()) {
    if (!inView(node)) continue
    const pt = at(node)
    const r = nodeRadius(node, vp.scale)
    const allocated = o.allocated.has(node.id)
    ctx.globalAlpha = allocated ? 1 : node.kind === NODE_KIND.normal ? 0.45 : 0.75
    ctx.fillStyle = allocated ? p.allocated : node.kind === NODE_KIND.normal ? p.node : p.notable
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // --- guide and trap rings -------------------------------------------------
  const ring = (ids: Set<number>, colour: string) => {
    ctx.strokeStyle = colour
    ctx.lineWidth = Math.max(1.5, 1.8 * zoomFactor(vp.scale) * 0.8)
    for (const id of ids) {
      const node = tree.node(id)
      if (!node || !inView(node)) continue
      const pt = at(node)
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, nodeRadius(node, vp.scale) + 3, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ring(o.guide, p.guide)
  ring(o.trap, p.trap)

  // --- focus ----------------------------------------------------------------
  for (const id of o.focused) {
    const node = tree.node(id)
    if (!node || !inView(node)) continue
    const pt = at(node)
    const r = nodeRadius(node, vp.scale)
    ctx.strokeStyle = p.focus
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, r + 6, 0, Math.PI * 2)
    ctx.stroke()
    if (o.pulse !== null) {
      ctx.globalAlpha = 1 - o.pulse
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, r + 6 + o.pulse * 26, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  // --- labels ---------------------------------------------------------------
  // Focused nodes are always named; marked notables once zoomed in enough to
  // have room; everything else is left to the tooltip.
  const labelled = new Set<number>(o.focused)
  if (vp.scale >= 0.12) {
    for (const id of [...o.guide, ...o.trap]) labelled.add(id)
  }
  ctx.font = `600 11px ${p.font}`
  ctx.textBaseline = 'middle'
  for (const id of labelled) {
    const node = tree.node(id)
    if (!node || !node.name || !inView(node)) continue
    const pt = at(node)
    const text = node.name
    const w = ctx.measureText(text).width
    const x = pt.x + nodeRadius(node, vp.scale) + 8
    ctx.globalAlpha = 0.88
    ctx.fillStyle = p.surface
    ctx.fillRect(x - 3, pt.y - 8, w + 6, 16)
    ctx.globalAlpha = 1
    ctx.fillStyle = o.focused.has(id) ? p.focus : o.trap.has(id) ? p.trap : p.text
    ctx.fillText(text, x, pt.y)
  }
}

/** The node nearest a screen point, within a finger's reach. */
export function hitTestAtlas(
  tree: PassiveTree,
  sx: number,
  sy: number,
  vp: Viewport,
  width: number,
  height: number,
): TreeNode | null {
  const threshold = 16
  let best: TreeNode | null = null
  let bestDistance = threshold * threshold
  for (const node of tree.allNodes()) {
    const pt = treeToScreen(node.x, node.y, vp, width, height)
    const d = (pt.x - sx) ** 2 + (pt.y - sy) ** 2
    if (d < bestDistance || (d === bestDistance && best && node.kind > best.kind)) {
      bestDistance = d
      best = node
    }
  }
  return best
}
