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
  syncedAt: Date;
  createdAt: Date;
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

function formatDate(d: Date) {
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this content item?")) return;

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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16">
        <Camera className="mb-3 h-10 w-10 text-zinc-600" />
        <p className="text-sm text-zinc-500">No synced content yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
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
                  ? "border-white/5 bg-zinc-900/30 opacity-50"
                  : "border-white/10 bg-zinc-900"
              }`}
            >
              {/* Thumbnail */}
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                {(item.thumbnailUrl || (item.mediaType === "image" && item.url)) ? (
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Icon className="h-5 w-5 text-zinc-600" />
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
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
                  <p className="mt-0.5 truncate text-sm text-zinc-300">
                    {item.caption}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-zinc-600">
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
                      : "text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
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
                      : "text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
                  }`}
                  title={item.hidden ? "Show" : "Hide"}
                >
                  {item.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={pending}
                  className="rounded-lg p-2 text-zinc-600 transition-all hover:bg-red-500/10 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-zinc-600">
        {items.length} item{items.length !== 1 && "s"} ·{" "}
        {items.filter((i) => i.pinned).length} pinned ·{" "}
        {items.filter((i) => i.hidden).length} hidden
      </p>
    </div>
  );
}
