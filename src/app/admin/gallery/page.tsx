import { Suspense } from "react";
import { ContentContainer } from "@/components/layout";
import { GalleryManager } from "@/features/gallery/components/gallery-page";
import { GalleryCardSkeleton } from "@/components/gallery/GalleryCard";
import { DashboardWidgetError } from "@/components/ui/DashboardWidget";
import { requireTenant } from "@/lib/auth/require-tenant";

export const dynamic = "force-dynamic";

async function GalleryContent({ tenantId }: { tenantId: string }) {
  const { fetchGalleryItems } = await import("@/actions/gallery.actions");
  const result = await fetchGalleryItems({ tenantId, page: 1, limit: 24 });

  if (!result.success) {
    return <DashboardWidgetError message={result.error || "Failed to load gallery"} />;
  }

  return (
    <GalleryManager
      tenantId={tenantId}
      initialItems={result.data?.items ?? []}
      initialTotal={result.data?.total ?? 0}
    />
  );
}

function GalleryFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-white/5 animate-pulse" />
      <div className="h-10 rounded bg-white/5 animate-pulse" />
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <GalleryCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export default async function AdminGalleryPage() {
  const { tenantId } = await requireTenant();

  return (
    <ContentContainer>
      <Suspense fallback={<GalleryFallback />}>
        <GalleryContent tenantId={tenantId} />
      </Suspense>
    </ContentContainer>
  );
}
