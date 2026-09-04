"use client";

import type { MetadataPreview } from "@/lib/seo";

export interface PreviewRenderer {
  type: string;
  label: string;
  render: (preview: MetadataPreview) => React.ReactNode;
}

export const PREVIEW_RENDERERS: PreviewRenderer[] = [
  {
    type: "browserTab",
    label: "Browser Tab",
    render: (preview: MetadataPreview) => (
      <div className="flex items-center gap-2 rounded-t-lg bg-zinc-800 px-3 py-1.5 border border-white/10 border-b-0">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
          <div className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
          <div className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
        </div>
        <div className="flex-1 truncate rounded bg-zinc-700 px-2 py-0.5 text-xs text-[var(--text-primary)]">
          {preview.browserTitle}
        </div>
      </div>
    ),
  },
  {
    type: "googleSERP",
    label: "Google SERP",
    render: (preview: MetadataPreview) => (
      <div className="rounded-lg border border-white/10 bg-white p-3">
        <p className="text-xs text-green-700 truncate">https://example.com</p>
        <p className="text-sm font-semibold text-blue-800 leading-tight truncate">
          {preview.googleTitle}
        </p>
        <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
          {preview.googleDescription}
        </p>
      </div>
    ),
  },
  {
    type: "facebook",
    label: "Facebook",
    render: (preview: MetadataPreview) => (
      <div className="overflow-hidden rounded-lg border border-white/10 bg-zinc-800/50 max-w-md" role="img" aria-label="Facebook share preview">
        <div className="aspect-[1.91/1] bg-zinc-700 flex items-center justify-center">
          {preview.ogImage ? (
            <img src={preview.ogImage} alt="" className="h-full w-full object-cover" aria-hidden="true" onError={(e) => { (e.currentTarget).style.display = "none"; }} />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">No image</span>
          )}
        </div>
        <div className="p-3">
          <p className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">example.com</p>
          <p className="text-sm font-semibold text-white leading-tight mt-0.5">{preview.ogTitle}</p>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5">{preview.ogDescription}</p>
        </div>
      </div>
    ),
  },
  {
    type: "linkedin",
    label: "LinkedIn",
    render: (preview: MetadataPreview) => (
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white max-w-md" role="img" aria-label="LinkedIn share preview">
        <div className="aspect-[1.91/1] bg-zinc-200 flex items-center justify-center">
          {preview.ogImage ? (
            <img src={preview.ogImage} alt="" className="h-full w-full object-cover" aria-hidden="true" onError={(e) => { (e.currentTarget).style.display = "none"; }} />
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">No image</span>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs text-[var(--text-muted)] line-clamp-2">{preview.ogDescription}</p>
          <p className="text-sm font-semibold text-zinc-800 leading-tight mt-1">{preview.ogTitle}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase mt-1">example.com</p>
        </div>
      </div>
    ),
  },
  {
    type: "xTwitter",
    label: "X (Twitter)",
    render: (preview: MetadataPreview) => (
      <div className="overflow-hidden rounded-lg border border-white/10 bg-black max-w-md" role="img" aria-label="Twitter card preview">
        <div className="aspect-[2/1] bg-zinc-800 flex items-center justify-center">
          {preview.twitterImage ? (
            <img src={preview.twitterImage} alt="" className="h-full w-full object-cover" aria-hidden="true" onError={(e) => { (e.currentTarget).style.display = "none"; }} />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">No image</span>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs text-[var(--text-muted)]">{preview.twitterTitle}</p>
          <p className="text-sm text-[var(--text-primary)] line-clamp-2 mt-0.5">{preview.twitterDescription}</p>
          <div className="flex items-center gap-1 mt-1">
            <div className="h-4 w-4 rounded-full bg-zinc-700" aria-hidden="true" />
            <p className="text-xs text-[var(--text-muted)]">example.com</p>
          </div>
        </div>
      </div>
    ),
  },
];

export function getPreviewRenderers(): PreviewRenderer[] {
  return PREVIEW_RENDERERS;
}


