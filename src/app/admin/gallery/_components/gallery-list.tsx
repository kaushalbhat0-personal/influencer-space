"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GALLERY_ROUTE } from "@/lib/constants";
import { deleteGalleryImage } from "@/actions/gallery.actions";
import type { GalleryImageData } from "@/services/gallery.service";

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

const categoryStyles: Record<string, string> = {
  bgmi: "admin-badge-cyan",
  tournament: "admin-badge-gold",
  s8ul: "text-transparent bg-clip-text bg-gradient-to-r from-s8ul-pink to-s8ul-purple bg-s8ul-pink/10 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  "behind-scenes": "admin-badge bg-white/10 text-gray-300",
};

export function GalleryList({ images }: { images: GalleryImageData[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    const result = await deleteGalleryImage(id);
    if (result.success) router.refresh();
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
    >
      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Media</th>
              <th>Title</th>
              <th className="hidden sm:table-cell">Type</th>
              <th className="hidden sm:table-cell">Category</th>
              <th className="hidden sm:table-cell">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {images.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  No gallery items yet.{" "}
                  <Link href={`${GALLERY_ROUTE}/new`} className="font-semibold text-s8ul-cyan hover:underline">
                    Add your first item
                  </Link>
                </td>
              </tr>
            ) : (
              images.map((image) => (
                <motion.tr key={image.id} variants={rowVariants} className="group">
                  <td>
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/10">
                      <img src={image.imageUrl} alt={image.title} className="h-full w-full object-cover" />
                      {image.mediaType === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="font-medium text-white">{image.title}</td>
                  <td className="hidden sm:table-cell">
                    <span className={image.mediaType === "video" ? "admin-badge-purple" : "admin-badge-cyan"}>
                      {image.mediaType === "video" ? "Video" : "Image"}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className={categoryStyles[image.category] || "admin-badge bg-white/10 text-gray-300"}>
                      {image.category}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className={image.isActive ? "admin-badge-active" : "admin-badge-inactive"}>
                      {image.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Link href={`${GALLERY_ROUTE}/${image.id}/edit`} className="admin-btn-outline px-3 py-1.5 text-xs">
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(image.id)} className="admin-btn-danger px-3 py-1.5 text-xs">
                        Delete
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
