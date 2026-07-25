"use client";

interface Props {
  slug: string;
  onSlugChange: (v: string) => void;
  seoTitle: string;
  onSeoTitleChange: (v: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (v: string) => void;
  disabled?: boolean;
}

export function ProductSEOSection({ slug, onSlugChange, seoTitle, onSeoTitleChange, seoDescription, onSeoDescriptionChange, disabled }: Props) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-white mb-3">Search Engine Optimization</legend>
      <div className="space-y-4">
        <div>
          <label htmlFor="product-slug" className="block text-xs font-medium text-zinc-400 mb-1.5">
            URL Slug
          </label>
          <input
            id="product-slug"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            className="admin-input w-full font-mono text-xs"
            disabled={disabled}
            placeholder="my-product-name"
          />
          <p className="mt-1 text-[11px] text-zinc-600">Leave empty to auto-generate from name.</p>
        </div>
        <div>
          <label htmlFor="product-seo-title" className="block text-xs font-medium text-zinc-400 mb-1.5">
            SEO Title
          </label>
          <input
            id="product-seo-title"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            className="admin-input w-full"
            disabled={disabled}
            placeholder="Buy My Product | CreatorStore"
            maxLength={200}
          />
        </div>
        <div>
          <label htmlFor="product-seo-desc" className="block text-xs font-medium text-zinc-400 mb-1.5">
            SEO Description
          </label>
          <textarea
            id="product-seo-desc"
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            className="admin-input w-full min-h-[60px] resize-none"
            disabled={disabled}
            rows={2}
            placeholder="A short description for search engines..."
            maxLength={500}
          />
        </div>
      </div>
    </fieldset>
  );
}
