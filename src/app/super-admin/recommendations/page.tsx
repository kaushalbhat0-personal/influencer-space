import { recommendationRuntime } from "@/modules/recommendation-runtime";
import { RecommendationAnalyticsView } from "@/modules/recommendation-runtime/presentation/recommendation-analytics";

export const dynamic = "force-dynamic";

export default async function RecommendationAnalyticsPage() {
  const analytics = await recommendationRuntime.analytics();
  return <RecommendationAnalyticsView analytics={analytics} />;
}
