"use client";
import { useState, useMemo } from "react";
import { HELP_ARTICLES } from "@/lib/guidance/definitions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function HelpPanel({ open, onClose, context }: { open: boolean; onClose: () => void; context?: string }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      if (context) {
        const c = context.toLowerCase();
        const ctx = HELP_ARTICLES.filter((a) => a.keywords.some((k) => c.includes(k)) || a.title.toLowerCase().includes(c));
        if (ctx.length) return ctx.slice(0, 5);
      }
      return HELP_ARTICLES.slice(0, 7);
    }
    return HELP_ARTICLES.filter((a) => a.title.toLowerCase().includes(needle) || a.description.toLowerCase().includes(needle) || a.keywords.some((k) => k.includes(needle))).slice(0, 8);
  }, [q, context]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-zinc-950 shadow-[var(--shadow-overlay)]">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <h2 id="help-title" className="text-base font-semibold text-white">How can we help?</h2>
            <Button variant="ghost" onClick={onClose} aria-label="Close help">Close</Button>
          </div>
          <div className="mt-3">
            <Input placeholder="Search for help…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search help" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Popular</p>
          <ul className="mt-3 space-y-3">
            {filtered.map((a) => (
              <li key={a.id} className="rounded-lg border border-white/10 bg-zinc-900 p-3">
                <p className="text-sm font-medium text-white">{a.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{a.description}</p>
              </li>
            ))}
            {filtered.length === 0 && <p className="text-sm text-zinc-500">We couldn&apos;t find that. Try “domain”, “Google”, “privacy” or “publish”.</p>}
          </ul>
        </div>
        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-medium text-white">Still need help?</p>
          <a href="/contact" className="mt-2 inline-flex text-sm text-[var(--brand-primary)] hover:underline">Contact Support</a>
          <div className="mt-3 text-xs text-zinc-500">
            <button onClick={() => { localStorage.removeItem("guidance_creator-walkthrough"); localStorage.removeItem("guidance_agency-walkthrough"); window.location.reload(); }} className="underline hover:text-zinc-300">Replay walkthrough</button>
          </div>
        </div>
      </div>
    </div>
  );
}
