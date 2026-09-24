import { primerFacts, tierBreakpoints } from "@/data/mechanicsPrimer";
import { Accordion } from "@/components/shared/Accordion";
import { SourceFlag } from "@/components/shared/SourceFlag";

export function MechanicsPrimer() {
  return (
    <Accordion
      id="mechanics-primer"
      title="Before your first map — how the endgame works"
      summary="Tiers and area level, what Waystone mods cost you, tablet slots, and how you climb tiers."
    >
      <div className="flex flex-col gap-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {primerFacts.map((fact) => (
            <div key={fact.id} id={fact.id} className="scroll-mt-24">
              <dt className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                {fact.topic}
                <SourceFlag source={fact.source} />
              </dt>
              <dd className="mt-0.5 text-sm text-ink-mute">{fact.detail}</dd>
            </div>
          ))}
        </dl>

        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--surface-sunken)] text-left text-ink-mute">
              <tr>
                <th className="px-3 py-2 font-medium">Tier</th>
                <th className="px-3 py-2 font-medium">Area level</th>
                <th className="px-3 py-2 font-medium">What unlocks</th>
                <th className="px-3 py-2 font-medium">Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {tierBreakpoints.map((row) => (
                <tr key={row.tier} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-medium text-ink">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.tier}
                      <SourceFlag source={row.source} />
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-ink-dim">{row.areaLevel}</td>
                  <td className="px-3 py-2 text-ink-mute">{row.unlocks}</td>
                  <td className="px-3 py-2 text-ink-dim">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Accordion>
  );
}
