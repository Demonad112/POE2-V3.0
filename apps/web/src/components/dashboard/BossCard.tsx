import type { PinnacleBoss } from "@/lib/types";
import { Tag } from "@/components/shared/Tag";
import { SourceFlag } from "@/components/shared/SourceFlag";

/**
 * A pinnacle boss, closed to what you need to walk in: name, mechanic, HP
 * floor and the fragments. The quest route and fight notes open on tap —
 * written out in full they made the dashboard a wall of text on a phone.
 */
export function BossCard({ boss }: { boss: PinnacleBoss }) {
  const detail = boss.gatingRequirements.length > 0 || Boolean(boss.notes);
  return (
    <details
      id={boss.id}
      className="group card scroll-mt-40 rounded-xl transition-colors hover:border-line-strong open:border-accent-line"
    >
      <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="font-display text-lg leading-tight text-ink">{boss.name}</h3>
            {boss.mechanic && !["apex", "trial"].includes(boss.mechanic) && <Tag mechanic={boss.mechanic} />}
          </div>
          {detail ? (
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="mt-1 size-3.5 shrink-0 text-ink-mute transition-transform group-open:rotate-90"
            >
              <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </div>
        {boss.hpFloor ? <p className="text-xs text-ink-mute">HP floor: {boss.hpFloor}</p> : null}
        {boss.fragmentCost.length > 0 ? (
          <ul className="space-y-1">
            {boss.fragmentCost.map((f) => (
              <li key={f.itemName} className="flex items-baseline gap-2 text-sm text-ink-dim">
                <span className="tabular shrink-0 rounded bg-accent-soft px-1.5 text-xs font-semibold text-accent">
                  {f.quantity}×
                </span>
                {f.itemName}
              </li>
            ))}
          </ul>
        ) : null}
        {detail ? (
          <span className="text-[11px] text-accent group-open:hidden">
            {boss.gatingRequirements.length
              ? `How to unlock (${boss.gatingRequirements.length} step${boss.gatingRequirements.length === 1 ? "" : "s"})`
              : "Fight notes"}
          </span>
        ) : null}
      </summary>
      {detail ? (
        <div className="space-y-2 border-t border-line px-4 pt-3 pb-4">
          {boss.gatingRequirements.length ? (
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-ink-dim marker:text-accent">
              {boss.gatingRequirements.map((req) => (
                <li key={req}>{req}</li>
              ))}
            </ol>
          ) : null}
          {boss.notes ? <p className="text-xs leading-relaxed text-ink-mute">{boss.notes}</p> : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 empty:hidden">
        <SourceFlag source={boss.source} />
      </div>
    </details>
  );
}
