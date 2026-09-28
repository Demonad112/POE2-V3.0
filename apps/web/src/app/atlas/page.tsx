import type { Metadata } from "next";
import { AtlasSequenceTracker } from "@/components/atlas/AtlasSequenceTracker";
import { WarningPanel } from "@/components/shared/WarningPanel";
import { BiomePanel } from "@/components/atlas/BiomePanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { AtlasMapProvider } from "@/components/atlas/AtlasMapContext";
import { AtlasTreeMap } from "@/components/atlas/AtlasTreeMap";
import { AtlasGuideTabs } from "@/components/atlas/AtlasGuideTabs";
import { commonMistakes } from "@/data/commonMistakes";

export const metadata: Metadata = {
  title: "Atlas Tree Planner — PoE2 Endgame Companion",
};

export default function AtlasPage() {
  return (
    <AtlasMapProvider>
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Atlas Tree Planner"
          description="The order to take Atlas nodes in, and where each one is. Tick nodes as you allocate them; tap Map on any node to find it on the tree."
        />

        <AtlasSequenceTracker />

        {/* Phones keep map-then-guide. From lg the guide takes the left column
            and the map sticks in the right one, so "Map" on any row frames the
            node without scrolling back up to find the tree. */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <section
            className="card rounded-xl p-3 sm:p-4 lg:sticky lg:top-18 lg:col-start-2 lg:row-start-1"
            aria-label="Atlas tree map"
          >
            <AtlasTreeMap />
          </section>

          <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
            <WarningPanel mistakes={commonMistakes} stage="atlas" title="Atlas mistakes" />

            <AtlasGuideTabs />

            <BiomePanel />
          </div>
        </div>
      </div>
    </AtlasMapProvider>
  );
}
