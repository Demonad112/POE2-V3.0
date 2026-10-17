/**
 * The 0.5.5 endgame reference: search strings must fit the in-game bar and
 * find real nodes, soft-brick groups must agree with the regex groups, and no
 * guide text may still teach the pre-0.5.5 five-kill Fortress unlock.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { essences, patchDeltas, regexStrings, REGEX_MAX_LENGTH } from "@/data/endgameUpdate";
import { atlasTrapNodes } from "@/data/trapNodes";
import { pinnacleBosses } from "@/data/bosses";
import { roadmapSteps } from "@/data/roadmap";

const tree = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../packages/data/generated/atlas-tree.json", import.meta.url)), "utf8")
) as { byName: Record<string, number[]> };
const nodeNames = Object.keys(tree.byName).map((n) => n.toLowerCase());

/** Quoted terms of a search string, each split on `|`. */
function terms(regex: string): string[] {
  return [...regex.matchAll(/"([^"]*)"/g)].flatMap((m) => m[1]!.split("|"));
}

describe("search strings", () => {
  it("fit the 50-character in-game search bar, quotes included", () => {
    for (const r of regexStrings) expect(r.regex.length, r.id).toBeLessThanOrEqual(REGEX_MAX_LENGTH);
  });

  it("have unique ids, balanced quotes and no HTML entities", () => {
    expect(new Set(regexStrings.map((r) => r.id)).size).toBe(regexStrings.length);
    for (const r of regexStrings) {
      expect((r.regex.match(/"/g) ?? []).length % 2, r.id).toBe(0);
      expect(r.regex, r.id).not.toMatch(/&(quot|amp|lt|gt|#\d+);/);
    }
  });

  it("every soft-brick term matches a real Atlas node", () => {
    for (const r of regexStrings.filter((x) => x.id.startsWith("rx-brick"))) {
      for (const t of terms(r.regex)) {
        expect(
          nodeNames.some((n) => n.includes(t.toLowerCase())),
          `${r.id}: ${t}`
        ).toBe(true);
      }
    }
  });

  it("each soft-brick string only highlights nodes in its own trap group", () => {
    const byGroup = (g: number) => atlasTrapNodes.filter((t) => t.group === g).map((t) => t.node.toLowerCase());
    const groups: Record<string, number> = { "rx-brick-1": 1, "rx-brick-2": 2, "rx-brick-3": 3 };
    for (const [id, group] of Object.entries(groups)) {
      const regex = regexStrings.find((r) => r.id === id)!.regex;
      for (const t of terms(regex)) {
        const hit = byGroup(group).some((n) => n.includes(t.toLowerCase()));
        expect(hit, `${id}: ${t} is not a group ${group} trap node`).toBe(true);
      }
    }
  });
});

describe("trap nodes", () => {
  it("name the soft bricks the update calls out, with a group", () => {
    const names = new Set(atlasTrapNodes.map((t) => t.node));
    for (const n of [
      "Reactive Hiveseeding",
      "Survival of the Fittest",
      "Man Trap",
      "Escalating Rivalry",
      "The Lost Architect",
      "Mysterious Transference",
    ]) {
      expect(names.has(n), n).toBe(true);
    }
    for (const t of atlasTrapNodes) expect([1, 2, 3], t.id).toContain(t.group);
  });

  it("flag every group 1 node as hard avoid", () => {
    for (const t of atlasTrapNodes.filter((x) => x.group === 1)) expect(t.severity, t.id).toBe("avoid");
  });
});

describe("0.5.5 content", () => {
  it("states the Arbiter of Divinity resistances and the Rakiata's Flow warning", () => {
    const ash = pinnacleBosses.find((b) => b.id === "arbiter-of-ash")!;
    const divinity = pinnacleBosses.find((b) => b.id === "arbiter-of-divinity")!;
    expect(ash.notes).toMatch(/Fire Resistance and Cold Vulnerability/);
    expect(divinity.notes).toMatch(/45% Lightning Resistance and Fire Vulnerability/);
    expect(divinity.notes).toMatch(/Rakiata's Flow/);
  });

  it("has a unique id on every delta and essence", () => {
    expect(new Set(patchDeltas.map((d) => d.id)).size).toBe(patchDeltas.length);
    expect(new Set(essences.map((e) => e.id)).size).toBe(essences.length);
  });

  it("keeps the two build-strength tracks in the roadmap", () => {
    const fork = roadmapSteps.find((s) => s.id === "step-build-strength-fork")!;
    expect(fork.phase).toBe("t11-checkpoint");
    expect(fork.tips?.join(" ")).toMatch(/Track A/);
    expect(fork.tips?.join(" ")).toMatch(/Track B/);
  });

  it("never teaches the five-kill Fortress unlock as current", () => {
    const stale = /(kill|defeat|beat)\w*[^.]{0,60}(5|five)\s*(times|kills)|repeat[- ]5[- ]times/i;
    const here = fileURLToPath(new URL("../src", import.meta.url));
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [];
      });
    for (const file of walk(here)) {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (!stale.test(line)) continue;
        // Mentions that frame it as the old behaviour are fine.
        expect(line, `${file}: ${line.trim()}`).toMatch(/old|before|pre-0\.5\.5|replac|no longer|gone|was /i);
      }
    }
  });
});
