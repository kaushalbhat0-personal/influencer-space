import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { GlassCard } from "@/components/ui/GlassCard";
import { integrationService } from "@/features/integrations/service";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const integrations = await integrationService.list(tenantId);

  return (
    <FeaturePage title="Integrations" description="Connect your store with third-party services.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((int) => (
          <GlassCard key={int.platform} className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">{int.name}</h3>
              <span className={`h-2 w-2 rounded-full ${int.connected ? "bg-emerald-500" : "bg-zinc-600"}`} />
            </div>
            <p className="mt-1 text-sm text-zinc-400">{int.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {int.scopes.map((scope) => (
                <span key={scope} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                  {scope}
                </span>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </FeaturePage>
  );
}
