import { notFound } from "next/navigation";
import { GalleryService } from "@/services/gallery.service";
import { GalleryForm } from "../../_components/gallery-form";

export default async function EditGalleryPage({
  params,
}: {
  params: { id: string };
}) {
  const image = await GalleryService.findById(params.id);
  if (!image) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Gallery Image</h1>
      <div className="max-w-lg">
        <GalleryForm mode="edit" image={image} />
      </div>
    </div>
  );
}
