import { getGenerationMonitorData } from "@/actions/generation-monitor.actions";
import { GenerationMonitor } from "./_components/generation-monitor";

export const dynamic = "force-dynamic";

export default async function GenerationMonitorPage() {
  const data = await getGenerationMonitorData();
  if (!data.ok || !data.monitor) return <div className="p-8 text-sm text-red-400">{data.error ?? "Unauthorized"}</div>;
  return <GenerationMonitor monitor={data.monitor} />;
}
