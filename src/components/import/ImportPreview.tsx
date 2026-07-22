"use client";

import { useState } from "react";
import type { CreatorProfile, ImportAnalysisResult } from "@/lib/import/types";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";

export function ImportPreview({
  analysis,
  onConfirm,
  onCancel,
  provisioning,
}: {
  analysis: ImportAnalysisResult;
  onConfirm: (profile: CreatorProfile) => void;
  onCancel: () => void;
  provisioning: boolean;
}) {
  const { confidence, completeness, warnings, creatorProfile } = analysis;
  const [profile, setProfile] = useState<CreatorProfile>(() => structuredClone(creatorProfile));
  const [newProduct, setNewProduct] = useState({ name: "", price: 0, description: "" });

  const canProvision = profile.brandName.trim().length > 0 && confidence > 0;

  function addProduct() {
    if (!newProduct.name.trim()) return;
    setProfile((p) => ({
      ...p,
      products: [...p.products, { name: newProduct.name.trim(), price: newProduct.price, description: newProduct.description.trim() }],
    }));
    setNewProduct({ name: "", price: 0, description: "" });
  }

  function removeProduct(i: number) {
    setProfile((p) => ({ ...p, products: p.products.filter((_, idx) => idx !== i) }));
  }

  const warnColor = confidence >= 80 ? "text-emerald-400" : confidence >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Confidence + Warnings */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${warnColor} bg-white/[0.04]`}>
          {confidence >= 80 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {confidence}% confidence · {completeness}% complete
        </span>
        {warnings.length > 0 && (
          <div className="space-y-1 w-full mt-2">
            {warnings.map((w, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs text-amber-400/80">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Editable Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Brand Name" value={profile.brandName} onChange={(v) => setProfile((p) => ({ ...p, brandName: v }))} />
        <Field label="Creator Name" value={profile.creatorName} onChange={(v) => setProfile((p) => ({ ...p, creatorName: v }))} />
        <Field label="Tagline" value={profile.tagline} onChange={(v) => setProfile((p) => ({ ...p, tagline: v }))} className="sm:col-span-2" />
        <Field label="Bio" value={profile.bio} onChange={(v) => setProfile((p) => ({ ...p, bio: v }))} textarea className="sm:col-span-2" />
        <Field label="Hero Title" value={profile.heroTitle} onChange={(v) => setProfile((p) => ({ ...p, heroTitle: v }))} />
        <Field label="Niche" value={profile.niche} onChange={(v) => setProfile((p) => ({ ...p, niche: v }))} />
        <Field label="SEO Title" value={profile.seoTitle} onChange={(v) => setProfile((p) => ({ ...p, seoTitle: v }))} />
        <Field label="SEO Description" value={profile.seoDesc} onChange={(v) => setProfile((p) => ({ ...p, seoDesc: v }))} />
      </div>

      {/* Palette */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-2">Brand Palette</label>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Primary</span>
            <input type="color" value={profile.palette.primary} onChange={(e) => setProfile((p) => ({ ...p, palette: { ...p.palette, primary: e.target.value } }))} className="h-8 w-14 rounded cursor-pointer bg-transparent border border-white/10" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Secondary</span>
            <input type="color" value={profile.palette.secondary} onChange={(e) => setProfile((p) => ({ ...p, palette: { ...p.palette, secondary: e.target.value } }))} className="h-8 w-14 rounded cursor-pointer bg-transparent border border-white/10" />
          </div>
        </div>
      </div>

      {/* Products */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-2">Products ({profile.products.length})</label>
        <div className="space-y-2 mb-3">
          {profile.products.map((p, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="flex-1 text-sm text-white truncate">{p.name}</span>
              <span className="text-xs text-zinc-500">₹{p.price}</span>
              <button onClick={() => removeProduct(i)} className="text-zinc-600 hover:text-red-400 transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} placeholder="Product name" className="admin-input flex-1 text-sm" />
          <input type="number" value={newProduct.price || ""} onChange={(e) => setNewProduct((p) => ({ ...p, price: Number(e.target.value) }))} placeholder="Price" className="admin-input w-24 text-sm" />
          <button onClick={addProduct} className="admin-btn-cyan px-3 py-2 text-xs" disabled={!newProduct.name.trim()}>
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} disabled={provisioning} className="btn-secondary flex-1 py-2.5 text-sm">
          Cancel
        </button>
        <button onClick={() => onConfirm(profile)} disabled={provisioning || !canProvision} className="btn-primary flex-1 py-2.5 text-sm">
          {provisioning ? "Provisioning..." : `Provision Creator`}
        </button>
      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange, textarea, className }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; className?: string }) {
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
      {textarea ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="admin-input w-full text-sm resize-none" />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="admin-input w-full text-sm" />
      )}
    </div>
  );
}
