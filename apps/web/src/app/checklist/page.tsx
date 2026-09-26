import type { Metadata } from "next";
import { benchmarkGates } from "@/data/benchmarks";
import { ChecklistSection } from "@/components/checklist/ChecklistSection";
import { ChecklistProgressHeader } from "@/components/checklist/ChecklistProgressHeader";
import { ChecklistPhaseNav } from "@/components/checklist/ChecklistPhaseNav";
import { CommonMistakesPanel } from "@/components/checklist/CommonMistakesPanel";
import { GearShoppingList } from "@/components/checklist/GearShoppingList";
import { GlossaryPanel } from "@/components/checklist/GlossaryPanel";
import { MechanicsPrimer } from "@/components/checklist/MechanicsPrimer";
import { NextStepCard } from "@/components/checklist/NextStepCard";
import { ChecklistTools } from "@/components/checklist/ChecklistTools";
import { PageHeader } from "@/components/layout/PageHeader";
import { stepsByPhase } from "@/lib/roadmapOrder";
import { stepSummaries } from "@/lib/stepSummary";

export const metadata: Metadata = {
  title: "Progression Checklist — PoE2 Endgame Companion",
};

export default function ChecklistPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Progression Checklist"
        description="Campaign end through the full Atlas tree, the Master quest chains and your farming loop. Check off steps as you complete them — progress is saved in this browser."
      />

      <ChecklistProgressHeader />
      <NextStepCard steps={stepSummaries()} onChecklistPage />

      <ChecklistTools />

      <GearShoppingList />

      <div className="flex flex-col gap-3">
        <MechanicsPrimer />
        <GlossaryPanel />
        <CommonMistakesPanel />
      </div>

      <ChecklistPhaseNav />

      <div className="flex flex-col gap-2.5">
        {stepsByPhase.map(({ phase, steps }, index) => (
          <ChecklistSection
            key={phase}
            index={index}
            phase={phase}
            steps={steps}
            benchmarkGates={benchmarkGates}
          />
        ))}
      </div>
    </div>
  );
}
