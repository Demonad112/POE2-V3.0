import { patchDeltas } from "@/data/endgameUpdate";
import { Accordion } from "@/components/shared/Accordion";
import { SourceFlag } from "@/components/shared/SourceFlag";

/** Old 0.5.0 guide advice that 0.5.5 overturned, so a stale guide is easy to spot. */
export function PatchChangesPanel() {
  return (
    <Accordion
      id="patch-0-5-5-changes"
      title="0.5.0 → 0.5.5 — what changed in the endgame"
      summary="If an older guide disagrees with this app, check here first: 2 Divinity kills, boss resistances, Rakiata's Flow, Expedition, Delirium."
      badge={
        <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-mute">
          {patchDeltas.length} changes
        </span>
      }
    >
      <ul className="grid gap-2.5">
        {patchDeltas.map((d) => (
          <li key={d.id} id={d.id} className="scroll-mt-28 rounded-lg border border-line bg-surface-raised px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-sm font-semibold text-ink">{d.system}</h4>
              <SourceFlag source={d.source} />
            </div>
            <dl className="mt-1.5 grid gap-1.5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute">Old advice</dt>
                <dd className="text-ink-mute line-through decoration-ink-mute/40">{d.before}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-accent">0.5.5</dt>
                <dd className="text-ink-dim">{d.now}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </Accordion>
  );
}
