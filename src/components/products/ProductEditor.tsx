"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { ProductData } from "@/lib/products/types";
import type { ProductStatus } from "@/lib/products/constants";
import type { ManagedImage } from "@/components/products/ImageManager";
import { parseImages, resolveSlug } from "@/lib/products/mapper";
import { ProductGeneralSection } from "./sections/ProductGeneralSection";
import { ProductPricingSection } from "./sections/ProductPricingSection";
import { ProductMediaSection } from "./sections/ProductMediaSection";
import { ProductPublishingSection } from "./sections/ProductPublishingSection";
import { ProductSEOSection } from "./sections/ProductSEOSection";

interface ProductEditorProps {
  product: ProductData | null;
  tenantId: string;
  open: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  saving?: boolean;
}

export function ProductEditor({ product, tenantId, open, onClose, onSave, saving }: ProductEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [isFeatured, setIsFeatured] = useState(false);
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [images, setImages] = useState<ManagedImage[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setPrice(String(product.price));
      setStatus((product.status as ProductStatus) || "DRAFT");
      setIsFeatured(product.isFeatured ?? false);
      setSlug(product.slug ?? "");
      setSeoTitle(product.seoTitle ?? "");
      setSeoDescription(product.seoDescription ?? "");
      setImages(parseImages(product.images));
      setError("");
    } else {
      setName(""); setDescription(""); setPrice(""); setStatus("PUBLISHED");
      setIsFeatured(false); setSlug(""); setSeoTitle(""); setSeoDescription(""); setImages([]); setError("");
    }
  }, [product]);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price.trim()) {
      setError("Name and price are required");
      return;
    }
    setError("");

    const formData = new FormData();
    if (product) formData.set("id", product.id);
    formData.set("name", name.trim());
    formData.set("description", description.trim());
    formData.set("price", price);
    formData.set("status", status);
    formData.set("isFeatured", String(isFeatured));
    formData.set("slug", resolveSlug(name, slug));
    formData.set("seoTitle", seoTitle);
    formData.set("seoDescription", seoDescription);
    formData.set("images", JSON.stringify(images));
    formData.set("imageUrl", images[0]?.url ?? "");

    await onSave(formData);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-[var(--shadow-overlay)]"
            role="dialog"
            aria-modal="true"
            aria-label={product ? "Edit Product" : "New Product"}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 px-6 py-4 backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white">
                {product ? "Edit Product" : "New Product"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
                aria-label="Close editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              <ProductGeneralSection
                name={name} onNameChange={setName}
                description={description} onDescriptionChange={setDescription}
                disabled={saving}
              />

              <ProductPricingSection
                price={price} onPriceChange={setPrice}
                disabled={saving}
              />

              <ProductMediaSection
                images={images} onImagesChange={setImages}
                tenantId={tenantId}
              />

              <ProductPublishingSection
                status={status} onStatusChange={setStatus}
                isFeatured={isFeatured} onFeaturedChange={setIsFeatured}
                disabled={saving}
              />

              <ProductSEOSection
                slug={slug} onSlugChange={setSlug}
                seoTitle={seoTitle} onSeoTitleChange={setSeoTitle}
                seoDescription={seoDescription} onSeoDescriptionChange={setSeoDescription}
                disabled={saving}
              />

              {error && (
                <div className="rounded-lg bg-red-500/10 p-3" role="alert">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onClose} className="admin-btn-outline px-4 py-2 text-xs" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || !name.trim() || !price.trim()} className="admin-btn-cyan px-6 py-2 text-xs">
                  {saving ? "Saving..." : product ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
