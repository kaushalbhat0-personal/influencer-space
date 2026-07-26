import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { GlassCard } from "@/components/ui/GlassCard";
import { faqService } from "@/features/faq/service";

export const dynamic = "force-dynamic";

export default async function AdminFAQPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const items = await faqService.list(tenantId);

  return (
    <FeaturePage title="FAQ" description="Manage frequently asked questions.">
      <div className="space-y-3">
        {items.map((item) => (
          <GlassCard key={item.id} className="p-5">
            <h3 className="font-semibold text-white">{item.question}</h3>
            <p className="mt-1 text-sm text-zinc-400">{item.answer}</p>
          </GlassCard>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-zinc-500">No FAQ items yet.</p>
        )}
      </div>
    </FeaturePage>
  );
}
