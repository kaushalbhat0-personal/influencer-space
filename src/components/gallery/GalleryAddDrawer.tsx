"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { MediaFieldMulti } from "@/components/shared/MediaFieldMulti";
import { createGalleryItem } from "@/actions/gallery.actions";
import type { MediaValue } from "@/components/shared/MediaField";

interface GalleryAddDrawerProps {
  tenantId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

export function GalleryAddDrawer({ tenantId, open, onClose, onAdded }: GalleryAddDrawerProps) {
  const [media, setMedia] = useState<MediaValue[]>([]);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState("PUBLISHED");
  const [isFeatured, setIsFeatured] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setMedia([]);
    setCaption("");
    setStatus("PUBLISHED");
    setIsFeatured(false);
    setError("");
  }

  async function handleAdd() {
    if (media.length === 0) {
      setError("Add at least one image or video.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      for (const m of media) {
        if (!m.url) continue;
        const result = await createGalleryItem(tenantId, {
          url: m.url,
          caption: caption.trim(),
          altText: caption.trim(),
          isVideo: isVideoUrl(m.url),
          status,
          isFeatured,
        });
        if (!result.success) {
          setError(result.error ?? "Failed to add media");
          break;
        }
      }
      reset();
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl"
            role="dialog" aria-modal="true" aria-label="Add Media"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 px-6 py-4 backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white">Add Media</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <MediaFieldMulti
                label="Images & Videos"
                value={media}
                folder="gallery"
                accept="image/*,video/*"
                onChange={setMedia}
                onError={(e) => setError(e)}
                max={20}
              />

              <div>
                <label htmlFor="gallery-add-caption" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Caption <span className="text-zinc-600">(applied to all)</span>
                </label>
                <input
                  id="gallery-add-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="admin-input w-full"
                  disabled={saving}
                  placeholder="A brief description..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label htmlFor="gallery-add-status" className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
                  <select
                    id="gallery-add-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="admin-input w-40"
                    disabled={saving}
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/30"
                    disabled={saving}
                  />
                  <span className="text-xs text-zinc-400">Featured</span>
                </label>
              </div>

              {error && <div className="rounded-lg bg-red-500/10 p-3" role="alert"><p className="text-sm text-red-400">{error}</p></div>}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onClose} className="admin-btn-outline px-4 py-2 text-xs" disabled={saving}>Cancel</button>
                <button onClick={handleAdd} disabled={saving} className="admin-btn-cyan px-6 py-2 text-xs">
                  {saving ? "Adding..." : "Add to Gallery"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
