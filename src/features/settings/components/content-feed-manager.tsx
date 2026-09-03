"use client";

import { useState, useTransition } from "react";
import {
  togglePinItem,
  toggleHideItem,
  deleteFeedItem,
} from "@/actions/content-feed.actions";
import { Pin, EyeOff, Eye, Trash2, Camera, Play, Video } from "lucide-react";

type FeedItem = {
  id: string;
  platform: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  permalink: string | null;
  pinned: boolean;
  hidden: boolean;
  externalId: string | null;
  order: number;
  syncedAt: string;
  createdAt: string;
};

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Camera,
  youtube: Play,
  twitch: Video,
};

const platformColors: Record<string, string> = {
  instagram: "text-pink-400",
  youtube: "text-red-400",
  twitch: "text-purple-400",
};

function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export function ContentFeedManager({
  tenantId,
  initialItems,
}: {
  tenantId: string;
  initialItems: FeedItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleTogglePin(id: string) {
    startTransition(async () => {
      const result = await togglePinItem(id, tenantId);
      if (result.success) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, pinned: !item.pinned } : item,
          ),
        );
        showToast("success", "Pin status updated");
      } else {
        showToast("error", result.error ?? "Failed to update");
      }
    });
  }

  async function handleToggleHide(id: string) {
    startTransition(async () => {
      const result = await toggleHideItem(id, tenantId);
      if (result.success) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, hidden: !item.hidden } : item,
          ),
        );
        showToast("success", "Visibility updated");
      } else {
        showToast("error", result.error ?? "Failed to update");
      }
    });
  }

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setConfirmDelete(id);
  }

  async function confirmHandleDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    startTransition(async () => {
      const result = await deleteFeedItem(id, tenantId);
      if (result.success) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        showToast("success", "Item deleted");
      } else {
        showToast("error", result.error ?? "Failed to delete");
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-16">
        <Camera className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">No synced content yet.</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Content will appear here once the social sync cron job runs.
        </p>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-500/90 text-black"
              : "bg-red-500/90 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = platformIcons[item.platform] ?? Camera;
          const color = platformColors[item.platform] ?? "text-zinc-400";

          return (
            <div
              key={item.id}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                item.hidden
                  ? "border-[var(--border-subtle)] bg-[var(--surface-hover)] opacity-60"
                  : "border-[var(--border)] bg-[var(--surface-card)]"
              }`}
            >
              {/* Thumbnail */}
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--surface-hover)]">
                {(item.thumbnailUrl || (item.mediaType === "image" && item.url)) ? (
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Icon className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {item.platform}
                  </span>
                  {item.pinned && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                      PINNED
                    </span>
                  )}
                  {item.hidden && (
                    <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                      HIDDEN
                    </span>
                  )}
                </div>
                {item.caption && (
                  <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">
                    {item.caption}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Synced {formatDate(item.syncedAt)}
                  {item.externalId && ` · ${item.externalId}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTogglePin(item.id)}
                  disabled={pending}
                  className={`rounded-lg p-2 transition-all ${
                    item.pinned
                      ? "text-amber-400 hover:bg-amber-500/10"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
                  }`}
                  title={item.pinned ? "Unpin" : "Pin to top"}
                >
                  <Pin className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleHide(item.id)}
                  disabled={pending}
                  className={`rounded-lg p-2 transition-all ${
                    item.hidden
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
                  }`}
                  title={item.hidden ? "Show" : "Hide"}
                >
                  {item.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={pending}
                  className="rounded-lg p-2 text-[var(--text-muted)] transition-all hover:bg-red-500/10 hover:text-red-400"
                  title="Delete"
                  aria-label="Delete content item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
        {items.length} item{items.length !== 1 && "s"} ·{" "}
        {items.filter((i) => i.pinned).length} pinned ·{" "}
        {items.filter((i) => i.hidden).length} hidden
      </p>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Delete content item">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-[var(--surface-card)] rounded-xl border border-[var(--border)] p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Delete this content item?</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">This cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]" disabled={pending}>
                Cancel
              </button>
              <button onClick={confirmHandleDelete} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50" disabled={pending}>
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
