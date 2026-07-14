import Link from "next/link";
import { GalleryService } from "@/services/gallery.service";
import { GalleryList } from "./_components/gallery-list";
import { GALLERY_ROUTE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const images = await GalleryService.findAll();

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
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
        >
          + New Image
        </Link>
      </div>
      <GalleryList images={images} />
    </div>
  );
}
