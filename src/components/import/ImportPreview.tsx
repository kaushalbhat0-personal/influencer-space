"use client";

import { useState } from "react";
import type { BusinessProfile } from "@/lib/acquisition/business-types";
import type { AcquisitionResult } from "@/lib/acquisition/types";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function ImportPreview({
  analysis,
  onConfirm,
  onCancel,
  provisioning,
}: {
  analysis: AcquisitionResult;
  onConfirm: (profile: BusinessProfile) => void;
  onCancel: () => void;
  provisioning: boolean;
}) {
  const { confidence, completeness, warnings, profile: initialProfile } = analysis;
  const [profile, setProfile] = useState<BusinessProfile>(() => structuredClone(initialProfile));
  const [newOffer, setNewOffer] = useState({ name: "", price: 0, description: "" });

  const canProvision = profile.businessName.trim().length > 0 && confidence > 0;

  function addOffer() {
    if (!newOffer.name.trim()) return;
    setProfile((p) => ({
      ...p,
      offers: [...p.offers, { id: `offer_${Date.now()}`, type: "service", name: newOffer.name.trim(), description: newOffer.description.trim(), price: newOffer.price, currency: "INR" }],
    }));
    setNewOffer({ name: "", price: 0, description: "" });
  }

  function removeOffer(id: string) {
    setProfile((p) => ({ ...p, offers: p.offers.filter((o) => o.id !== id) }));
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
        <Field label="Business Name" value={profile.businessName} onChange={(v) => setProfile((p) => ({ ...p, businessName: v }))} />
        <Field label="Owner Name" value={profile.ownerName} onChange={(v) => setProfile((p) => ({ ...p, ownerName: v }))} />
        <Field label="Tagline" value={profile.tagline} onChange={(v) => setProfile((p) => ({ ...p, tagline: v }))} className="sm:col-span-2" />
        <Field label="Description" value={profile.description} onChange={(v) => setProfile((p) => ({ ...p, description: v }))} textarea className="sm:col-span-2" />
      </div>

      {/* Palette */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Brand Palette</label>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)]">Primary</span>
            <input type="color" value={profile.palette.primary} onChange={(e) => setProfile((p) => ({ ...p, palette: { ...p.palette, primary: e.target.value } }))} className="h-8 w-14 rounded cursor-pointer bg-transparent border border-white/10" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)]">Secondary</span>
            <input type="color" value={profile.palette.secondary} onChange={(e) => setProfile((p) => ({ ...p, palette: { ...p.palette, secondary: e.target.value } }))} className="h-8 w-14 rounded cursor-pointer bg-transparent border border-white/10" />
          </div>
        </div>
      </div>

      {/* Offers */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Offers ({profile.offers.length})</label>
        <div className="space-y-2 mb-3">
          {profile.offers.map((o) => (
            <div key={o.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <span className="flex-1 text-sm text-white truncate">{o.name}</span>
              <span className="text-xs text-[var(--text-muted)]">{formatCurrency(o.price)}</span>
              <button onClick={() => removeOffer(o.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newOffer.name} onChange={(e) => setNewOffer((o) => ({ ...o, name: e.target.value }))} placeholder="Offer name" className="admin-input flex-1 text-sm" />
          <input type="number" value={newOffer.price || ""} onChange={(e) => setNewOffer((o) => ({ ...o, price: Number(e.target.value) }))} placeholder="Price" className="admin-input w-24 text-sm" />
          <button onClick={addOffer} className="admin-btn-cyan px-3 py-2 text-xs" disabled={!newOffer.name.trim()}>
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
      <label htmlFor={id} className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      {textarea ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="admin-input w-full text-sm resize-none" />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="admin-input w-full text-sm" />
      )}
    </div>
  );
}
