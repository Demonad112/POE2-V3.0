import { commonMistakes } from "@/data/commonMistakes";
import { WarningPanel } from "@/components/shared/WarningPanel";
import { Accordion } from "@/components/shared/Accordion";

/**
 * Every progression mistake in one place, collapsed by default: each step now
 * shows its own relevant warnings, so the full list is reference, not a wall
 * of red on first load.
 */
export function CommonMistakesPanel() {
  const count = commonMistakes.filter((m) => m.appliesToStage.includes("roadmap")).length;
  return (
    <Accordion
      id="common-mistakes"
      title="All common progression mistakes"
      summary="Each step shows its own warnings — open this for the full list."
      badge={
        <span className="rounded border border-danger/40 bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--danger)]">
          {count}
        </span>
      }
    >
      <WarningPanel mistakes={commonMistakes} stage="roadmap" title="Common progression mistakes" />
    </Accordion>
  );
}
