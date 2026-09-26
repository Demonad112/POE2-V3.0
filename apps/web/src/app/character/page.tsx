'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  analyzeCharacter,
  analyzeFromPob,
  snapshotKey,
  upgradeSkillFrom,
  type Analysis,
  type PobAnalysis,
  type UpgradeCharacter,
  type UpgradeSkill,
} from '@poe2/core'
import { Accordion } from '@/components/shared/Accordion'
import { PanelControls } from '@/components/shared/PanelControls'
import { NumberReadout, ResistancePips, StatusChip } from '@/components/shared/Instruments'
import { Attribution } from '@/components/Attribution'
import { BuildScore } from '@/components/BuildScore'
import { DefensePanel } from '@/components/DefensePanel'
import { DpsMatrix } from '@/components/DpsMatrix'
import { DamageReview } from '@/components/DamageReview'
import { GearWorkbench } from '@/components/GearWorkbench'
import { CharacterHero } from '@/components/character/CharacterHero'
import { useShoppingList } from '@/hooks/useShoppingList'
import { attributesFrom } from '@/lib/attributes'
import { Headroom } from '@/components/Headroom'
import { AuditPanel } from '@/components/AuditPanel'
import { Chat } from '@/components/Chat'
import { PobAnalysisView } from '@/components/PobAnalysisView'
import { ImportBar, importProfile, type ImportResult } from '@/components/ImportBar'
import { Progress } from '@/components/Progress'
import { Reconciliation } from '@/components/Reconciliation'
import { Recommendations } from '@/components/Recommendations'
import { Skeleton } from '@/components/Skeleton'
import { TreePanel } from '@/components/tree/TreePanel'
import { fmtCompact } from '@/components/ui'
import { useCharacterHistory } from '@/lib/useCharacterHistory'
import { recordRecent } from '@/lib/recentCharacters'
import { useLadder } from '@/lib/useLadder'
import { useModTiers } from '@/lib/useModTiers'
import { useSupportCatalog } from '@/lib/useSupportCatalog'
import { usePassiveTree } from '@/lib/usePassiveTree'

/** What the tree's best-nearby-nodes lists need from the analysis. */
function upgradeInputs(analysis: Analysis): { skill: UpgradeSkill | null; character: UpgradeCharacter } {
  const d = analysis.defense
  return {
    skill: analysis.dps.primary ? upgradeSkillFrom(analysis.dps.primary) : null,
    character: {
      life: d.life ?? 0,
      energyShield: d.energyShield ?? 0,
      armour: d.armour ?? 0,
      evasion: d.evasion ?? 0,
      underCap: Object.fromEntries(d.resistances.map((r) => [r.type, r.underCap])),
    },
  }
}

interface WorkspacePanel {
  id: string
  title: string
  summary?: ReactNode
  badge?: ReactNode
  instrument?: ReactNode
  content: ReactNode
}

