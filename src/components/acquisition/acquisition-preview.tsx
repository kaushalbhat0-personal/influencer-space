"use client";

import { useState } from "react";
import type { CreatorProfile, AcquisitionResult } from "@/lib/acquisition/types";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";

export function AcquisitionPreview({
  result,
  onConfirm,
  onBack,
  provisioning,
}: {
  result: AcquisitionResult;
  onConfirm: () => void;
  onBack: () => void;
  provisioning: boolean;
}) {
  const [profile, setProfile] = useState<CreatorProfile>(() => structuredClone(result.profile));
  const [newProduct, setNewProduct] = useState({ name: "", price: 0, description: "" });

  const canProvision = profile.brandName.trim().length > 0 && result.confidence > 0;

  function addProduct() {
    if (!newProduct.name.trim() || newProduct.price <= 0) return;
    setProfile((p) => ({
      ...p,
      products: [...p.products, { ...newProduct, price: Number(newProduct.price) }],
    }));
    setNewProduct({ name: "", price: 0, description: "" });
  }

  function removeProduct(index: number) {
    setProfile((p) => ({
      ...p,
      products: p.products.filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Review Storefront</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Review and edit the acquired data before provisioning.
        </p>
      </div>

      {/* Confidence & Warnings */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {result.confidence}% confidence
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
          {result.completeness}% complete
        </span>
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
          {result.warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Editable Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Brand Name" value={profile.brandName} onChange={(v) => setProfile((p) => ({ ...p, brandName: v }))} />
        <Field label="Creator Name" value={profile.creatorName} onChange={(v) => setProfile((p) => ({ ...p, creatorName: v }))} />
        <Field label="Tagline" value={profile.tagline} onChange={(v) => setProfile((p) => ({ ...p, tagline: v }))} className="sm:col-span-2" />
        <Field label="Bio" value={profile.bio} onChange={(v) => setProfile((p) => ({ ...p, bio: v }))} className="sm:col-span-2" multiline />
        <Field label="Hero Title" value={profile.heroTitle} onChange={(v) => setProfile((p) => ({ ...p, heroTitle: v }))} className="sm:col-span-2" />
      </div>

      {/* Products */}
      <div>
        <h3 className="text-sm font-medium text-white mb-2">Products</h3>
        {profile.products.length > 0 && (
          <div className="space-y-2 mb-3">
            {profile.products.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <span className="flex-1 text-sm text-zinc-300 truncate">{p.name}</span>
                <span className="text-sm text-zinc-400">₹{p.price}</span>
                <button onClick={() => removeProduct(i)} className="text-zinc-600 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={newProduct.name}
            onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
            placeholder="Product name"
            className="admin-input flex-1 text-sm"
          />
          <input
            type="number"
            value={newProduct.price || ""}
            onChange={(e) => setNewProduct((p) => ({ ...p, price: Number(e.target.value) }))}
            placeholder="Price"
            className="admin-input w-24 text-sm"
          />
          <button onClick={addProduct} className="btn-ghost p-2 text-zinc-400 hover:text-white">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} disabled={provisioning} className="btn-secondary px-6 py-2.5 text-sm">
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={!canProvision || provisioning}
          className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50"
        >
          {provisioning ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Provisioning...
            </span>
          ) : (
            "Create Storefront"
          )}
        </button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, multiline, className,
}: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="admin-input w-full text-sm resize-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="admin-input w-full text-sm" />
      )}
    </div>
  );
}
