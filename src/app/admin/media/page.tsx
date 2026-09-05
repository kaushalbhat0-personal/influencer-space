import { MediaLibrary } from "./_components/media-library";

export const dynamic = "force-dynamic";

export default function MediaPage() {
  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="platform-display">Media Library</h1>
        <p className="platform-body mt-1.5">Browse, search, and manage your uploaded assets.</p>
      </div>
      <MediaLibrary />
    </div>
  );
}
