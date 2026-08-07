import { businessHealthRuntime } from "@/modules/business-health";
import { PlatformHealthView } from "@/modules/business-health/presentation/platform-health-view";

export const dynamic = "force-dynamic";

export default async function BusinessHealthPage() {
  const report = await businessHealthRuntime.platformHealth();
  return <PlatformHealthView report={report} />;
}
