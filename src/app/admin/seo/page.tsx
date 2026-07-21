import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SEOPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;
  }

  return (
    <ContentContainer>
      <PageHeader
        title="SEO"
        description="Optimize your storefront for search engines. Meta tags, sitemap, and more."
        breadcrumbs={[{ label: "Website", href: "/admin/appearance" }, { label: "SEO" }]}
        status={{ label: "New", variant: "default" }}
      />
      <EmptyState
        title="SEO tools coming soon"
        description="Meta editor, sitemap generator, and search console integration."
        icon={Search}
      />
    </ContentContainer>
  );
}
