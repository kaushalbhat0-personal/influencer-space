"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HERO_SOCIAL_PLATFORMS, type HeroSocialLink } from "@/config/hero";
import { updateHeroSocialLinks } from "@/actions/settings.actions";

/**
 * IMPLEMENTATION-18A — the SINGLE social/streaming/contact link editor.
 *
 * Hero owns all social links (stored in hero_data.socialLinks). This editor is
 * used by BOTH the Hero settings form and the Links admin page, so there is
 * exactly one CRUD surface and one storage location. The Links module renders
 * whatever Hero publishes.
 */
export function SocialLinksEditor({
  tenantId,
  initialLinks,
}: {
  tenantId: string;
  initialLinks: HeroSocialLink[];
}) {
  const router = useRouter();
  const [links, setLinks] = useState<HeroSocialLink[]>(initialLinks);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(index: number, patch: Partial<HeroSocialLink>) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    setSaved(false);
  }

  function add() {
    setLinks((prev) => [...prev, { platform: "youtube", url: "", label: "" }]);
    setSaved(false);
  }

  function remove(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await updateHeroSocialLinks(tenantId, links);
      if (result.success) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error || "Failed to save links");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {links.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-zinc-600">
            No social links yet. Add your first link below.
          </p>
        )}
        {links.map((link, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-zinc-900/50 p-3 sm:flex-row sm:items-center">
            <select
              value={link.platform}
              onChange={(e) => update(index, { platform: e.target.value })}
              className="admin-input w-full sm:w-40"
              disabled={pending}
            >
              {HERO_SOCIAL_PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <input
              value={link.url}
              onChange={(e) => update(index, { url: e.target.value })}
              placeholder="https://..."
              className="admin-input flex-1"
              disabled={pending}
            />
            <input
              value={link.label ?? ""}
              onChange={(e) => update(index, { label: e.target.value })}
              placeholder="Label (optional)"
              className="admin-input w-full sm:w-40"
              disabled={pending}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={pending}
              className="shrink-0 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
        >
          + Add Link
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="admin-btn-cyan px-4 py-2 text-xs"
        >
          {pending ? "Saving..." : "Save Links"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
