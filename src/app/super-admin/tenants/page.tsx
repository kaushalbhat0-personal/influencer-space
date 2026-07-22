import { getAllTenants } from "@/services/super-admin.service";
import { MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { TenantsTable } from "./_components/tenants-table";
import { Building } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  let tenants: { id: string; name: string; subdomain: string | null; customDomain: string | null }[] = [];
  try { tenants = await getAllTenants(); } catch { /* empty */ }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Tenants</h1>
        <p className="mt-1 text-sm text-zinc-400">All creator websites on the platform.</p>
      </div>

      <div className="mb-6">
        <MetricGrid>
          <MetricCard label="Total Tenants" value={tenants.length} icon={Building} />
          <MetricCard label="Custom Domains" value={tenants.filter((t) => t.customDomain).length} />
          <MetricCard label="Using Subdomain" value={tenants.filter((t) => t.subdomain && !t.customDomain).length} />
        </MetricGrid>
      </div>

      <TenantsTable data={tenants} />
    </div>
  );
}
