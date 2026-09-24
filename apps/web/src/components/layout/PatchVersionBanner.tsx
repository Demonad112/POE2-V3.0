import { CURRENT_PATCH, LEAGUE_LABEL } from "@/lib/constants";

export function PatchVersionBanner() {
  return (
    <div className="border-b border-line bg-surface-sunken px-4 py-1.5 text-center text-xs text-ink-mute">
      Data current as of patch{" "}
      <strong className="font-semibold text-ink-dim">{CURRENT_PATCH}</strong>{" "}
      ({LEAGUE_LABEL}) — community-derived, may drift from future patches. Items
      flagged{" "}
      <span className="font-medium text-accent">⚠ unverified/conflicting</span>{" "}
      should be double-checked in-game.
    </div>
  );
}
