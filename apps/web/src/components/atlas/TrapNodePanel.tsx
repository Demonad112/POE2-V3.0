import { atlasTrapNodes } from "@/data/trapNodes";
import { Accordion } from "@/components/shared/Accordion";
import { SourceFlag } from "@/components/shared/SourceFlag";

const SEVERITY_STYLES: Record<string, string> = {
  avoid: "border-danger/40 bg-danger/15 text-[var(--danger)]",
  situational: "border-accent/40 bg-accent/15 text-[var(--warn)]",
  optional: "border-line bg-surface-sunken text-ink-mute",
};

export function TrapNodePanel() {
  const hardAvoid = atlasTrapNodes.filter((n) => n.severity === "avoid").length;
  return (
    <Accordion
      id="atlas-trap-nodes"
      title="Trap nodes — check before you allocate"
      summary="Atlas points can't be refunded. Man Trap, Survival of the Fittest (Abyss), the hive-seeded Breach node and more."
      badge={
        <span className="rounded border border-danger/40 bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--danger)]">
          {hardAvoid} always-avoid · {atlasTrapNodes.length} total
        </span>
      }
      defaultOpen
    >
      <ul className="grid gap-2 md:grid-cols-2">
        {atlasTrapNodes.map((trap) => (
          <li
            key={trap.id}
            id={trap.id}
            className="scroll-mt-24 rounded-md border border-[var(--line)] bg-[var(--surface-sunken)] p-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{trap.node}</span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${SEVERITY_STYLES[trap.severity]}`}
              >
                {trap.severity}
              </span>
              <span className="text-xs text-ink-mute">{trap.affects}</span>
              <SourceFlag source={trap.source} />
            </div>
            <p className="mt-1 text-xs text-ink-mute">{trap.problem}</p>
            <p className="mt-1 text-xs text-ink-dim">
              <span className="font-medium">Skip if:</span> {trap.avoidIf}
            </p>
          </li>
        ))}
      </ul>
    </Accordion>
  );
}
