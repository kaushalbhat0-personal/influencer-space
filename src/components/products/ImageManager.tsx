"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import type { ImageUploaderHandle } from "@/components/admin/ImageUploader";

export interface ManagedImage {
  url: string;
  alt: string;
  order: number;
}

interface ImageManagerProps {
  images: ManagedImage[];
  onChange: (images: ManagedImage[]) => void;
  tenantId: string;
  folder?: string;
  maxImages?: number;
}

export function ImageManager({
  images,
  onChange,
  tenantId,
  folder = "products",
  maxImages = 10,
}: ImageManagerProps) {
  const uploaderRef = useRef<ImageUploaderHandle>(null);

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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div
            key={i}
            className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-white/5"
          >
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
          <ImageUploader
            ref={uploaderRef}
            tenantId={tenantId}
            folder={folder}
          />
        )}
      </div>
      <p className="text-[11px] text-zinc-600">
        {images.length}/{maxImages} images · First image is primary
      </p>
    </div>
  );
}
