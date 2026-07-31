"use client";

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile, BusinessOffer } from "@/lib/acquisition/business-types";
import { BUSINESS_CATEGORIES, OFFER_TYPES } from "@/lib/acquisition/business-types";
import { calculateCompleteness } from "@/lib/acquisition/completeness";
import { saveDraft, loadDraft, clearDraft } from "@/lib/acquisition/draft";
import { ProvisionProgress } from "./provision-progress";
import { SuccessScreen } from "./success-screen";
import { acquireAndProvision } from "@/actions/acquisition/acquire.actions";

const EMPTY_PROFILE: BusinessProfile = {
  businessName: "", ownerName: "", category: "", industry: "",
  tagline: "", description: "", audience: "", goals: "", tone: "",
  offers: [], socialLinks: [],
  palette: { primary: "#6366f1", secondary: "#a78bfa" },
  pages: ["home", "products", "about", "contact"],
};

type Step = "identity" | "details" | "offers" | "branding" | "links" | "preview" | "provisioning" | "success" | "error";

export function ManualWizard() {
  const [step, setStep] = useState<Step>("identity");
  const [profile, setProfile] = useState<BusinessProfile>(EMPTY_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [successData, setSuccessData] = useState<{ storefrontUrl: string; tenantId: string; creatorName: string } | null>(null);

  useEffect(() => {
    const draft = loadDraft("manual");
    if (draft) setProfile(draft);
  }, []);

  const update = useCallback((patch: Partial<BusinessProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveDraft("manual", next);
      return next;
    });
  }, []);

  const handleProvision = useCallback(async () => {
    setProvisioning(true);
    setError(null);
    setStep("provisioning");
    const name = profile.businessName || profile.ownerName || "Storefront";
    try {
      const result = await acquireAndProvision("manual", name, profile);
      if (result.success) {
        clearDraft("manual");
        setSuccessData({ storefrontUrl: result.storefrontUrl, tenantId: result.tenantId, creatorName: profile.businessName });
        setStep("success");
      } else {
        setError(result.error || "Provisioning failed");
        setStep("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
      setStep("error");
    } finally {
      setProvisioning(false);
    }
  }, [profile]);

  const completeness = calculateCompleteness(profile);

  const addOffer = useCallback((type: string) => {
    const newOffer: BusinessOffer = {
      id: `offer_${Date.now()}`,
      type,
      name: "",
      description: "",
      price: 0,
      currency: "INR",
    };
    update({ offers: [...profile.offers, newOffer] });
  }, [profile.offers, update]);

  const removeOffer = useCallback((id: string) => {
    update({ offers: profile.offers.filter((o) => o.id !== id) });
  }, [profile.offers, update]);

  const updateOffer = useCallback((id: string, patch: Partial<BusinessOffer>) => {
    update({ offers: profile.offers.map((o) => o.id === id ? { ...o, ...patch } : o) });
  }, [profile.offers, update]);

  const addSocial = useCallback(() => {
    update({ socialLinks: [...profile.socialLinks, { platform: "", url: "" }] });
  }, [profile.socialLinks, update]);

  const updateSocial = useCallback((index: number, patch: Partial<{ platform: string; url: string }>) => {
    update({ socialLinks: profile.socialLinks.map((s, i) => i === index ? { ...s, ...patch } : s) });
  }, [profile.socialLinks, update]);

  const removeSocial = useCallback((index: number) => {
    update({ socialLinks: profile.socialLinks.filter((_, i) => i !== index) });
  }, [profile.socialLinks, update]);

  const goTo = useCallback((s: Step) => { setStep(s); setError(null); }, []);

  const renderStep = () => {
    switch (step) {
      case "identity":
        return (
          <div className="space-y-5">
            <div><h2 className="text-lg font-semibold text-white">Business Identity</h2><p className="mt-1 text-sm text-zinc-400">Tell us about your business.</p></div>
            <Field label="Business Name" value={profile.businessName} onChange={(v) => update({ businessName: v })} required />
            <Field label="Owner Name" value={profile.ownerName} onChange={(v) => update({ ownerName: v })} />
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BUSINESS_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = profile.category === cat.id;
                  return (
                    <button key={cat.id} type="button" onClick={() => { update({ category: cat.id, pages: cat.suggestedPages }); }} className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all ${active ? "border-indigo-500/40 bg-indigo-500/10" : "border-white/[0.06] hover:border-white/[0.15]"}`}>
                      <Icon className={`h-5 w-5 ${active ? "text-indigo-400" : "text-zinc-500"}`} />
                      <span className={`text-[10px] font-medium ${active ? "text-indigo-300" : "text-zinc-400"}`}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Industry / Niche" value={profile.industry} onChange={(v) => update({ industry: v })} placeholder="e.g. Gaming, Fitness, Education" />
            <Field label="Short Tagline" value={profile.tagline} onChange={(v) => update({ tagline: v })} placeholder="e.g. Premium gaming content and merch" />
            <NextButton disabled={!profile.businessName.trim()} onClick={() => goTo("details")} />
          </div>
        );

      case "details":
        return (
          <div className="space-y-5">
            <div><h2 className="text-lg font-semibold text-white">Business Details</h2><p className="mt-1 text-sm text-zinc-400">Help customers understand what you do.</p></div>
            <Field label="Description" value={profile.description} onChange={(v) => update({ description: v })} multiline placeholder="Describe your business in detail..." />
            <Field label="Target Audience" value={profile.audience} onChange={(v) => update({ audience: v })} placeholder="e.g. Gamers, entrepreneurs, fitness enthusiasts" />
            <Field label="Brand Voice / Tone" value={profile.tone} onChange={(v) => update({ tone: v })} placeholder="e.g. Professional, friendly, edgy, minimal" />
            <Field label="Business Goals" value={profile.goals} onChange={(v) => update({ goals: v })} multiline placeholder="What do you want to achieve?" />
            <div className="flex gap-3"><BackBtn onClick={() => goTo("identity")} /><NextButton onClick={() => goTo("offers")} /></div>
          </div>
        );

      case "offers":
        return (
          <div className="space-y-5">
            <div><h2 className="text-lg font-semibold text-white">Products & Services</h2><p className="mt-1 text-sm text-zinc-400">What do you sell? Add your offerings below.</p></div>

            {profile.offers.map((offer) => (
              <div key={offer.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500 uppercase">{offer.type.replace(/_/g, " ")}</span>
                  <button onClick={() => removeOffer(offer.id)} className="text-xs text-zinc-600 hover:text-red-400">Remove</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input value={offer.name} onChange={(e) => updateOffer(offer.id, { name: e.target.value })} placeholder="Offer name" className="admin-input text-sm sm:col-span-2" />
                  <input type="number" value={offer.price || ""} onChange={(e) => updateOffer(offer.id, { price: Number(e.target.value) })} placeholder="Price" className="admin-input text-sm" />
                </div>
                <input value={offer.description} onChange={(e) => updateOffer(offer.id, { description: e.target.value })} placeholder="Short description" className="admin-input text-sm w-full" />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Add an offer type</label>
              <div className="flex flex-wrap gap-2">
                {OFFER_TYPES.map((ot) => {
                  const Icon = ot.icon;
                  const alreadyAdded = profile.offers.some((o) => o.type === ot.id);
                  return (
                    <button key={ot.id} type="button" onClick={() => addOffer(ot.id)} disabled={alreadyAdded} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-2 text-xs text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <Icon className="h-3.5 w-3.5" />
                      {ot.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3"><BackBtn onClick={() => goTo("details")} /><NextButton onClick={() => goTo("branding")} /></div>
          </div>
        );

      case "branding":
        return (
          <div className="space-y-5">
            <div><h2 className="text-lg font-semibold text-white">Branding</h2><p className="mt-1 text-sm text-zinc-400">Customize your storefront look.</p></div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Brand Colors</label>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">Primary</p>
                  <input type="color" value={profile.palette.primary} onChange={(e) => update({ palette: { ...profile.palette, primary: e.target.value } })} className="h-10 w-20 rounded-lg cursor-pointer bg-transparent border border-white/[0.06]" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">Secondary</p>
                  <input type="color" value={profile.palette.secondary} onChange={(e) => update({ palette: { ...profile.palette, secondary: e.target.value } })} className="h-10 w-20 rounded-lg cursor-pointer bg-transparent border border-white/[0.06]" />
                </div>
              </div>
            </div>
            <div className="flex gap-3"><BackBtn onClick={() => goTo("offers")} /><NextButton onClick={() => goTo("links")} /></div>
          </div>
        );

      case "links":
        return (
          <div className="space-y-5">
            <div><h2 className="text-lg font-semibold text-white">Social Links</h2><p className="mt-1 text-sm text-zinc-400">Connect your social profiles.</p></div>
            {profile.socialLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={link.platform} onChange={(e) => updateSocial(i, { platform: e.target.value })} className="admin-input text-sm w-32">
                  <option value="">Platform</option>
                  <option value="website">Website</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="discord">Discord</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitch">Twitch</option>
                </select>
                <input value={link.url} onChange={(e) => updateSocial(i, { url: e.target.value })} placeholder="URL" className="admin-input text-sm flex-1" />
                <button onClick={() => removeSocial(i)} className="text-zinc-600 hover:text-red-400 text-xs">Remove</button>
              </div>
            ))}
            <button onClick={addSocial} className="text-xs text-indigo-400 hover:text-indigo-300">+ Add Link</button>

            {/* Completeness */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Profile Completeness</span>
                <span className={`text-sm font-medium ${completeness.overall >= 80 ? "text-emerald-400" : completeness.overall >= 50 ? "text-amber-400" : "text-red-400"}`}>{completeness.overall}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 mb-3">
                <div className={`h-full rounded-full transition-all ${completeness.overall >= 80 ? "bg-emerald-500" : completeness.overall >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${completeness.overall}%` }} />
              </div>
              {completeness.missing.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 uppercase">Missing</p>
                  {completeness.missing.map((m, i) => <p key={i} className="text-xs text-amber-400">• {m}</p>)}
                </div>
              )}
            </div>

            <div className="flex gap-3"><BackBtn onClick={() => goTo("branding")} /><NextButton onClick={handleProvision} disabled={completeness.overall < 30} label={provisioning ? "Creating..." : "Create Storefront"} /></div>
          </div>
        );

      case "provisioning":
        return <ProvisionProgress stages={[{ id: "provision", label: "Creating storefront", status: "running" }, { id: "publish", label: "Publishing", status: "pending" }]} />;

      case "success":
        return successData ? <SuccessScreen {...successData} onCreateAnother={() => { setProfile(EMPTY_PROFILE); setStep("identity"); }} /> : null;

      case "error":
        return (
          <div className="text-center space-y-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4"><p className="text-sm text-red-400">{error || "Something went wrong"}</p></div>
            <button onClick={() => goTo("links")} className="btn-primary px-6 py-2.5 text-sm">Go Back</button>
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {(["identity", "details", "offers", "branding", "links"] as Step[]).map((s, i) => {
          const stepOrder = ["identity", "details", "offers", "branding", "links"];
          const currentIdx = stepOrder.indexOf(step);
          const completed = i < currentIdx;
          return (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium ${completed ? "bg-indigo-500 text-white" : s === step ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40" : "bg-zinc-800 text-zinc-600"}`}>
                {i + 1}
              </span>
              {i < 4 && <span className={`h-px w-4 ${completed ? "bg-indigo-500/40" : "bg-zinc-800"}`} />}
            </div>
          );
        })}
      </div>
      {renderStep()}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="admin-input w-full text-sm resize-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="admin-input w-full text-sm" />
      )}
    </div>
  );
}

function NextButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return <button onClick={onClick} disabled={disabled} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">{label || "Continue"}</button>;
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="btn-secondary px-6 py-2.5 text-sm">Back</button>;
}
