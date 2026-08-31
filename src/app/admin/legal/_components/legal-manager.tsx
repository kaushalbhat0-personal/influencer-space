"use client";
import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { LegalPageKey } from "@/lib/legal/service";
import { updateLegal } from "@/features/legal/actions";

const PAGES: { key: LegalPageKey; label: string }[] = [
  { key: "privacy", label: "Privacy Policy" },
  { key: "terms", label: "Terms & Conditions" },
  { key: "refund", label: "Refund & Cancellation Policy" },
  { key: "disclaimer", label: "Disclaimer" },
];

export function LegalManager({ initial }: { initial: Record<LegalPageKey, { title: string; content: string }> }) {
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState<LegalPageKey | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (key: LegalPageKey) => {
    setSaving(true);
    const v = data[key];
    await updateLegal(key, v.title, v.content);
    setSaving(false);
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Legal</h1>
        <p className="mt-1 text-sm text-zinc-400">Your website includes standard legal pages to help you get started. These are general templates and should be reviewed and customized for your business and local requirements.</p>
      </div>
      {PAGES.map((p) => (
        <GlassCard key={p.key} className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{p.label}</h3>
            {editing !== p.key ? (
              <Button variant="ghost" onClick={() => setEditing(p.key)}>Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={() => save(p.key)} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </div>
            )}
          </div>
          {editing === p.key ? (
            <div className="mt-4 space-y-3">
              <Input label="Title" value={data[p.key].title} onChange={(e) => setData((d) => ({ ...d, [p.key]: { ...d[p.key], title: e.target.value } }))} />
              <Textarea label="Content" value={data[p.key].content} onChange={(e) => setData((d) => ({ ...d, [p.key]: { ...d[p.key], content: e.target.value } }))} rows={12} />
            </div>
          ) : (
            <div className="mt-3 max-h-32 overflow-hidden text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap">{data[p.key].content.slice(0, 300)}…</div>
          )}
          <p className="mt-2 text-[11px] text-zinc-500">Shown at <code>/{p.key === "refund" ? "refund" : p.key}</code> on your storefront.</p>
        </GlassCard>
      ))}
    </div>
  );
}
