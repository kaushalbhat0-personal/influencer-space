import { GalleryForm } from "../_components/gallery-form";

export default function NewGalleryPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Add New Gallery Image</h1>
      <div className="max-w-lg">
        <GalleryForm mode="create" />
      </div>
    </div>
  );
}
