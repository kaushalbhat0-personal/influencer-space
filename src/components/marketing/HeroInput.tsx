"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { MarketingEvents } from "@/lib/analytics/marketing";

const PLATFORM_ICONS: Record<string, { label: string; color: string }> = {
  youtube: { label: "YouTube", color: "text-red-400" },
  instagram: { label: "Instagram", color: "text-pink-400" },
  tiktok: { label: "TikTok", color: "text-cyan-400" },
  linkedin: { label: "LinkedIn", color: "text-blue-400" },
  twitch: { label: "Twitch", color: "text-purple-400" },
  twitter: { label: "X", color: "text-zinc-300" },
};

function detectPlatform(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("youtube") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("tiktok")) return "tiktok";
  if (lower.includes("linkedin")) return "linkedin";
  if (lower.includes("twitch")) return "twitch";
  if (lower.includes("x.com") || lower.includes("twitter")) return "twitter";
  return null;
}

export interface HeroInputProps {
  onSubmit?: (url: string) => void;
}

export function HeroInput({ onSubmit }: HeroInputProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const detected = detectPlatform(url);
      setPlatform(detected);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [url]);

  const handleBlur = useCallback(() => {
    const trimmed = url.trim();
    if (trimmed && trimmed.length > 3) {
      const detected = detectPlatform(trimmed);
      MarketingEvents.heroInputUrlEntered(trimmed.length, detected);
      if (detected) MarketingEvents.heroInputPlatformDetected(detected);
    }
  }, [url]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    MarketingEvents.heroInputSubmitted(trimmed, platform);
    onSubmit?.(trimmed);
    const encoded = encodeURIComponent(trimmed);
    startTransition(() => {
      router.push(`/signup?url=${encoded}`);
    });
  }, [url, submitting, platform, onSubmit, router, startTransition]);

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="social-url" className="sr-only">Paste your social profile URL</label>
          <input
            id="social-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => { MarketingEvents.heroInputFocused(); }}
            onBlur={handleBlur}
            placeholder="https://youtube.com/@creator"
            disabled={submitting}
            autoComplete="off"
            className="w-full rounded-xl border border-white/[0.08] bg-[var(--surface-root)] px-4 py-3 text-sm text-white placeholder-zinc-600 transition-all focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!url.trim() || submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50 sm:w-auto"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Generating..." : "Start"}
        </button>
      </div>

      {platform && (
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[var(--surface-root)]/50 px-3 py-2 w-fit">
          <span className={`text-xs font-medium ${PLATFORM_ICONS[platform]?.color ?? "text-zinc-400"}`}>
            {PLATFORM_ICONS[platform]?.label ?? "Website"}
          </span>
          <span className="text-[10px] text-zinc-600">detected</span>
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-600">
        <span>Works with:</span>
        {Object.entries(PLATFORM_ICONS).map(([key, icon]) => (
          <span key={key} className={icon.color}>{icon.label}</span>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Link href="/signup?persona=creator" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
          Start as Creator without a URL →
        </Link>
        <span className="text-zinc-700">·</span>
        <Link href="/signup?persona=partner" className="text-xs text-zinc-500 hover:text-zinc-300">
          Become a Partner
        </Link>
      </div>
    </form>
  );
}
