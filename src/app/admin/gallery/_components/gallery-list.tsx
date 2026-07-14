"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GALLERY_ROUTE } from "@/lib/constants";
import { deleteGalleryImage } from "@/actions/gallery.actions";
import type { GalleryImageData } from "@/services/gallery.service";

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export function GalleryList({ images }: { images: GalleryImageData[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this image?")) return;
    const result = await deleteGalleryImage(id);
    if (result.success) router.refresh();
  }

  return (
    <motion.div
      variants={tableVariants}
      initial="hidden"
      animate="show"
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">Image</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">Title</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6 sm:py-3">Category</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6 sm:py-3">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {images.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500 sm:px-6">
                  No gallery images yet.{" "}
                  <Link href={`${GALLERY_ROUTE}/new`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Add your first image
                  </Link>
                </td>
              </tr>
            ) : (
              images.map((image) => (
                <motion.tr key={image.id} variants={rowVariants} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                    <img src={image.imageUrl} alt={image.title} className="h-12 w-12 rounded-lg object-cover" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 sm:px-6">{image.title}</td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-gray-700 sm:table-cell sm:px-6">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{image.category}</span>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-sm sm:table-cell sm:px-6">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${image.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {image.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm sm:px-6">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`${GALLERY_ROUTE}/${image.id}/edit`} className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100">Edit</Link>
                      <button onClick={() => handleDelete(image.id)} className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">Delete</button>
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
