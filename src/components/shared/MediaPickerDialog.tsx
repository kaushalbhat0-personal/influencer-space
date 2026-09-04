"use client";

import { useState, useEffect, useCallback } from "react";
import { listAssets } from "@/actions/media-library.actions";
import { uploadFileWithProgress } from "@/lib/media/client-upload";

export interface PickedMedia {
  assetId: string;
  url: string;
}

interface LibraryAsset {
  id: string;
  publicUrl?: string | null;
  thumbnailUrl?: string | null;
  mimeType: string;
  originalFilename: string;
  referenceCount: number;
}

interface MediaPickerDialogProps {
  open: boolean;
  accept?: string;
  folder?: string;
  onClose: () => void;
  onSelect: (media: PickedMedia) => void;
}

export function MediaPickerDialog({
  open,
  accept = "image/*",
  folder = "general",
  onClose,
  onSelect,
}: MediaPickerDialogProps) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const acceptIsMixed = accept.includes("video") && accept.includes("image");
  const acceptIsVideoOnly = accept.includes("video") && !accept.includes("image");

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setLoadError(null);
    const result = await listAssets({
      search: search || undefined,
      mimeType: typeFilter === "all" ? undefined : typeFilter,
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 60,
    });
    if (result.success) {
      setAssets(result.assets as unknown as LibraryAsset[]);
    } else {
      setLoadError(result.error ?? "Failed to load media library");
    }
    setLoading(false);
  }, [open, search, typeFilter]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const result = await uploadFileWithProgress({ file, folder });
    if (result.success && result.assetId && result.url) {
      onSelect({ assetId: result.assetId, url: result.url });
      onClose();
    } else {
      setUploadError(result.error ?? "Upload failed");
    }
    setUploading(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-white/10 bg-zinc-950 shadow-[var(--shadow-overlay)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-sm font-semibold text-white">Media Library</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">
            &times;
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search media..."
            className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-focus)]"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-secondary)] outline-none"
          >
            <option value="all">All types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)]">
            <input
              type="file"
              accept={accept}
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? "Uploading..." : "Upload New"}
          </label>
        </div>

        {uploadError && (
          <p className="px-5 pt-2 text-xs text-red-400" role="alert">
            {uploadError}
          </p>
        )}
        {loadError && (
          <p className="px-5 pt-2 text-xs text-red-400" role="alert">
            {loadError}
          </p>
        )}

        <div className="grid flex-1 grid-cols-3 gap-3 overflow-y-auto p-5 sm:grid-cols-4">
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-zinc-800" />
          ))}
          {!loading &&
            assets
              .filter((a) => a.referenceCount >= 0)
              .map((asset) => {
                const isVideo = asset.mimeType?.startsWith("video/");
                const matchesAccept = acceptIsMixed
                  ? true
                  : acceptIsVideoOnly
                    ? isVideo
                    : !isVideo && asset.mimeType?.startsWith("image/");
                if (!matchesAccept) return null;
                return (
                  <button
                    key={asset.id}
                    onClick={() => onSelect({ assetId: asset.id, url: asset.publicUrl ?? "" })}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-zinc-900 transition-all hover:border-white/30"
                  >
                    {asset.publicUrl && !isVideo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.publicUrl}
                        alt={asset.originalFilename}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-zinc-800">
                        <span className="px-2 text-center text-[10px] text-[var(--text-muted)]">{isVideo ? "Video" : "No preview"}</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-4 text-left text-[9px] text-white/80">
                      {asset.originalFilename}
                    </div>
                  </button>
                );
              })}
          {!loading && assets.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <p className="text-sm text-[var(--text-muted)]">No media found.</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Upload a new asset above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
