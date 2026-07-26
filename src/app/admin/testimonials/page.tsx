import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { TestimonialsPage } from "@/features/testimonials/components/testimonials-page";
import { testimonialService } from "@/features/testimonials/service";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const items = await testimonialService.list(tenantId);
  return <TestimonialsPage initialData={items} tenantId={tenantId} />;
}
