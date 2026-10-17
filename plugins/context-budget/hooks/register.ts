import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

/** Highest warning tier already announced for the current window; reset on compaction. */
const warned = atom({ plugin: 'context-budget', key: 'warned' } as const, 0)

const TIERS = [60, 80, 90] as const

/**
 * What the summary must keep. Written for a coding session that resumes after
 * compaction: the failure mode is losing paths, decisions and open work, not
 * losing prose.
 */
export const DEFAULT_FOCUS = [
  'Keep, in this order:',
  '1. The user\'s current goal and every instruction or preference they stated, verbatim where short.',
  '2. Open tasks and the exact next step; mark what is done versus pending.',
  '3. Absolute file paths touched or still to touch, with the one-line reason for each.',
  '4. Decisions taken and why, including approaches rejected, so they are not re-litigated.',
  '5. Exact commands, error messages and test counts that matter for resuming.',
  '6. Git state: branch, PR number and status, what is pushed versus uncommitted.',
  'Drop: file contents that can be re-read, tool output, exploration that led nowhere, restated context.',
].join('\n')

const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))

export const register: Register = (on, options) => {
  const focus = typeof options?.focus === 'string' && options.focus.trim() ? options.focus : DEFAULT_FOCUS

  // Meter + threshold warnings, pushed by the engine after each turn.
  on('session.measure', async ($, e, next) => {
    const pct = e.context.percent
    if (pct !== undefined) {
      const cost = e.cost ? ` · $${e.cost.usd.toFixed(2)}` : ''
      $.ui.status(`ctx ${pct}%${cost}`)

      const tier = [...TIERS].reverse().find(t => pct >= t) ?? 0
      const seen = await read($, warned)
      if (tier > seen) {
        await update($, warned, () => tier)
        const advice =
          tier >= 90
            ? 'compact now (/compact or /smartcompact), or start a fresh session'
            : tier >= 80
              ? 'run /smartcompact before the next big task'
              : 'finish the current task, then /smartcompact or /clear'
        $.ui.toast(`Context ${pct}% full: ${advice}`)
      } else if (tier < seen) {
        await update($, warned, () => tier)
      }
    }
    return next(e)
  })

  // Every compaction without an explicit focus gets the default one. A focus the
  // person typed after /compact is left alone.
  on('session.compact', async ($, e, next) => {
    if (e.trigger === 'precompute' || e.instructions?.trim()) return next(e)
    return next({ ...e, instructions: focus })
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'budget', description: 'Show where the context window is going and what to trim' })
    await $.command.register({
      name: 'smartcompact',
      description: 'Compact keeping goals, open tasks, file paths and decisions. Optional args add to the focus.',
    })
    return next(e)
  })

  on('command.run', { command: 'budget' }, async $ => {
    const { context, cost, rateLimits } = await $.session.usage({ breakdown: 'summary' })
    const b = context.breakdown
    const lines: string[] = []
    lines.push(`Context: ${context.percent ?? '?'}% of ${fmt(context.window)}${cost ? ` · session $${cost.usd.toFixed(2)}` : ''}`)
    for (const r of rateLimits) lines.push(`Limit ${JSON.stringify(r)}`.slice(0, 120))

    if (b) {
      lines.push('', 'By category (largest first):')
      for (const c of [...b.categories]
        .filter(c => c.kind === 'used' && c.tokens > 0)
        .sort((x, y) => y.tokens - x.tokens)) {
        lines.push(`  ${fmt(c.tokens).padStart(7)}  ${c.name}`)
      }
      const mcp = new Map<string, number>()
      for (const t of b.mcpTools) mcp.set(t.serverName, (mcp.get(t.serverName) ?? 0) + t.tokens)
      if (mcp.size) {
        lines.push('', 'MCP servers:')
        for (const [s, n] of [...mcp].sort((a, c) => c[1] - a[1])) lines.push(`  ${fmt(n).padStart(7)}  ${s}`)
      }
      if (b.skills) lines.push('', `Skills listed: ${b.skills.totalSkills ?? b.skills.skillFrontmatter.length} (${fmt(b.skills.tokens)})`)
      for (const m of [...b.memoryFiles].sort((a, c) => c.tokens - a.tokens).slice(0, 3)) {
        lines.push(`  ${fmt(m.tokens).padStart(7)}  ${m.path}`)
      }
      const fixed = b.categories.filter(c => c.kind === 'used' && c.name !== 'Messages').reduce((s, c) => s + c.tokens, 0)
      const messages = b.categories.find(c => c.name === 'Messages')?.tokens ?? 0
      lines.push('', `Always-on (everything but Messages): ${fmt(fixed)} · Messages: ${fmt(messages)}`)
      lines.push(
        fixed > messages
          ? 'Fixed load dominates: disable unused plugins/skills (/plugin) and MCP servers for this project.'
          : 'Conversation dominates: /smartcompact, or /clear between tasks.',
      )
    }
    return { text: lines.join('\n') }
  })

  on('command.run', { command: 'smartcompact' }, async ($, e) => {
    const extra = e.args.trim()
    const { skip } = await $.session.compact({ instructions: extra ? `${focus}\n\nAlso keep: ${extra}` : focus })
    await update($, warned, () => 0)
    return { text: skip ? `Compaction skipped: ${skip}` : 'Compacted with the working-state focus.' }
  })
}
