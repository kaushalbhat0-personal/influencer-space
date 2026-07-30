import { MediaLibrary } from "./_components/media-library";

export const dynamic = "force-dynamic";

export default function MediaPage() {
  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Media Library</h1>
        <p className="mt-1 text-sm text-gray-400">Browse, search, and manage your uploaded assets.</p>
      </div>
      <MediaLibrary />
    </div>
  );
}
