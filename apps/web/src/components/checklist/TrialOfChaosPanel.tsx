import {
  trialOfChaosModifiers,
  trialOfChaosRules,
  trialOfChaosWagers,
} from "@/data/endgameUpdate";
import { Accordion } from "@/components/shared/Accordion";

export function TrialOfChaosPanel() {
  const free = trialOfChaosModifiers.filter((m) => m.tier === "free");
  const avoid = trialOfChaosModifiers.filter((m) => m.tier === "avoid");
  return (
    <Accordion
      id="trial-of-chaos"
      title="Trial of Chaos (0.5.5 rework)"
      summary="Pause and resume, a chest every room, 30 rooms on one Ultimatum, which modifiers to take and which wagers."
      badge={
        <span className="rounded border border-accent-line px-1.5 py-0.5 text-[10px] text-accent">
          Spec-sourced, unverified
        </span>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <ul className="list-disc space-y-1 pl-5 text-ink-dim">
          {trialOfChaosRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-mute">Take: free or buffs loot</h4>
            <ul className="space-y-1">
              {free.map((m) => (
                <li key={m.name}>
                  <span className="font-medium text-ink">{m.name}</span>{" "}
                  <span className="text-ink-mute">{m.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">Avoid: run-killers</h4>
            <ul className="space-y-1">
              {avoid.map((m) => (
                <li key={m.name}>
                  <span className="font-medium text-ink">{m.name}</span>{" "}
                  <span className="text-ink-mute">{m.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-mute">Wagers</h4>
          <ul className="list-disc space-y-1 pl-5 text-ink-dim">
            {trialOfChaosWagers.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-mute">
          Source: the 0.5.5 endgame update spec (Lolcohol&apos;s Trial of Chaos guide and the patch notes). Not re-read
          against them here.
        </p>
      </div>
    </Accordion>
  );
}
