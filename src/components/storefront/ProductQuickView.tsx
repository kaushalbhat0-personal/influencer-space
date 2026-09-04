"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CreatorImage } from "@/components/shared";
import { BuyNowButton } from "@/app/[domain]/_components/buy-now-button";
import { formatCurrency } from "@/lib/utils";
import { normalizeCommerceMode } from "@/config/commerce/commerce-mode";
import { buildWhatsAppMessage, buildWaMeLink } from "@/lib/commerce/whatsapp";

interface ProductQuickViewProps {
  product: Record<string, unknown>;
  previewMode?: boolean;
}

export function ProductQuickView({ product, previewMode }: ProductQuickViewProps) {
  const [open, setOpen] = useState(false);
  const name = String(product.name || "");
  const description = String(product.description || "");
  const price = typeof product.price === "number" ? formatCurrency(product.price) : "";
  const imageUrl = product.imageUrl ? String(product.imageUrl) : null;
  const isFeatured = Boolean(product.isFeatured);

  // Reuse same commerce logic as ProductsRenderer
  const mode = normalizeCommerceMode(product.commerceMode);
  const showOnline = mode === "ONLINE" || mode === "BOTH";
  const showWhatsApp = mode === "WHATSAPP" || mode === "BOTH";
  const waHref = (() => {
    const productUrl = product.productUrl ? String(product.productUrl) : "";
    const message = buildWhatsAppMessage({ productName: name, price, productUrl });
    return buildWaMeLink(String(product.whatsappUrl || ""), message);
  })();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Quick view ${name}`}
        className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Eye className="h-4 w-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto bg-[var(--surface-card,#18181B)]">
          <SheetHeader>
            <SheetTitle className="pr-8 text-left">{name}</SheetTitle>
            {isFeatured && (
              <span className="inline-flex w-fit rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black">Featured</span>
            )}
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-[var(--border,rgba(255,255,255,0.08))]">
                <CreatorImage src={imageUrl} alt={name} variant="product" className="aspect-[4/3] w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[var(--surface-card-hover,#27272A)]">
                <span className="text-lg font-medium text-[var(--text-muted,#71717A)]">{name[0] || "P"}</span>
              </div>
            )}

            {description && (
              <SheetDescription className="text-left text-sm leading-relaxed text-[var(--text-secondary,#A1A1AA)]">
                {description}
              </SheetDescription>
            )}

            {price && <p className="text-lg font-bold tracking-tight text-[var(--text-primary,#FAFAFA)]">{price}</p>}

            <div className="space-y-2 pt-2">
              {showOnline && (
                <BuyNowButton
                  productId={String(product.id)}
                  productName={name}
                  imageUrl={imageUrl || undefined}
                  previewMode={previewMode}
                />
              )}
              {showWhatsApp &&
                (previewMode ? (
                  <button
                    type="button"
                    disabled
                    title="Ordering available on your live website"
                    className="w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--surface-card-hover,#27272A)] py-2.5 text-center text-xs font-semibold text-[var(--text-muted,#71717A)] disabled:cursor-not-allowed"
                  >
                    Order on WhatsApp
                  </button>
                ) : waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--surface-card-hover,#27272A)] py-2.5 text-center text-xs font-semibold text-[var(--text-secondary,#A1A1AA)] transition-colors hover:border-[var(--brand-secondary,#00f5ff)] hover:text-[var(--brand-secondary,#00f5ff)]"
                  >
                    Order on WhatsApp
                  </a>
                ) : null)}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
