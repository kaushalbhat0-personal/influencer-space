import { notFound } from "next/navigation";
import { GalleryService } from "@/services/gallery.service";
import { GalleryForm } from "../../_components/gallery-form";
import { getTenantContext } from "@/lib/tenant";

export default async function EditGalleryPage({ params }: { params: { id: string } }) {
  const tenant = await getTenantContext();
  if (!tenant) notFound();

  let image;
  try {
    image = await GalleryService.findById(params.id, tenant.id);
  } catch {
    notFound();
  }
  if (!image) notFound();

  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-display">Edit Hall of Fame Item</h1>
      <div className="max-w-2xl">
        <GalleryForm mode="edit" image={image} />
      </div>
    </div>
  );
}
