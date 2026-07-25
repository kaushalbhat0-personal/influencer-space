"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";
import type { GalleryItemData } from "@/lib/gallery/types";

interface LightboxProps {
  items: GalleryItemData[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  allowDownload?: boolean;
}

export function Lightbox({ items, currentIndex, open, onClose, onNavigate, allowDownload = false }: LightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const item = items[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const goNext = useCallback(() => { if (hasNext) { onNavigate(currentIndex + 1); setZoomed(false); } }, [hasNext, currentIndex, onNavigate]);
  const goPrev = useCallback(() => { if (hasPrev) { onNavigate(currentIndex - 1); setZoomed(false); } }, [hasPrev, currentIndex, onNavigate]);

  // Keyboard navigation + focus trap
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "Tab") {
        const focusable = [closeRef.current, prevRef.current, nextRef.current].filter(Boolean) as HTMLElement[];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, goNext, goPrev]);

  // Focus management on close
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { if (diff > 0) goNext(); else goPrev(); }
  }, [goNext, goPrev]);

  if (!item) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
          role="dialog" aria-modal="true" aria-label={`Image ${currentIndex + 1} of ${items.length}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 z-10">
            <span className="text-sm text-zinc-400 tabular-nums" aria-live="polite">
              {currentIndex + 1} / {items.length}
            </span>
            <div className="flex items-center gap-2">
              {!item.isVideo && (
                <>
                  <button onClick={() => setZoomed(!zoomed)}
                    className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label={zoomed ? "Zoom out" : "Zoom in"}
                  >
                    {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
                  </button>
                  {allowDownload && (
                    <a href={item.url} download
                      className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Download image"
                    >
                      <Download className="h-5 w-5" />
                    </a>
                  )}
                </>
              )}
              <button ref={closeRef} onClick={onClose} autoFocus
                className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close lightbox"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden px-4 pb-4">
            {hasPrev && (
              <button ref={prevRef} onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {hasNext && (
              <button ref={nextRef} onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            <div
              className={`transition-transform duration-200 ${zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"}`}
              onClick={() => !item.isVideo && setZoomed(!zoomed)}
            >
              {item.isVideo ? (
                <video src={item.url} className="max-h-[80vh] max-w-full rounded-lg" controls autoPlay
                  aria-label={item.caption || "Video content"} />
              ) : (
                <img
                  src={item.url}
                  alt={item.altText || item.caption || `Gallery image ${currentIndex + 1}`}
                  className="max-h-[80vh] max-w-full rounded-lg object-contain"
                  width={item.width ?? undefined}
                  height={item.height ?? undefined}
                />
              )}
            </div>
          </div>

          {/* Caption */}
          {item.caption && (
            <div className="px-6 py-4 text-center border-t border-white/5" aria-live="polite">
              <p className="text-sm text-zinc-300">{item.caption}</p>
              {item.altText && <p className="text-xs text-zinc-600 mt-1">{item.altText}</p>}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
