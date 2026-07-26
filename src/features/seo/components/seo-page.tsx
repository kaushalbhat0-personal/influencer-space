"use client";

import { useState, useCallback } from "react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAutosave } from "@/features/_shared/hooks/use-autosave";
import type { SEOData, SEOFormInput } from "../types";
import { updateSEO } from "../actions";

interface SEOPageProps {
  initialData: SEOData;
}

export function SEOPage({ initialData }: SEOPageProps) {
  const [data, setData] = useState<SEOData>(initialData);
  const [dirty, setDirty] = useState(false);

  const save = useCallback(async (d: SEOData) => {
    await updateSEO(d as SEOFormInput);
    setDirty(false);
  }, []);

  useAutosave(data, save, dirty);

  const update = <K extends keyof SEOData>(key: K, value: SEOData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  return (
    <FeaturePage title="SEO" description="Manage search engine optimization settings.">
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Metadata</h3>
          <Input label="Meta Title" value={data.title ?? ""} onChange={(e) => update("title", e.target.value || null)} maxLength={70} />
          <Textarea label="Meta Description" value={data.description ?? ""} onChange={(e) => update("description", e.target.value || null)} rows={3} maxLength={160} />
          <Input label="OG Image URL" value={data.ogImage ?? ""} onChange={(e) => update("ogImage", e.target.value || null)} />
          <Input label="Canonical URL" value={data.canonicalUrl ?? ""} onChange={(e) => update("canonicalUrl", e.target.value || null)} />
        </GlassCard>

        <GlassCard className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Technical SEO</h3>
          <Textarea label="Robots.txt" value={data.robotsTxt ?? ""} onChange={(e) => update("robotsTxt", e.target.value || null)} rows={5} />
          <Textarea label="Structured Data (JSON-LD)" value={data.structuredData ? JSON.stringify(data.structuredData, null, 2) : ""} onChange={(e) => {
            try { update("structuredData", JSON.parse(e.target.value)); } catch { /* invalid JSON */ }
          }} rows={5} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="indexing" checked={data.indexingEnabled} onChange={(e) => update("indexingEnabled", e.target.checked)} className="rounded border-white/10" />
            <label htmlFor="indexing" className="text-sm text-zinc-300">Enable indexing</label>
          </div>
        </GlassCard>
      </div>
    </FeaturePage>
  );
}
