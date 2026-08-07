import { getCommunicationCenterData } from "@/actions/communication.actions";
import { CommunicationCenter } from "./_components/communication-center";

export const dynamic = "force-dynamic";

export default async function CommunicationPage() {
  const data = await getCommunicationCenterData();
  if (!data.ok || !data.health) return <div className="p-8 text-sm text-red-400">{data.error ?? "Unauthorized"}</div>;
  return <CommunicationCenter health={data.health} history={data.history!} />;
}