export default function Home() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  // A Path of Building code yields fewer panels — every figure real, none of
  // them estimated — so it is kept as its own shape rather than pretending to
  // be a full poe.ninja analysis with holes in it.
  const [pobAnalysis, setPobAnalysis] = useState<PobAnalysis | null>(null)
  // Kept so the analysis can be re-derived as each optional input lands. Every
  // one only makes the result MORE specific, and re-running is cheap — it is
  // pure computation over already-parsed data.
  const [raw, setRaw] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The profile URL of the current import, when it came from one.
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)

  // One fetch each, for the whole page. The gear panel and the findings list
  // must agree about what is wasted and what would fix it; the tree drawing and
  // the keystone corrections must agree about what is allocated. Two fetches of
  // the same artifact into two components is how both of those drift.
  const tiersState = useModTiers(raw !== null)
  const treeState = usePassiveTree(raw !== null)
  const catalogState = useSupportCatalog(raw !== null)
  // Needs the character's league and ascendancy, so it can only start once
  // there is a first analysis. Failure is silent: the assessment already knows
  // how to leave damage unscored and say why.
  const ladder = useLadder(analysis?.identity.league ?? null, analysis?.identity.className ?? null)
  const shopping = useShoppingList()
  // Memoised so the gear panels' own memos don't recompute on every render.
  const attributes = useMemo(() => attributesFrom(analysis?.pobStats ?? null), [analysis])

  useEffect(() => {
    if (!raw) return
    let cancelled = false
    void analyzeCharacter(raw, {
      ...(tiersState.status === 'ready' ? { tiers: tiersState.tiers } : {}),
      ...(treeState.status === 'ready' ? { tree: treeState.tree } : {}),
      ladder,
    })
      .then((next) => {
        if (!cancelled) setAnalysis(next)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(`Could not analyse that data: ${err.message}`)
        setAnalysis(null)
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [raw, tiersState, treeState, ladder])

  // Only recorded once the tree has settled, either way. A snapshot taken
  // before then carries an uncorrected pool, and would be followed by a
  // corrected one — two rows for one import, showing a change nobody made.
  const treeSettled = treeState.status === 'ready' || treeState.status === 'error'
  const history = useCharacterHistory(treeSettled ? analysis : null)

  // Unlike the history snapshot, a recent-characters row carries no figures
  // the tree could correct, so it need not wait for the tree.
  useEffect(() => {
    if (!sourceUrl || !analysis) return
    const { identity } = analysis
    if (!identity.account || !identity.name) return
    recordRecent({
      url: sourceUrl,
      key: snapshotKey(identity),
      name: identity.name,
      className: identity.className ?? null,
      level: identity.level ?? null,
      at: new Date().toISOString(),
    })
  }, [sourceUrl, analysis])

  const handleResult = useCallback(async (r: ImportResult) => {
    if (!r.ok) {
      setError(r.error)
      return
    }
    setError(null)
    setBusy(true)
    setSourceUrl(r.kind === 'ninja' ? (r.url ?? null) : null)
    try {
      if (r.kind === 'pob') {
        setAnalysis(null)
        setRaw(null)
        setPobAnalysis(await analyzeFromPob(r.code))
        setBusy(false)
      } else {
        setPobAnalysis(null)
        setAnalysis(null)
        // The effect above owns analysis from here — it re-runs as the tree,
        // affix data and ladder sample land, and clears `busy` when done.
        setRaw(r.data)
      }
    } catch (err) {
      setError(`Could not analyse that data: ${(err as Error).message}`)
      setAnalysis(null)
      setBusy(false)
    }
  }, [])

  // `?import=<poe.ninja URL>` — from the home page's "Re-import" link, a
  // reload, or a shared link. Read here, once per visit to the page.
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('import')
    if (!target) return
    let cancelled = false
    // The effect starts a fetch; the page has to show it is busy for its length.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true)
    void importProfile(target).then((r) => {
      if (cancelled) return
      setBusy(false)
      void handleResult(r)
    })
    return () => {
      cancelled = true
    }
  }, [handleResult])

  // Declared as data so the accordion list can be reordered or re-themed in
  // one place, without touching how any individual panel is built. Each
  // panel keeps its own component and its own logic — only the collapsed
  // row's summary/badge/instrument is computed here, from the same
  // `analysis` every open panel already reads.
  const panelsFor = (a: Analysis): WorkspacePanel[] => {
    const uncappedCount = a.defense.resistances.filter((r) => !r.capped).length
    const primary = a.dps.primary
    const overcapped = a.attribution.stats.filter((s) => s.overcap > 0)

    const panels: WorkspacePanel[] = [
      {
        id: 'defence',
        title: 'Defence',
        summary:
          a.defense.lowestMaximumHit !== null
            ? `A ${a.defense.lowestMaximumHitType} hit of ${a.defense.lowestMaximumHit.toLocaleString()} kills you`
            : 'Max hit not available',
        badge: uncappedCount > 0 ? <StatusChip tone="danger">{uncappedCount} uncapped</StatusChip> : undefined,
        instrument: <ResistancePips resistances={a.defense.resistances} />,
        content: <DefensePanel d={a.defense} bare />,
      },
      {
        id: 'headroom',
        title: 'Survivability by map tier',
        summary:
          a.defense.lowestMaximumHit !== null
            ? `Against a ${a.defense.lowestMaximumHitType} hit of ${a.defense.lowestMaximumHit.toLocaleString()}`
            : undefined,
        content: <Headroom defense={a.defense} bare />,
      },
      {
        id: 'damage',
        title: 'Damage',
        summary: a.dps.unresolved ?? (primary ? `${primary.name} · ${primary.totalDps.toLocaleString()} dps` : undefined),
        instrument: primary ? <NumberReadout value={fmtCompact(primary.totalDps)} tone="accent" /> : undefined,
        content: (
          <DpsMatrix
            dps={a.dps}
            pobConfig={a.pobConfig}
            configApplies={a.reconciliation?.checks.find((c) => c.stat.startsWith('dps:'))?.severity === 'match'}
            bare
          />
        ),
      },
      {
        id: 'damage-review',
        title: 'Damage review — gems and gear',
        summary: primary
          ? `Support-gem swaps and damage-mod upgrades for ${primary.name}`
          : 'Support-gem swaps and damage-mod upgrades',
        content: (
          <DamageReview
            dps={a.dps}
            model={a.model}
            items={a.items}
            defense={a.defense}
            tiersState={tiersState}
            catalogState={catalogState}
            bare
          />
        ),
      },
      {
        id: 'progress',
        title: 'Progress',
        summary: history.diff
          ? `${history.diff.changes.length} figure${history.diff.changes.length === 1 ? '' : 's'} moved since your last import`
          : 'Import again after playing to see what moved',
        instrument: history.diff?.newlyUncapped.length ? (
          <StatusChip tone="danger">Dropped below cap</StatusChip>
        ) : history.diff?.newlyCapped.length ? (
          <StatusChip tone="good">Capped</StatusChip>
        ) : (
          <StatusChip>
            {history.snapshots.length} snapshot{history.snapshots.length === 1 ? '' : 's'}
          </StatusChip>
        ),
        content: <Progress history={history} bare />,
      },
      {
        id: 'attribution',
        title: 'What each item is holding up',
        summary: `${a.attribution.items.length} item${a.attribution.items.length === 1 ? '' : 's'} attributed`,
        badge:
          overcapped.length > 0 ? (
            <StatusChip tone="muted">
              {overcapped.length} over cap
            </StatusChip>
          ) : undefined,
        content: <Attribution report={a.attribution} bare />,
      },
      {
        id: 'gear',
        title: 'Gear workbench',
        summary:
          tiersState.status === 'error'
            ? 'Affix tier data unavailable'
            : 'Replace-first ranking · remove, re-tier or swap affixes and watch your resistances',
        badge: (() => {
          const open = shopping.entries.filter((e) => e.characterName === a.identity.name && !e.done).length
          return open ? <StatusChip tone="good">{open} on shopping list</StatusChip> : undefined
        })(),
        content: (
          <GearWorkbench
            items={a.items}
            defense={a.defense}
            state={tiersState}
            characterName={a.identity.name}
            {...(attributes ? { attributes } : {})}
            bare
          />
        ),
      },
      {
        id: 'passive-tree',
        title: 'Passive tree',
        summary: `${a.passives.counts.passives} points allocated`,
        instrument: <NumberReadout value={String(a.passives.counts.passives)} />,
        content: <TreePanel allocation={a.passives} state={treeState} {...upgradeInputs(a)} bare />,
      },
      {
        id: 'detail-checks',
        title: 'Detail checks',
        summary: 'Sockets, gem quality, jewels and spare attributes',
        content: <AuditPanel model={a.model} pobStats={a.pobStats} state={tiersState} bare />,
      },
    ]

    if (a.reconciliation) {
      const r = a.reconciliation
      panels.push({
        id: 'reconciliation',
        title: 'Cross-validation',
        summary: `${r.matches} agree${r.major ? ` · ${r.major} major` : ''}${r.minor ? ` · ${r.minor} minor` : ''}`,
        badge: r.major > 0 ? <StatusChip tone="danger">{r.major} major</StatusChip> : undefined,
        content: <Reconciliation report={r} bare />,
      })
    }

    return panels
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Character analysis</h1>
        <div className="mt-3 h-px w-24 bg-gradient-to-r from-[var(--accent)] to-transparent" />
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-dim">
          Reads poe.ninja&rsquo;s own computed character data and turns it into ranked, quantified findings. Nothing
          here is re-derived from scratch, and nothing is invented — where a number can&rsquo;t be established, it says
          so.
        </p>
      </header>

      {analysis || pobAnalysis ? (
        // Once a character is loaded the import box steps aside, so the stat
        // sheet leads the page. Keyed so it closes again on the next load.
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-line bg-surface-raised/70 px-3.5 py-2 text-sm text-ink-dim shadow-[var(--lift)] transition-colors hover:border-line-strong hover:text-ink [&::-webkit-details-marker]:hidden">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="size-3.5 text-accent transition-transform group-open:rotate-90"
            >
              <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Load another character
          </summary>
          <div className="mt-3">
            <ImportBar onResult={handleResult} busy={busy} setBusy={setBusy} />
          </div>
        </details>
      ) : (
        <ImportBar onResult={handleResult} busy={busy} setBusy={setBusy} />
      )}

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-danger/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        {busy ? <Skeleton /> : null}

        {!busy && !analysis && !pobAnalysis ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-surface-raised/40 px-6 py-16 text-center">
            <p className="text-sm text-ink-dim">Import a character to see its analysis.</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-mute">
              Survivability is led by the smallest hit that kills, not by an averaged effective health pool — which on
              a typical character overstates safety by three times or more.
            </p>
          </div>
        ) : null}

        {!busy && pobAnalysis ? (
          <div className="space-y-4">
            <PobAnalysisView analysis={pobAnalysis} />
            <Chat pob={pobAnalysis} />
          </div>
        ) : null}

        {!busy && analysis ? (
          <div className="space-y-4">
            <CharacterHero analysis={analysis} />

            {analysis.warnings.map((w) => (
              <p key={w} className="rounded-lg border border-warn/40 px-4 py-3 text-xs leading-relaxed text-warn">
                {w}
              </p>
            ))}

            <BuildScore assessment={analysis.assessment} keystones={analysis.keystones} />

            <Recommendations report={analysis.recommendations} />

            <div>
              <div className="mb-2 flex items-center">
                <h2 className="text-base font-semibold text-ink">Full analysis</h2>
                <PanelControls targetId="full-analysis" />
              </div>
              <div id="full-analysis" className="flex flex-col gap-1.5">
                {panelsFor(analysis).map((panel) => (
                  <Accordion
                    key={panel.id}
                    id={panel.id}
                    title={panel.title}
                    summary={panel.summary}
                    badge={panel.badge}
                    instrument={panel.instrument}
                    lazy
                  >
                    {panel.content}
                  </Accordion>
                ))}
              </div>
            </div>

            <Chat analysis={analysis} />
          </div>
        ) : null}
      </div>

      <footer className="mt-12 border-t border-line pt-5 text-[11px] leading-relaxed text-ink-mute">
        Character data from poe.ninja. Path of Exile 2 is a trademark of Grinding Gear Games; this is an unofficial
        fan-made tool.
      </footer>
    </>
  )
}
