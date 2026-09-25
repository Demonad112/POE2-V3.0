import type { Metadata } from "next";
import { commonMistakes } from "@/data/commonMistakes";
import { StrategyQuiz } from "@/components/dashboard/StrategyQuiz";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { WarningPanel } from "@/components/shared/WarningPanel";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Farming Dashboard — PoE2 Endgame Companion",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Farming Dashboard"
        description="Ranked strategies, a quick picker, pinnacle boss requirements, and current meta builds — numbers are community-derived and will drift across patches."
      />

      <section>
        <SectionTitle>Which strategy should I run?</SectionTitle>
        <StrategyQuiz />
      </section>

      <WarningPanel mistakes={commonMistakes} stage="dashboard" />

      <DashboardTabs />
    </div>
  );
}
