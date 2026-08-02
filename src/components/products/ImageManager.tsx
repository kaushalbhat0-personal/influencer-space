"use client";

import { useRef, useState } from "react";
import { Upload, X, Library } from "lucide-react";
import { uploadFileWithProgress } from "@/lib/media/client-upload";
import { MediaPickerDialog } from "@/components/shared/MediaPickerDialog";

export interface ManagedImage {
  url: string;
  alt: string;
  order: number;
  assetId?: string | null;
}

interface ImageManagerProps {
  images: ManagedImage[];
  onChange: (images: ManagedImage[]) => void;
  tenantId: string;
  folder?: string;
  maxImages?: number;
  entityId?: string | null;
  entityType?: string;
}

export function ImageManager({
  images,
  onChange,
  tenantId: _tenantId,
  folder = "products",
  maxImages = 10,
  entityId,
  entityType = "product",
}: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index).map((img, i) => ({ ...img, order: i })));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((img, i) => ({ ...img, order: i })));
  };

  function append(assetId: string, url: string) {
    onChange([...images, { url, alt: "", order: images.length, assetId }]);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const result = await uploadFileWithProgress({
        file,
        folder,
        entityType,
        entityId: entityId ?? undefined,
      });
      if (result.success && result.assetId && result.url) {
        append(result.assetId, result.url);
      } else {
        setError(result.error ?? "Upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div
            key={i}
            className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt || `Image ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => handleMove(i, -1)}
                disabled={i === 0}
                className="rounded p-1 bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
                aria-label={`Move image ${i + 1} left`}
              >
                <span className="block h-4 w-4 flex items-center justify-center text-xs">◀</span>
              </button>
              <button
                type="button"
                onClick={() => handleMove(i, 1)}
                disabled={i === images.length - 1}
                className="rounded p-1 bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
                aria-label={`Move image ${i + 1} right`}
              >
                <span className="block h-4 w-4 flex items-center justify-center text-xs">▶</span>
              </button>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="rounded p-1 bg-red-500/20 text-red-400 hover:bg-red-500/40"
                aria-label={`Remove image ${i + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-300">
                Primary
              </span>
            )}
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-white/10 bg-zinc-900/50 text-zinc-600 transition-colors hover:border-white/20 hover:text-zinc-300 disabled:opacity-50"
            aria-label="Add image"
          >
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={uploading || images.length >= maxImages}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300 disabled:opacity-50"
        >
          <Library className="h-3.5 w-3.5" />
          Choose from Library
        </button>
        <p className="text-[11px] text-zinc-600">
          {images.length}/{maxImages} images · First image is primary
        </p>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}

      <MediaPickerDialog
        open={pickerOpen}
        accept="image/*"
        folder={folder}
        onClose={() => setPickerOpen(false)}
        onSelect={(media) => {
          if (images.length >= maxImages) return;
          append(media.assetId, media.url);
          setPickerOpen(false);
          setError(null);
        }}
      />
    </div>
  );
}
