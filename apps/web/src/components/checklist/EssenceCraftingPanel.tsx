import { essenceRules, essences } from "@/data/endgameUpdate";
import { Accordion } from "@/components/shared/Accordion";
import { SourceFlag } from "@/components/shared/SourceFlag";

export function EssenceCraftingPanel() {
  return (
    <Accordion
      id="essence-crafting"
      title="Essence crafting — Perfect and Corrupted Essences"
      summary="The 3-prefix / 3-suffix isolation rule, the Crystallisation Omens, and the high-impact endgame essences."
      badge={
        <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-mute">
          {essences.length} essences
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-dim">
          {essenceRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--surface-sunken)] text-left text-ink-mute">
              <tr>
                <th className="px-3 py-2 font-medium">Essence</th>
                <th className="px-3 py-2 font-medium">Slot</th>
                <th className="px-3 py-2 font-medium">Mod</th>
                <th className="px-3 py-2 font-medium">Effect and use</th>
              </tr>
            </thead>
            <tbody>
              {essences.map((e) => (
                <tr key={e.id} id={e.id} className="scroll-mt-28 border-b border-line last:border-0">
                  <td className="px-3 py-2 font-medium text-ink">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {e.name}
                      <SourceFlag source={e.source} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-ink-mute">{e.slot}</td>
                  <td className="px-3 py-2 text-ink-mute">{e.modType}</td>
                  <td className="px-3 py-2 text-ink-dim">{e.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Accordion>
  );
}
