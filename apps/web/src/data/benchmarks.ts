import type { BenchmarkGate } from "@/lib/types";
import { atlasSource, strategySource, video05Source, videoSource } from "./sourceMeta";

export const benchmarkGates: BenchmarkGate[] = [
  {
    id: "b-t11-gear-floor",
    label:
      "Park at T11 (area level 75) to gear and resist-cap before pushing further — it gives ~95% of loot value with far less risk than jumping to T15.",
    severity: "hard-gate",
    appliesBeforeStepId: "step-t11-park",
    source: strategySource(),
  },
  {
    id: "b-waystone-5mod",
    label:
      "Sustain 5-mod Waystones (~80% same-tier replacement chance) before investing further into a mechanic sub-tree.",
    severity: "soft-guideline",
    source: strategySource(),
  },
  {
    id: "b-pinnacle-readiness",
    label:
      "5,000+ life and 80%+ relevant resistances before Olroth/Simulacrum/Arbiter-tier pinnacles.",
    severity: "hard-gate",
    source: strategySource(),
  },
  {
    id: "b-level85-ascendancy",
    label:
      "Reach level 85+ and finish your 4th Ascendancy (low-tier 4-trial Barya from T11) before the Arbiter of Divinity pinnacle push.",
    severity: "hard-gate",
    source: strategySource(),
  },
  {
    id: "b-enigma-t10",
    label: "Enigma Chambers require Tier 10 Waystones minimum.",
    severity: "hard-gate",
    source: atlasSource(),
  },
  {
    id: "b-waystone-breakpoints",
    label:
      "Waystone breakpoints gate progression at Tier 6, 11, and 14 — buy a backup stone one tier below your best from Doryani right after crossing each one.",
    severity: "soft-guideline",
    source: atlasSource(),
  },
  {
    id: "b-gateway-t5",
    label: "The East Gateway needs a T5+ Waystone — reforge 3→1 if you don't have one.",
    severity: "hard-gate",
    source: videoSource(["5Vp_3gUFbwI@04:35"]),
  },
  {
    id: "b-ascendancy-3-at-70",
    label: "Do your 3rd Ascendancy at ~level 70 — slightly over-levelled is the safe margin.",
    severity: "soft-guideline",
    source: video05Source(["VSeDfybR3Cc@06:03"]),
  },
  {
    id: "b-honour-75",
    label:
      "Trial of the Sekhemas: bring relics for a full 75% Honour Resistance — Honour, not life, is what fails the run.",
    severity: "hard-gate",
    source: video05Source(["VSeDfybR3Cc@06:03"]),
  },
  {
    id: "b-divinity-t15",
    label:
      "Be comfortable in T15 before the second (non-quest) Arbiter of Divinity — it's stronger than the quest version.",
    severity: "soft-guideline",
    source: videoSource(["5Vp_3gUFbwI@07:39"]),
  },
];
