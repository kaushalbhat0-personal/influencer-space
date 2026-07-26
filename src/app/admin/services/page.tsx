import { requireTenant } from "@/lib/auth/require-tenant";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { GlassCard } from "@/components/ui/GlassCard";
import { serviceService } from "@/features/services/service";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const { tenantId } = await requireTenant();

  const services = await serviceService.list(tenantId);

  return (
    <FeaturePage title="Services" description="Manage your service offerings.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <GlassCard key={svc.id} className="p-5">
            <h3 className="font-semibold text-white">{svc.title}</h3>
            {svc.description && <p className="mt-1 text-sm text-zinc-400">{svc.description}</p>}
            <p className="mt-2 text-lg font-bold text-s8ul-cyan">₹{svc.price.toLocaleString("en-IN")}</p>
          </GlassCard>
        ))}
        {services.length === 0 && (
          <p className="text-sm text-zinc-500 col-span-full">No services yet.</p>
        )}
      </div>
    </FeaturePage>
  );
}
