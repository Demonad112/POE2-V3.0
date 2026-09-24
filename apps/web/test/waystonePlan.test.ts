import { describe, expect, it } from "vitest";
import { areaLevel, planWaystones, tierBand } from "@/lib/waystonePlan";
import { nextIncompleteStep, orderedSteps } from "@/lib/roadmapOrder";

describe("planWaystones", () => {
  it("starts a fresh character on T1 with nothing to buy yet", () => {
    const p = planWaystones(0);
    expect(p.nextTier).toBe(1);
    expect(p.nextAreaLevel).toBe(65);
    expect(p.doryaniSells).toBeNull();
    expect(p.reforge).toBeNull();
    expect(p.nextGate?.tier).toBe(5);
  });

  it("sells one tier below the highest completed and points at the next gate", () => {
    const p = planWaystones(7);
    expect(p.doryaniSells).toBe(6);
    expect(p.reforge).toBe("3× T7 → 1× T8 at the reforging bench");
    expect(p.nextGate?.tier).toBe(10);
    expect(p.gatesPassed.map((g) => g.tier)).toEqual([5, 6]);
    expect(p.backups).toEqual(["a few T6 (buy from Doryani)"]);
  });

  it("never plans past T15 and never reforges out of it", () => {
    const p = planWaystones(15);
    expect(p.nextTier).toBe(15);
    expect(p.reforge).toBeNull();
    expect(p.nextGate).toBeNull();
    expect(planWaystones(16).nextTier).toBe(15);
  });

  it("clamps junk input", () => {
    expect(planWaystones(-3).highest).toBe(0);
    expect(planWaystones(99).highest).toBe(16);
  });
});

describe("tier helpers", () => {
  it("maps tiers to area level and colour band", () => {
    expect(areaLevel(15)).toBe(79);
    expect(areaLevel(16)).toBe(80);
    expect(tierBand(5)).toBe("white");
    expect(tierBand(6)).toBe("yellow");
    expect(tierBand(11)).toBe("red");
    expect(tierBand(16)).toBe("corrupted");
  });
});

describe("nextIncompleteStep", () => {
  it("returns the first unticked step in play order", () => {
    expect(nextIncompleteStep([])?.id).toBe(orderedSteps[0].id);
    expect(nextIncompleteStep([orderedSteps[0].id])?.id).toBe(orderedSteps[1].id);
    expect(nextIncompleteStep(orderedSteps.map((s) => s.id))).toBeNull();
  });
});
