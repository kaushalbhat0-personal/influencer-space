import Link from "next/link";
import { GalleryService } from "@/services/gallery.service";
import { GalleryList } from "./_components/gallery-list";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GALLERY_ROUTE } from "@/lib/constants";
import { getTenantContext } from "@/lib/tenant";

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

  let images: Awaited<ReturnType<typeof GalleryService.findAll>> = [];
  let error: string | null = null;

  try {
    images = await GalleryService.findAll(tenant.id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load gallery";
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">Failed to load gallery</p>
        <p className="mt-1 text-sm text-red-300">{error}</p>
        <p className="mt-2 text-xs text-red-400/60">
          Make sure the database migration has been run.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gallery</h1>
          <p className="text-sm text-gray-400">
            Manage Hall of Fame images and categories
          </p>
        </div>
        <Link
          href={`${GALLERY_ROUTE}/new`}
          className="inline-flex items-center justify-center rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-s8ul-cyan/80"
        >
          + New Image
        </Link>
      </div>
      <ErrorBoundary>
        <GalleryList images={images} />
      </ErrorBoundary>
    </div>
  );
}
