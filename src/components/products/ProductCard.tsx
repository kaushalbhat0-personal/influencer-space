"use client";

import { cn } from "@/lib/utils";
import { Eye, EyeOff, Copy, Archive, Trash2, Edit3, GripVertical, Check } from "lucide-react";
import type { ProductData } from "@/lib/products/types";
import { StatusChip } from "@/components/shared/StatusChip";
import type { ProductStatus } from "@/lib/products/constants";

interface ProductCardProps {
  product: ProductData;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onEdit?: (product: ProductData) => void;
  onDuplicate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  loading?: boolean;
  dragHandle?: boolean;
}

function resolveStatus(product: ProductData): ProductStatus {
  if (product.status === "ARCHIVED" || !!product.archivedAt) return "ARCHIVED";
  if (product.status === "PUBLISHED") return "PUBLISHED";
  return "DRAFT";
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden" role="status" aria-label="Loading product">
      <div className="aspect-[16/9] bg-zinc-800 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
        <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
          <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function ProductCard({
  product, selected, onSelect, onEdit, onDuplicate,
  onArchive, onRestore, onDelete, onPublish, onUnpublish,
  loading, dragHandle,
}: ProductCardProps) {
  const status = resolveStatus(product);

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-zinc-900/50 backdrop-blur-sm transition-all overflow-hidden",
        selected ? "border-s8ul-cyan/50 ring-1 ring-s8ul-cyan/20" : "border-white/5 hover:border-white/10",
      )}
    >
      {loading && (
        <div className="absolute inset-0 z-10 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-s8ul-cyan border-t-transparent animate-spin" />
        </div>
      )}

      {onSelect && (
        <button
          onClick={() => onSelect(product.id, !selected)}
          className={cn(
            "absolute top-2 left-2 z-20 w-5 h-5 rounded border transition-colors flex items-center justify-center",
            selected ? "bg-s8ul-cyan border-s8ul-cyan" : "bg-zinc-800/80 border-zinc-600 hover:border-zinc-400",
          )}
          aria-label={selected ? `Deselect ${product.name}` : `Select ${product.name}`}
        >
          {selected && <Check className="h-3 w-3 text-black" />}
        </button>
      )}

      <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-800 relative">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-8 w-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}

        {product.isFeatured && (
          <span className="absolute top-2 right-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-sm">
            Featured
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <StatusChip status={status} className="mb-1" />
            <h3 className="truncate text-sm font-semibold text-white">{product.name}</h3>
            {product.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{product.description}</p>
            )}
          </div>
          <span className="shrink-0 font-display text-sm font-bold text-s8ul-cyan tabular-nums">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex items-center gap-1">
            {dragHandle && (
              <span className="cursor-grab rounded-lg p-1.5 text-zinc-600 hover:text-zinc-400">
                <GripVertical className="h-3.5 w-3.5" />
              </span>
            )}
            {status === "DRAFT" && onPublish && (
              <button onClick={() => onPublish(product.id)}
                className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-green-500/10 hover:text-green-400"
                title="Publish" aria-label={`Publish ${product.name}`}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
            {status === "PUBLISHED" && onUnpublish && (
              <button onClick={() => onUnpublish(product.id)}
                className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                title="Unpublish" aria-label={`Unpublish ${product.name}`}
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 relative">
            {onEdit && status !== "ARCHIVED" && (
              <button onClick={() => onEdit(product)}
                className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-s8ul-cyan/10 hover:text-s8ul-cyan"
                title="Edit product" aria-label={`Edit ${product.name}`}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            {onDuplicate && (
              <button onClick={() => onDuplicate(product.id)}
                className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-purple-500/10 hover:text-purple-400"
                title="Duplicate product" aria-label={`Duplicate ${product.name}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            {status !== "ARCHIVED" && onArchive ? (
              <button onClick={() => onArchive(product.id)}
                className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                title="Archive product" aria-label={`Archive ${product.name}`}
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            ) : status === "ARCHIVED" && onRestore ? (
              <button onClick={() => onRestore(product.id)}
                className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-green-500/10 hover:text-green-400"
                title="Restore product" aria-label={`Restore ${product.name}`}
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {onDelete && (
              <button onClick={() => onDelete(product.id, product.name)}
                className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="Delete product" aria-label={`Delete ${product.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductCardEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16">
      <svg className="mb-3 h-12 w-12 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p className="text-sm font-medium text-zinc-500">No products yet</p>
      <p className="mt-1 text-xs text-zinc-600">Add your first product to start selling.</p>
      {onCreate && (
        <button onClick={onCreate} className="admin-btn-cyan mt-4 px-4 py-2 text-xs">
          Add Product
        </button>
      )}
    </div>
  );
}

export function ProductCardError({ message = "Failed to load products" }: { message?: string }) {
  return (
    <div className="col-span-full rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center" role="alert">
      <p className="text-sm font-semibold text-red-400">{message}</p>
    </div>
  );
}
