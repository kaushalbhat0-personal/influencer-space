"use client";

import { useState, useCallback } from "react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useAutosave } from "@/features/_shared/hooks/use-autosave";
import type { SEOData, SEOFormInput } from "../types";
import { updateSEO } from "../actions";

interface SEOPageProps {
  initialData: SEOData;
  brandName?: string;
  domainPreview?: string;
}

export function SEOPage({ initialData, brandName, domainPreview }: SEOPageProps) {
  const [data, setData] = useState<SEOData>(initialData);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = useCallback(async (d: SEOData) => {
    setSaving(true);
    await updateSEO(d as SEOFormInput);
    setDirty(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  useAutosave(data, save, dirty);

  const update = <K extends keyof SEOData>(key: K, value: SEOData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const readiness = [
    { label: "Website name", done: !!(data.title && data.title.trim().length >= 2) },
    { label: "Description", done: !!(data.description && data.description.trim().length >= 20) },
    { label: "Sharing image", done: !!data.ogImage },
  ];
  const allReady = readiness.every((r) => r.done);

  return (
    <FeaturePage title="Get Found on Google" description="Help people understand what you do when they find your website on Google and when they share it online.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="space-y-4 p-6">
            <h3 className="text-sm font-semibold text-white">Website details</h3>
            <p className="text-xs text-zinc-400">This is what people will see in search results and browser tabs.</p>
            <Input label="Website name" value={data.title ?? ""} onChange={(e) => update("title", e.target.value || null)} maxLength={60} placeholder={brandName || "Northstar Studio"} />
            <p className="text-[11px] text-zinc-500">The name shown on Google and browser tabs. Aim 30–60 characters.</p>
            <Textarea label="What do you do?" value={data.description ?? ""} onChange={(e) => update("description", e.target.value || null)} rows={3} maxLength={160} placeholder="I create premium 3D designs and digital products." />
            <p className="text-[11px] text-zinc-500">A short description of your website. Keep it clear and natural. 50–160 characters.</p>
          </GlassCard>

          <GlassCard className="space-y-4 p-6">
            <h3 className="text-sm font-semibold text-white">Social sharing</h3>
            <p className="text-xs text-zinc-400">Choose what people see when your website is shared on WhatsApp, Instagram, LinkedIn, Facebook, X and other apps.</p>
            <Input label="Sharing image" value={data.ogImage ?? ""} onChange={(e) => update("ogImage", e.target.value || null)} placeholder="https://… or upload via Media" />
            <p className="text-[11px] text-zinc-500">Image shown when sharing. If empty we use your profile image.</p>
            {data.ogImage && <img src={data.ogImage} alt="Sharing preview" className="mt-2 h-32 w-full rounded object-cover" />}
          </GlassCard>

          <div className="flex items-center gap-3">
            <Button onClick={() => save(data)} disabled={saving} className="min-w-[120px]">{saving ? "Saving…" : saved ? "Saved ✓" : dirty ? "Save" : "Saved"}</Button>
            <span className="text-xs text-zinc-500">{dirty ? "Unsaved changes" : saved ? "All changes saved" : ""}</span>
          </div>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-white">Search preview</h3>
            <div className="mt-3 rounded border border-white/10 bg-zinc-900 p-3">
              <p className="text-sm font-medium text-[#8ab4f8] truncate">{data.title || brandName || "Northstar Studio"}</p>
              <p className="text-xs text-[#006621] truncate">{domainPreview || "northstar.example.com"}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">{data.description || "Premium 3D design and digital products for modern creators and businesses."}</p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-white">Website visibility</h3>
            {allReady ? (
              <p className="text-sm text-emerald-400">Good ✓</p>
            ) : (
              <p className="text-sm text-amber-400">Almost ready</p>
            )}
            <ul className="mt-3 space-y-2">
              {readiness.map((r) => (
                <li key={r.label} className={`flex items-center gap-2 text-xs ${r.done ? "text-zinc-300" : "text-zinc-500"}`}>
                  <span className={`h-2 w-2 rounded-full ${r.done ? "bg-emerald-500" : "bg-zinc-600"}`} />
                  {r.label} {r.done ? "✓" : "—"}
                </li>
              ))}
            </ul>
            {!allReady && <p className="mt-3 text-xs text-zinc-400">Add a short description so people can understand your website from search results.</p>}
            <p className="mt-3 text-[11px] text-zinc-500">We generate title, description, canonical, OpenGraph and sitemap automatically.</p>
          </GlassCard>
        </div>
      </div>
    </FeaturePage>
  );
}
