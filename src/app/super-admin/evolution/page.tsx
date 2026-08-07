import { websiteEvolutionRuntime } from "@/modules/website-evolution";
import { PlatformEvolutionView } from "@/modules/website-evolution/presentation/platform-evolution";

export const dynamic = "force-dynamic";

export default async function WebsiteEvolutionPage() {
  const report = await websiteEvolutionRuntime.platformEvolution();
  return <PlatformEvolutionView report={report} />;
}
