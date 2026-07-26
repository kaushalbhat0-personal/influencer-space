import { requireTenant } from "@/lib/auth/require-tenant";
import { TestimonialsPage } from "@/features/testimonials/components/testimonials-page";
import { testimonialService } from "@/features/testimonials/service";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  const { tenantId } = await requireTenant();

  const items = await testimonialService.list(tenantId);
  return <TestimonialsPage initialData={items} tenantId={tenantId} />;
}
