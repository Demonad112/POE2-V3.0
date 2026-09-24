import {
  BIOME_LOADOUT,
  atlasFocusByFarm,
  biomeCityPairs,
  biomes,
} from "@/data/biomes";
import { Accordion } from "@/components/shared/Accordion";
import { SourceFlag } from "@/components/shared/SourceFlag";

export function BiomePanel() {
  return (
    <Accordion
      id="atlas-biomes"
      title="Biomes & Atlas focus per farm"
      summary={`Default loadout: ${BIOME_LOADOUT}. City maps grant two biomes each.`}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-dim">
          Default loadout: <span className="font-medium text-ink">{BIOME_LOADOUT}</span>.
          City maps grant a choice of two biomes:{" "}
          {biomeCityPairs.map((p, i) => (
            <span key={p.city}>
              {i > 0 && "; "}
              {p.city} → {p.biomes}
            </span>
          ))}
          .
        </p>

        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--surface-sunken)] text-left text-ink-mute">
              <tr>
                <th className="px-3 py-2 font-medium">Biome</th>
                <th className="px-3 py-2 font-medium">Gives</th>
                <th className="px-3 py-2 font-medium">Pick</th>
              </tr>
            </thead>
            <tbody>
              {biomes.map((b) => (
                <tr key={b.id} id={b.id} className="scroll-mt-24 border-b border-line last:border-0">
                  <td className="px-3 py-2 font-medium text-ink">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {b.name}
                      <SourceFlag source={b.source} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-ink-mute">{b.gives}</td>
                  <td className="px-3 py-2 text-ink-dim">{b.recommendedPick}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-ink-dim">
            Which Atlas stat to push for your farm
          </h4>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {atlasFocusByFarm.map((f) => (
              <li key={f.farm} className="text-ink-mute">
                <span className="font-medium text-ink-dim">{f.farm}:</span> {f.focus}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Accordion>
  );
}
