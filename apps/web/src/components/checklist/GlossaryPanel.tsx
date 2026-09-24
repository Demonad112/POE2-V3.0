import { glossary } from "@/data/glossary";
import { Accordion } from "@/components/shared/Accordion";

export function GlossaryPanel() {
  return (
    <Accordion
      id="glossary"
      title="Glossary — endgame terms"
      summary="Waystones, Powerful Map Bosses, tablets, Crisis Fragments, Origin Cores, Masters, Honour and more."
      badge={
        <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-mute">
          {glossary.length} terms
        </span>
      }
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        {glossary.map((g) => (
          <div key={g.id} id={g.id} className="scroll-mt-28">
            <dt className="text-sm font-medium text-ink">{g.term}</dt>
            <dd className="mt-0.5 text-sm text-ink-mute">
              {g.definition}
              {g.seeStepId && (
                <>
                  {" "}
                  <a href={`#${g.seeStepId}`} className="text-[var(--accent)] hover:underline">
                    See step →
                  </a>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Accordion>
  );
}
