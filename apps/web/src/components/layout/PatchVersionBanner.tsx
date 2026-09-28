import { CURRENT_PATCH, LEAGUE_LABEL } from "@/lib/constants";
import { BannerDismiss } from "./BannerDismiss";

/**
 * One line on phones, the full note from `sm` up. Closing it is remembered
 * for this patch only (see lib/bannerDismiss).
 */
export function PatchVersionBanner() {
  return (
    <div className="patch-banner flex items-center gap-2 border-b border-line bg-surface-sunken/90 py-1.5 pr-2 pl-4 text-[11px] leading-relaxed text-ink-mute">
      <p className="min-w-0 flex-1 text-center">
        <span className="block truncate sm:hidden">
          Patch <strong className="font-semibold text-ink-dim">{CURRENT_PATCH}</strong> · community data — verify{" "}
          <span className="font-medium text-accent">⚠</span> items in-game
        </span>
        <span className="hidden sm:inline">
          Data current as of patch{" "}
          <strong className="font-semibold text-ink-dim">{CURRENT_PATCH}</strong>{" "}
          ({LEAGUE_LABEL}) — community-derived, may drift from future patches. Items
          flagged{" "}
          <span className="font-medium text-accent">⚠ unverified/conflicting</span>{" "}
          should be double-checked in-game.
        </span>
      </p>
      <BannerDismiss patch={CURRENT_PATCH} />
    </div>
  );
}
