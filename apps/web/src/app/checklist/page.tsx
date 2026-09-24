import type { Metadata } from "next";
import { benchmarkGates } from "@/data/benchmarks";
import { ChecklistSection } from "@/components/checklist/ChecklistSection";
import { ChecklistProgressHeader } from "@/components/checklist/ChecklistProgressHeader";
import { ChecklistPhaseNav } from "@/components/checklist/ChecklistPhaseNav";
import { CommonMistakesPanel } from "@/components/checklist/CommonMistakesPanel";
import { GlossaryPanel } from "@/components/checklist/GlossaryPanel";
import { MechanicsPrimer } from "@/components/checklist/MechanicsPrimer";
import { NextStepCard } from "@/components/checklist/NextStepCard";
import { ReadinessPanel } from "@/components/checklist/ReadinessPanel";
import { WaystonePlanner } from "@/components/checklist/WaystonePlanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { stepsByPhase } from "@/lib/roadmapOrder";

export const metadata: Metadata = {
  title: "Progression Checklist — PoE2 Endgame Companion",
};

export default function ChecklistPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Progression Checklist"
        description="Campaign end through the full Atlas tree, the Master quest chains and your farming loop. Check off steps as you complete them — progress is saved in this browser."
      />

      <ChecklistProgressHeader />
      <NextStepCard onChecklistPage />

      <div className="grid gap-4 lg:grid-cols-2">
        <WaystonePlanner />
        <ReadinessPanel />
      </div>

      <div className="flex flex-col gap-3">
        <MechanicsPrimer />
        <GlossaryPanel />
        <CommonMistakesPanel />
      </div>

      <ChecklistPhaseNav />

      <div className="flex flex-col gap-8">
        {stepsByPhase.map(({ phase, steps }) => (
          <ChecklistSection
            key={phase}
            phase={phase}
            steps={steps}
            benchmarkGates={benchmarkGates}
          />
        ))}
      </div>
    </div>
  );
}
