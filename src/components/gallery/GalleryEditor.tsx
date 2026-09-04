"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { GalleryItemData } from "@/lib/gallery/types";
import { MediaField } from "@/components/shared/MediaField";

interface GalleryEditorProps {
  item: GalleryItemData | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving?: boolean;
}

function isVideoUrl(url: string | null | undefined): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url ?? "");
}

export function GalleryEditor({ item, open, onClose, onSave, saving }: GalleryEditorProps) {
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [status, setStatus] = useState("PUBLISHED");
  const [isFeatured, setIsFeatured] = useState(false);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setCaption(item.caption ?? "");
      setAltText(item.altText ?? "");
      setStatus(item.status || "PUBLISHED");
      setIsFeatured(item.isFeatured);
      setCategory(item.category ?? "");
      setTags(item.tags ?? "");
      setUrl(item.url ?? null);
      setError("");
    } else {
      setCaption(""); setAltText(""); setStatus("PUBLISHED");
      setIsFeatured(false); setCategory(""); setTags(""); setUrl(null); setError("");
    }
  }, [item]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setError("");
    await onSave({
      id: item.id,
      url: url ?? item.url,
      isVideo: isVideoUrl(url),
      caption: caption.trim(),
      altText: altText.trim(),
      status,
      isFeatured,
      category: category.trim(),
      tags: tags.trim(),
    });
  };

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
            role="dialog" aria-modal="true" aria-label="Edit Media"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 px-6 py-4 backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white">Edit Media</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Close editor">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Media */}
              <MediaField
                label="Media"
                value={{ url }}
                folder="gallery"
                accept="image/*,video/*"
                entityType="gallery"
                entityId={item?.id}
                onChange={(v) => setUrl(v?.url ?? null)}
                onError={(e) => setError(e)}
              />

              {/* Preview */}
              {url && (
                <div className="aspect-video rounded-lg overflow-hidden bg-zinc-800">
                  {isVideoUrl(url) ? (
                    <video src={url} className="h-full w-full object-cover" controls />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={altText || caption || "Preview"} className="h-full w-full object-cover" />
                  )}
                </div>
              )}

              {/* Caption */}
              <fieldset>
                <legend className="text-sm font-semibold text-white mb-3">Details</legend>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="gallery-caption" className="block text-xs font-medium text-zinc-400 mb-1.5">Caption</label>
                    <input id="gallery-caption" value={caption} onChange={(e) => setCaption(e.target.value)}
                      className="admin-input w-full" disabled={saving} placeholder="A brief description..." />
                  </div>
                  <div>
                    <label htmlFor="gallery-alt" className="block text-xs font-medium text-zinc-400 mb-1.5">Alt Text (SEO)</label>
                    <input id="gallery-alt" value={altText} onChange={(e) => setAltText(e.target.value)}
                      className="admin-input w-full" disabled={saving} placeholder="Describe the image for screen readers..." />
                    <p className="mt-1 text-[11px] text-zinc-600">Helps with accessibility and search engine rankings.</p>
                  </div>
                </div>
              </fieldset>

              {/* Status & Featured */}
              <fieldset>
                <legend className="text-sm font-semibold text-white mb-3">Visibility</legend>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="gallery-status" className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
                    <select id="gallery-status" value={status} onChange={(e) => setStatus(e.target.value)}
                      className="admin-input w-full sm:w-48" disabled={saving}>
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/30" />
                    <span className="text-xs text-zinc-400">Featured media (shown first on storefront)</span>
                  </label>
                </div>
              </fieldset>

              {/* Categorization */}
              <fieldset>
                <legend className="text-sm font-semibold text-white mb-3">Categorization</legend>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="gallery-category" className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
                    <input id="gallery-category" value={category} onChange={(e) => setCategory(e.target.value)}
                      className="admin-input w-full" disabled={saving} placeholder="e.g. Events, Products, Lifestyle" />
                  </div>
                  <div>
                    <label htmlFor="gallery-tags" className="block text-xs font-medium text-zinc-400 mb-1.5">Tags</label>
                    <input id="gallery-tags" value={tags} onChange={(e) => setTags(e.target.value)}
                      className="admin-input w-full" disabled={saving} placeholder="Comma-separated: launch, event, behind-the-scenes" />
                  </div>
                </div>
              </fieldset>

              {error && <div className="rounded-lg bg-red-500/10 p-3" role="alert"><p className="text-sm text-red-400">{error}</p></div>}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onClose} className="admin-btn-outline px-4 py-2 text-xs" disabled={saving}>Cancel</button>
                <button type="submit" disabled={saving} className="admin-btn-cyan px-6 py-2 text-xs">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
