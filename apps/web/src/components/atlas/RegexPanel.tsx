import { REGEX_MAX_LENGTH, regexStrings } from "@/data/endgameUpdate";
import { Accordion } from "@/components/shared/Accordion";
import { CopyButton } from "@/components/shared/CopyButton";
import { SourceFlag } from "@/components/shared/SourceFlag";

export function RegexPanel() {
  return (
    <Accordion
      id="atlas-regex"
      title="Search strings (copy and paste)"
      summary="Highlight soft-brick nodes on the Atlas tree, and filter stash or vendor gear."
      badge={
        <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-mute">
          {regexStrings.length} strings
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-dim">
          On the Atlas tree press <kbd className="rounded border border-line px-1 font-mono text-xs">Ctrl+F</kbd>, paste
          the string with its quotes, then press Enter to cycle through the matches. Save favourites in Social Status
          (<kbd className="rounded border border-line px-1 font-mono text-xs">J</kbd>) or Exiled Exchange 2. In-game
          search bars take {REGEX_MAX_LENGTH} characters at most, quotes included.
        </p>
        <ul className="grid gap-2">
          {regexStrings.map((r) => (
            <li key={r.id} id={r.id} className="scroll-mt-28 rounded-lg border border-line bg-surface-raised px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-ink">{r.label}</span>
                <span className="rounded border border-line px-1.5 py-px text-[10px] uppercase text-ink-mute">
                  {r.where === "atlas" ? "Atlas tree" : "Stash / vendor"}
                </span>
                <span className="tabular text-[10px] text-ink-mute">{r.regex.length} chars</span>
                <SourceFlag source={r.source} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <code className="break-all rounded bg-surface-sunken px-2 py-1 font-mono text-xs text-ink">{r.regex}</code>
                <CopyButton text={r.regex} label={r.label} />
              </div>
              {r.note ? <p className="mt-1.5 text-xs text-ink-mute">{r.note}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </Accordion>
  );
}
