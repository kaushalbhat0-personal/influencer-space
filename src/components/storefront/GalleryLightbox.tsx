"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryImage {
  url: string;
  caption?: string | null;
}

export function GalleryLightbox({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const current = images[index];

  const openAt = useCallback((i: number) => { setIndex(i); setOpen(true); }, []);
  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : images.length - 1)), [images.length]);
  const next = useCallback(() => setIndex((i) => (i < images.length - 1 ? i + 1 : 0)), [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, prev, next]);

  if (images.length === 0) return null;

  return (
    <>
      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => openAt(i)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 hover:border-white/20 transition-all"
            aria-label={img.caption ?? `Gallery image ${i + 1}`}
          >
            <img
              src={img.url}
              alt={img.caption ?? `Gallery image ${i + 1}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            {img.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white">{img.caption}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {open && current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button onClick={close} className="absolute top-4 right-4 rounded-full p-2 text-white/60 hover:text-white transition-colors" aria-label="Close">
            <X className="h-6 w-6" />
          </button>

          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 rounded-full p-2 text-white/60 hover:text-white transition-colors" aria-label="Previous image">
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 rounded-full p-2 text-white/60 hover:text-white transition-colors" aria-label="Next image">
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <img
            src={current.url}
            alt={current.caption ?? `Gallery image ${index + 1}`}
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {current.caption && (
            <p className="absolute bottom-4 text-sm text-white/70 text-center max-w-lg px-4">{current.caption}</p>
          )}

          <div className="absolute bottom-4 right-4 text-xs text-white/40">
            {index + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
