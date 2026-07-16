"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createMilestone,
  removeMilestone,
} from "@/actions/milestone.actions";
import type { MilestoneData } from "@/actions/milestone.actions";
import { ImageUploader } from "@/components/ui/image-uploader";

export function MilestonesManager({
  tenantId,
  initialMilestones,
}: {
  tenantId: string;
  initialMilestones: MilestoneData[];
}) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(initialMilestones);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [year, setYear] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [stats, setStats] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setYear("");
    setTitle("");
    setDescription("");
    setImageUrl("");
    setStats("");
    setError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!year.trim() || !title.trim() || !description.trim()) return;

    setError("");
    const formData = new FormData();
    formData.set("year", year.trim());
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("imageUrl", imageUrl.trim());
    formData.set("stats", stats.trim());

    startTransition(async () => {
      const result = await createMilestone(tenantId, formData);
      if (result.success && result.data) {
        setMilestones((prev) => [result.data!, ...prev]);
        showToast("success", `Milestone "${result.data.title}" added`);
        resetForm();
      } else {
        setError(result.error || "Failed to create milestone");
      }
    });
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setMilestones((prev) => prev.filter((m) => m.id !== id));

    startTransition(async () => {
      const result = await removeMilestone(id, tenantId);
      if (result.success) {
        showToast("success", `"${name}" deleted`);
        router.refresh();
      } else {
        setMilestones((prev) => [...prev]);
        showToast("error", result.error || "Failed to delete milestone");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-emerald-500/90 text-black"
              : "bg-red-500/90 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Add Form ── */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">
          Add Milestone
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Year (e.g. 2026)"
              className="admin-input"
              disabled={pending}
              required
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="admin-input"
              disabled={pending}
              required
            />
            <input
              value={stats}
              onChange={(e) => setStats(e.target.value)}
              placeholder="Stats badge (optional)"
              className="admin-input"
              disabled={pending}
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="admin-input min-h-[60px] resize-none"
            disabled={pending}
            rows={2}
            required
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <ImageUploader
              onUploadSuccess={(uploadedUrl) => setImageUrl(uploadedUrl)}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              accept="image/jpeg,image/png,image/webp,image/gif"
              tenantId={tenantId}
              folder="milestones"
            />
            <button
              type="submit"
              disabled={pending || isUploading || !year.trim() || !title.trim() || !description.trim()}
              className="admin-btn-cyan shrink-0 px-6 py-2.5"
            >
              {pending ? "Adding..." : "Add Milestone"}
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* ── Milestones Grid ── */}
      {milestones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/5 p-10 text-center text-sm text-zinc-600">
          No milestones yet. Add your first milestone above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-white/10"
            >
              {/* ── Year Badge ── */}
              <div className="absolute left-3 top-3 z-10">
                <span className="inline-flex items-center rounded-md bg-s8ul-cyan/20 px-2.5 py-0.5 font-display text-xs font-bold text-s8ul-cyan ring-1 ring-inset ring-s8ul-cyan/30">
                  {milestone.year}
                </span>
              </div>

              {/* ── Image ── */}
              {milestone.imageUrl ? (
                <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-800">
                  <img
                    src={milestone.imageUrl}
                    alt={milestone.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-zinc-800/50">
                  <svg className="h-8 w-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}

              {/* ── Body ── */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {milestone.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                      {milestone.description}
                    </p>
                  </div>
                  {milestone.stats && (
                    <span className="shrink-0 rounded-md bg-amber-500/10 px-2 py-0.5 font-display text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/20">
                      {milestone.stats}
                    </span>
                  )}
                </div>

                {/* ── Delete ── */}
                <div className="mt-3 flex items-center justify-end border-t border-white/5 pt-3">
                  <button
                    onClick={() => handleDelete(milestone.id, milestone.title)}
                    disabled={pending}
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete milestone"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
