import { requireTenant } from "@/lib/auth/require-tenant";
import { faqService } from "@/features/faq/service";
import { FAQManager } from "./_components/faq-manager";

export const dynamic = "force-dynamic";

export default async function AdminFAQPage() {
  const { tenantId } = await requireTenant();
  const items = await faqService.list(tenantId);

  return <FAQManager initialData={items} />;
}
