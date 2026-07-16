import { GalleryForm } from "../_components/gallery-form";

export default function NewGalleryPage() {
  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-display">Add New Hall of Fame Item</h1>
      <div className="max-w-2xl">
        <GalleryForm mode="create" />
      </div>
    </div>
  );
}
