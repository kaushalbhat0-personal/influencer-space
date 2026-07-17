"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLink,
  toggleLinkStatus,
  deleteLink,
  updateLinkOrder,
  updateExistingLink,
} from "@/actions/link.actions";
import type { LinkData } from "@/actions/link.actions";
import { EditEntityDrawer } from "@/components/admin/EditEntityDrawer";

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
  const [editingLink, setEditingLink] = useState<LinkData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");

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

  async function handleDelete(id: string, linkTitle: string) {
    if (!window.confirm(`Delete "${linkTitle}"? This cannot be undone.`)) return;

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
      if (!result.success) setLinks(links);
    });
  }

  function openEdit(link: LinkData) {
    setEditTitle(link.title);
    setEditUrl(link.url);
    setError("");
    setEditingLink(link);
  }

  function closeEdit() {
    setEditingLink(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLink || !editTitle.trim() || !editUrl.trim()) return;

    setError("");
    const formData = new FormData();
    formData.set("id", editingLink.id);
    formData.set("title", editTitle.trim());
    formData.set("url", editUrl.trim());

    startTransition(async () => {
      const result = await updateExistingLink(tenantId, formData);
      if (result.success && result.data) {
        setLinks((prev) =>
          prev.map((l) => (l.id === editingLink.id ? result.data! : l)),
        );
        closeEdit();
      } else {
        setError(result.error || "Failed to update link");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ─── Add Link Form ─── */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">Add New Link</h2>
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
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{link.title}</p>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                  <span className="truncate">{link.url}</span>
                  <span className="shrink-0">&#x1F5B1;&#xFE0F; {link.clicks} clicks</span>
                </div>
              </div>

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

              <button
                onClick={() => handleToggle(link.id, link.isActive)}
                disabled={pending}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  link.isActive ? "bg-s8ul-cyan" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-black transition-transform ${
                    link.isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>

              <button
                onClick={() => openEdit(link)}
                disabled={pending}
                className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-s8ul-cyan/10 hover:text-s8ul-cyan"
                title="Edit link"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

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

      {/* ─── Edit Drawer ─── */}
      <EditEntityDrawer open={!!editingLink} onClose={closeEdit} title="Edit Link">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-400">Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="admin-input w-full"
              disabled={pending}
              required
            />
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-400">URL</label>
            <input
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              className="admin-input w-full"
              disabled={pending}
              placeholder="https://..."
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending || !editTitle.trim() || !editUrl.trim()}
            className="admin-btn-cyan w-full py-2.5"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </EditEntityDrawer>
    </div>
  );
}
