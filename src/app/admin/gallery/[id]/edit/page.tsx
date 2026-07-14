import { notFound } from "next/navigation";
import { GalleryService } from "@/services/gallery.service";
import { GalleryForm } from "../../_components/gallery-form";

export default async function EditGalleryPage({ params }: { params: { id: string } }) {
  let image;
  try {
    image = await GalleryService.findById(params.id);
  } catch {
    notFound();
  }
  if (!image) notFound();

  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-gaming">Edit Gallery Image</h1>
      <div className="max-w-2xl">
        <GalleryForm mode="edit" image={image} />
      </div>
    </div>
  );
}
