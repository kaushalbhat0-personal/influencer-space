"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createGalleryItem,
  removeGalleryItem,
  updateGalleryOrder,
} from "@/actions/gallery.actions";
import type { GalleryItemData } from "@/actions/gallery.actions";
import { ImageUploader } from "@/components/ui/image-uploader";

function getYouTubeEmbed(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
  );
  return match
    ? `https://www.youtube.com/embed/${match[1]}`
    : null;
}

function MediaThumbnail({ item }: { item: GalleryItemData }) {
  if (!item.isVideo) {
    return (
      <img
        src={item.url}
        alt={item.caption ?? ""}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  const embed = getYouTubeEmbed(item.url);
  if (embed) {
    return (
      <iframe
        src={embed}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={item.caption ?? ""}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-800">
      <svg className="h-10 w-10 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  );
}

export function GalleryManager({
  tenantId,
  initialItems,
}: {
  tenantId: string;
  initialItems: GalleryItemData[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [videoSource, setVideoSource] = useState<"upload" | "youtube">("upload");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setUrl("");
    setCaption("");
    setIsVideo(false);
    setVideoSource("upload");
    setError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    startTransition(async () => {
      const result = await createGalleryItem(tenantId, {
        url: url.trim(),
        caption: caption.trim() || undefined,
        isVideo,
      });
      if (result.success && result.data) {
        setItems((prev) => [...prev, result.data!]);
        showToast("success", "Media added");
        resetForm();
      } else {
        setError(result.error || "Failed to add media");
      }
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    const updates = reordered.map((item, i) => ({ id: item.id, order: i }));
    setItems(reordered);

    startTransition(async () => {
      const result = await updateGalleryOrder(tenantId, updates);
      if (!result.success) {
        setItems(items);
      }
    });
  }

  async function handleDelete(id: string, caption: string) {
    if (!window.confirm(`Delete "${caption || "this item"}"? This cannot be undone.`)) return;

    setItems((prev) => prev.filter((item) => item.id !== id));

    startTransition(async () => {
      const result = await removeGalleryItem(id, tenantId);
      if (result.success) {
        showToast("success", "Item deleted");
        router.refresh();
      } else {
        setItems(items);
        showToast("error", result.error || "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-emerald-500/90 text-black"
              : "bg-red-500/90 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Add Form ── */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Add New Media</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isVideo}
                onChange={(e) => {
                  setIsVideo(e.target.checked);
                  setUrl("");
                }}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan/50"
              />
              <span className="text-sm text-zinc-400">Video</span>
            </label>
          </div>
          {isVideo && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="videoSource"
                  checked={videoSource === "upload"}
                  onChange={() => { setVideoSource("upload"); setUrl(""); }}
                  className="h-4 w-4 border-zinc-600 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan/50"
                />
                <span className="text-sm text-zinc-400">Upload Video File</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="videoSource"
                  checked={videoSource === "youtube"}
                  onChange={() => { setVideoSource("youtube"); setUrl(""); }}
                  className="h-4 w-4 border-zinc-600 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan/50"
                />
                <span className="text-sm text-zinc-400">Paste YouTube URL</span>
              </label>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            {isVideo && videoSource === "youtube" ? (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="YouTube URL"
                className="admin-input flex-1"
                disabled={pending || isUploading}
                required
              />
            ) : (
              <ImageUploader
                onUploadSuccess={(uploadedUrl) => setUrl(uploadedUrl)}
                isUploading={isUploading}
                setIsUploading={setIsUploading}
                accept={isVideo ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"}
              />
            )}
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="admin-input flex-1"
              disabled={pending || isUploading}
            />
            <button
              type="submit"
              disabled={pending || isUploading || !url.trim()}
              className="admin-btn-cyan shrink-0 px-5 py-2.5"
            >
              {pending ? "Adding..." : "Add Media"}
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* ── Grid ── */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/5 p-10 text-center text-sm text-zinc-600">
          No media yet. Add your first item above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-white/10"
            >
              {/* ── Media ── */}
              <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-800">
                <MediaThumbnail item={item} />
              </div>

              {/* ── Caption ── */}
              {item.caption && (
                <div className="px-4 pt-3">
                  <p className="line-clamp-1 text-sm font-medium text-white">
                    {item.caption}
                  </p>
                </div>
              )}

              {/* ── Controls ── */}
              <div className="flex items-center justify-between px-4 pb-3 pt-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={pending || index === 0}
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-20"
                    title="Move up"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={pending || index === items.length - 1}
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-20"
                    title="Move down"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {item.isVideo && (
                    <span className="ml-2 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">
                      VIDEO
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(item.id, item.caption ?? "")}
                  disabled={pending}
                  className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Delete item"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
