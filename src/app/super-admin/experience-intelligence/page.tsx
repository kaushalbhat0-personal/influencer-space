import { computeExperienceAnalytics } from "@/modules/experience-intelligence";
import { ExperienceAnalyticsView } from "@/modules/experience-intelligence/presentation/experience-analytics";

export const dynamic = "force-dynamic";

export default async function ExperienceIntelligencePage() {
  const report = await computeExperienceAnalytics();
  return <ExperienceAnalyticsView report={report} />;
}
