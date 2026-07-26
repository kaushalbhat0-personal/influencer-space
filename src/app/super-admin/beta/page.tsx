import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Suspense } from "react";
import { BetaDashboardClient } from "./_components/beta-dashboard-client";
import { getBetaDashboardData } from "@/lib/beta/beta-dashboard-service";
import { getPerformanceMetrics } from "@/lib/observability/service";
import { computeProductionScore } from "@/lib/observability/production-score";

export const dynamic = "force-dynamic";

export default async function BetaDashboardPage() {
  const [data, perfData, score] = await Promise.all([
    getBetaDashboardData(),
    getPerformanceMetrics(),
    computeProductionScore(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Beta Validation Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Monitor creator onboarding runs, health scores, and performance metrics.
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner size="lg" text="Loading..." />}>
        <BetaDashboardClient initialData={data} performanceData={perfData} readinessScore={score} />
      </Suspense>
    </div>
  );
}
