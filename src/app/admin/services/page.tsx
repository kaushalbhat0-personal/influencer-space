import { requireTenant } from "@/lib/auth/require-tenant";
import { serviceService } from "@/features/services/service";
import { ServicesManager } from "./_components/services-manager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const { tenantId } = await requireTenant();
  const services = await serviceService.list(tenantId);

  return <ServicesManager initialData={services} />;
}
