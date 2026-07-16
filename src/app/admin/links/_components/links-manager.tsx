"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLink,
  toggleLinkStatus,
  deleteLink,
  updateLinkOrder,
} from "@/actions/link.actions";
import type { LinkData } from "@/actions/link.actions";

export function LinksManager({
  tenantId,
  initialLinks,
}: {
  tenantId: string;
  initialLinks: LinkData[];
}) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setError("");
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("url", url.trim());

    startTransition(async () => {
      const result = await createLink(tenantId, formData);
      if (result.success && result.data) {
        setLinks((prev) => [result.data!, ...prev]);
        setTitle("");
        setUrl("");
      } else {
        setError(result.error || "Failed to create link");
      }
    });
  }

  async function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      const result = await toggleLinkStatus(id, tenantId, !currentActive);
      if (result.success) {
        setLinks((prev) =>
          prev.map((l) =>
            l.id === id ? { ...l, isActive: !currentActive } : l,
          ),
        );
      } else {
        alert(result.error || "Failed to toggle link");
      }
    });
  }

  async function handleDelete(id: string, title: string) {
    if (
      !window.confirm(`Delete "${title}"? This cannot be undone.`)
    )
      return;

    startTransition(async () => {
      const result = await deleteLink(id, tenantId);
      if (result.success) {
        setLinks((prev) => prev.filter((l) => l.id !== id));
        router.refresh();
      } else {
        alert(result.error || "Failed to delete link");
      }
    });
  }

  function moveLink(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= links.length) return;

    const reordered = [...links];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    const updates = reordered.map((l, i) => ({ id: l.id, order: i }));
    setLinks(reordered);

    startTransition(async () => {
      const result = await updateLinkOrder(tenantId, updates);
      if (!result.success) {
        setLinks(links);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ─── Add Link Form ─── */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">
          Add New Link
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Link title (e.g., My Shop)"
            className="admin-input flex-1"
            disabled={pending}
            required
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/ref"
            className="admin-input flex-1"
            disabled={pending}
            required
          />
          <button
            type="submit"
            disabled={pending || !title.trim() || !url.trim()}
            className="admin-btn-cyan shrink-0 px-5 py-2.5"
          >
            {pending ? "Adding..." : "Add Link"}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>

      {/* ─── Links List ─── */}
      {links.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/5 p-10 text-center text-sm text-zinc-600">
          No links yet. Add your first affiliate link above.
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link, index) => (
            <div
              key={link.id}
              className="flex items-center gap-4 rounded-xl border border-white/5 bg-zinc-900/50 px-5 py-4 backdrop-blur-sm transition-all hover:border-white/10"
            >
              {/* ─── Content ─── */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {link.title}
                </p>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                  <span className="truncate">{link.url}</span>
                  <span className="shrink-0">
                    🖱️ {link.clicks} clicks
                  </span>
                </div>
              </div>

              {/* ─── Move ─── */}
              <div className="flex shrink-0 flex-col gap-px">
                <button
                  onClick={() => moveLink(index, -1)}
                  disabled={pending || index === 0}
                  className="rounded-t-lg p-1 text-zinc-600 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-20"
                  title="Move up"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveLink(index, 1)}
                  disabled={pending || index === links.length - 1}
                  className="rounded-b-lg p-1 text-zinc-600 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-20"
                  title="Move down"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* ─── Toggle ─── */}
              <button
                onClick={() => handleToggle(link.id, link.isActive)}
                disabled={pending}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  link.isActive
                    ? "bg-s8ul-cyan"
                    : "bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-black transition-transform ${
                    link.isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>

              {/* ─── Delete ─── */}
              <button
                onClick={() => handleDelete(link.id, link.title)}
                disabled={pending}
                className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="Delete link"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
