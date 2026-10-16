import { describe, expect, it } from "vitest";
import type { PersistedState } from "../src/lib/types";
import { defaultState, parsePersisted, STORAGE_VERSION } from "../src/lib/storage";

const row = {
  at: "2026-10-01T00:00:00.000Z", updatedUtc: null, key: "a/b", level: 90, life: 1, energyShield: 1, ward: 0,
  armour: 1, evasion: 1, pool: 2, ehp: 3, fire: 75, cold: 75, lightning: 75, chaos: 0, dps: 1, weakestHit: 1, passives: 1,
};

describe("parsePersisted", () => {
  it("returns defaults for empty or corrupt storage", () => {
    expect(parsePersisted(null)).toBe(defaultState());
    expect(parsePersisted("{not json")).toBe(defaultState());
  });

  it("migrates unversioned snapshots and keeps the rest of the state", () => {
    const stored = { ...defaultState(), version: STORAGE_VERSION, checklist: { completedStepIds: ["s1"], completedActionItemKeys: [] }, character: { snapshots: [row, { junk: true }] } };
    const out = parsePersisted(JSON.stringify(stored));
    expect(out.checklist.completedStepIds).toEqual(["s1"]);
    expect(out.character.snapshots).toHaveLength(1);
    expect(out.character.snapshots[0]!.schema).toBe(2);
  });

  it("tolerates a payload with no character slice", () => {
    const rest: Partial<PersistedState> = { ...defaultState() };
    delete rest.character;
    const out = parsePersisted(JSON.stringify(rest));
    expect(out.character.snapshots).toEqual([]);
  });

  it("still discards a payload from another top-level version", () => {
    expect(parsePersisted(JSON.stringify({ ...defaultState(), version: STORAGE_VERSION + 1 }))).toBe(defaultState());
  });
});
