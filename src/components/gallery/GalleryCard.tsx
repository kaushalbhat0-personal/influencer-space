"use client";

import { cn } from "@/lib/utils";
import { Eye, EyeOff, Star, Archive, Trash2, Edit3, Check, Play, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusChip } from "@/components/shared/StatusChip";
import type { GalleryItemData } from "@/lib/gallery/types";

export function GalleryCardEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16">
      <ImageIcon className="mb-3 h-12 w-12 text-zinc-700" />
      <p className="text-sm font-medium text-zinc-500">No media yet</p>
      <p className="mt-1 text-xs text-zinc-600">Upload images and videos to build your gallery.</p>
      {onCreate && <button onClick={onCreate} className="admin-btn-cyan mt-4 px-4 py-2 text-xs">Add Media</button>}
    </div>
  );
}

export function GalleryCardError({ message = "Failed to load gallery" }: { message?: string }) {
  return (
    <div className="col-span-full rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center" role="alert">
      <p className="text-sm font-semibold text-red-400">{message}</p>
    </div>
  );
}

interface GalleryCardProps {
  item: GalleryItemData;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onEdit?: (item: GalleryItemData) => void;
  onPreview?: (item: GalleryItemData) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string, caption: string) => void;
  onToggleFeatured?: (id: string, featured: boolean) => void;
  onMoveLeft?: (item: GalleryItemData) => void;
  onMoveRight?: (item: GalleryItemData) => void;
  loading?: boolean;
}

export function GalleryCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden" role="status" aria-label="Loading gallery item">
      <div className="aspect-square bg-zinc-800 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function resolveStatus(item: GalleryItemData) {
  if (item.archivedAt || item.status === "ARCHIVED") return "ARCHIVED";
  if (item.status === "PUBLISHED") return "PUBLISHED";
  return "DRAFT";
}

export function GalleryCard({
  item, selected, onSelect, onEdit, onPreview,
  onPublish, onUnpublish, onArchive, onRestore, onDelete, onToggleFeatured,
  onMoveLeft, onMoveRight,
  loading,
}: GalleryCardProps) {
  const status = resolveStatus(item);
  const isArchived = status === "ARCHIVED";

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-zinc-900/50 backdrop-blur-sm transition-all overflow-hidden cursor-pointer",
        selected ? "border-s8ul-cyan/50 ring-1 ring-s8ul-cyan/20" : "border-white/5 hover:border-white/10",
      )}
      onClick={() => onPreview?.(item)}
      role="button" tabIndex={0} aria-label={`View ${item.caption || "gallery item"}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPreview?.(item); } }}
    >
      {loading && (
        <div className="absolute inset-0 z-10 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-s8ul-cyan border-t-transparent animate-spin" />
        </div>
      )}

      {onSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(item.id, !selected); }}
          className={cn(
            "absolute top-2 left-2 z-20 w-5 h-5 rounded border transition-colors flex items-center justify-center",
            selected ? "bg-s8ul-cyan border-s8ul-cyan" : "bg-zinc-800/80 border-zinc-600 hover:border-zinc-400",
          )}
          aria-label={selected ? "Deselect" : "Select"}
        >
          {selected && <Check className="h-3 w-3 text-black" />}
        </button>
      )}

      <div className="aspect-square w-full overflow-hidden bg-zinc-800 relative">
        {item.isVideo ? (
          <div className="relative h-full w-full flex items-center justify-center bg-zinc-900">
            <Play className="h-10 w-10 text-zinc-600" />
            <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-400">
              VIDEO
            </span>
          </div>
        ) : (
          <img
            src={item.url}
            alt={item.altText || item.caption || "Gallery image"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            width={item.width ?? undefined}
            height={item.height ?? undefined}
          />
        )}

        {item.isFeatured && (
          <span className="absolute top-2 right-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-sm flex items-center gap-1">
            <Star className="h-3 w-3" />
          </span>
        )}
      </div>

      <div className="p-3">
        <StatusChip status={status} className="mb-1" />
        <p className="truncate text-sm font-medium text-white">{item.caption || "Untitled"}</p>
        {item.width && item.height && (
          <p className="text-[11px] text-zinc-600 mt-0.5">{item.width}×{item.height}</p>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1">
            {onToggleFeatured && (
              <button onClick={(e) => { e.stopPropagation(); onToggleFeatured(item.id, !item.isFeatured); }}
                className={`rounded-lg p-1 transition-colors ${item.isFeatured ? "text-amber-400 hover:bg-amber-500/10" : "text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10"}`}
                title={item.isFeatured ? "Unfeature" : "Feature"} aria-label={item.isFeatured ? "Unfeature" : "Feature"}
              >
                <Star className={`h-3 w-3 ${item.isFeatured ? "fill-amber-400" : ""}`} />
              </button>
            )}
            {status === "DRAFT" && onPublish && (
              <button onClick={(e) => { e.stopPropagation(); onPublish(item.id); }}
                className="rounded-lg p-1 text-zinc-600 hover:text-green-400 hover:bg-green-500/10"
                title="Publish" aria-label="Publish"
              >
                <Eye className="h-3 w-3" />
              </button>
            )}
            {status === "PUBLISHED" && onUnpublish && (
              <button onClick={(e) => { e.stopPropagation(); onUnpublish(item.id); }}
                className="rounded-lg p-1 text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10"
                title="Unpublish" aria-label="Unpublish"
              >
                <EyeOff className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onMoveLeft && (
              <button onClick={(e) => { e.stopPropagation(); onMoveLeft(item); }}
                className="rounded-lg p-1 text-zinc-600 hover:text-s8ul-cyan hover:bg-s8ul-cyan/10"
                title="Move left" aria-label="Move left"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
            )}
            {onMoveRight && (
              <button onClick={(e) => { e.stopPropagation(); onMoveRight(item); }}
                className="rounded-lg p-1 text-zinc-600 hover:text-s8ul-cyan hover:bg-s8ul-cyan/10"
                title="Move right" aria-label="Move right"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            {onEdit && !isArchived && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                className="rounded-lg p-1 text-zinc-600 hover:text-s8ul-cyan hover:bg-s8ul-cyan/10"
                title="Edit" aria-label="Edit"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            )}
            {!isArchived && onArchive ? (
              <button onClick={(e) => { e.stopPropagation(); onArchive(item.id); }}
                className="rounded-lg p-1 text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10"
                title="Archive" aria-label="Archive"
              >
                <Archive className="h-3 w-3" />
              </button>
            ) : isArchived && onRestore ? (
              <button onClick={(e) => { e.stopPropagation(); onRestore(item.id); }}
                className="rounded-lg p-1 text-zinc-600 hover:text-green-400 hover:bg-green-500/10"
                title="Restore" aria-label="Restore"
              >
                <Archive className="h-3 w-3" />
              </button>
            ) : null}
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(item.id, item.caption ?? ""); }}
                className="rounded-lg p-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                title="Delete" aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
