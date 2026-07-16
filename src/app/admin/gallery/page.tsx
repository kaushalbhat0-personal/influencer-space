import { getTenantContext } from "@/lib/tenant";
import { fetchGalleryItems } from "@/actions/gallery.actions";
import { GalleryManager } from "./_components/gallery-manager";
import type { GalleryItemData } from "@/actions/gallery.actions";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const tenant = await getTenantContext();
  if (!tenant) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">No tenant configured</p>
      </div>
    );
  }

  const result = await fetchGalleryItems(tenant.id);
  const items: GalleryItemData[] =
    result.success && result.data ? result.data : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Hall of Fame</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage images and videos celebrating your greatest moments.
        </p>
      </div>
      <GalleryManager tenantId={tenant.id} initialItems={items} />
    </div>
  );
}
