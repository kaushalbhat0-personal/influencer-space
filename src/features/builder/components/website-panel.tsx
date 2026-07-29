"use client";

import { PanelRightClose } from "lucide-react";
import { ThemeCard } from "./theme-card";
import { CompletionBadge } from "./completion-badge";
import type { BuilderOverviewData } from "@/actions/builder-overview.actions";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  currentThemeId: string | null;
  planCode?: string | null;
  completionPct: number;
  onThemePreview: (themeId: string) => void;
  previewThemeId: string | null;
  onApplyTheme: () => void;
  overview?: BuilderOverviewData | null;
}

const SCORE_ITEMS: Array<{
  id: keyof BuilderOverviewData["contentCounts"] | "hero" | "seo" | "profile" | "domain" | "nav";
  label: string;
  href: string;
  check: (data: BuilderOverviewData) => boolean;
}> = [
  { id: "hero", label: "Hero Section", href: "/admin/settings", check: (d) => d.heroConfigured },
  { id: "products", label: "Products", href: "/admin/products", check: (d) => d.contentCounts.products > 0 },
  { id: "gallery", label: "Gallery", href: "/admin/gallery", check: (d) => d.contentCounts.gallery > 0 },
  { id: "testimonials", label: "Testimonials", href: "/admin/testimonials", check: (d) => d.contentCounts.testimonials > 0 },
  { id: "faq", label: "FAQ", href: "/admin/faq", check: (d) => d.contentCounts.faq > 0 },
  { id: "seo", label: "SEO", href: "/admin/seo", check: (d) => d.seoConfigured },
  { id: "profile", label: "Profile", href: "/admin/profile", check: (d) => d.profileComplete },
  { id: "domain", label: "Custom Domain", href: "/admin/settings/domain", check: (d) => !!d.tenant.customDomain },
  { id: "nav", label: "Navigation", href: "/admin/website/navigation", check: (d) => d.navigationConfigured },
];

export function WebsitePanel({
  collapsed, onToggle, currentThemeId, planCode, completionPct,
  onThemePreview, previewThemeId, onApplyTheme, overview,
}: Props) {
  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-2 py-2">
        <button onClick={onToggle} className="rounded p-1 text-zinc-600 hover:text-zinc-400" title="Expand Website panel">
          <PanelRightClose className="h-4 w-4 rotate-180" />
        </button>
        {overview && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-zinc-500">{completionPct}%</span>
            <div className="h-12 w-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="w-full rounded-full transition-all"
                style={{
                  height: `${completionPct}%`,
                  backgroundColor: completionPct >= 80 ? "#34d399" : completionPct >= 50 ? "#f59e0b" : "#525252",
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const passed = overview
    ? SCORE_ITEMS.filter((item) => item.check(overview)).length
    : 0;
  const total = SCORE_ITEMS.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Website</span>
        <button onClick={onToggle} className="rounded p-0.5 text-zinc-600 hover:text-zinc-400">
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        {/* Theme */}
        <div className="rounded-lg border border-white/5 bg-zinc-900/50">
          <div className="px-2.5 py-1.5 border-b border-white/5">
            <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Theme</p>
          </div>
          <div className="p-2">
            <ThemeCard
              currentThemeId={currentThemeId}
              planCode={planCode}
              onThemePreview={onThemePreview}
              previewThemeId={previewThemeId}
              onApplyTheme={onApplyTheme}
            />
          </div>
        </div>

        {/* Blueprint + Completion */}
        <div className="rounded-lg border border-white/5 bg-zinc-900/50">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/5">
            <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Progress</p>
            <CompletionBadge pct={completionPct} large />
          </div>
          <div className="p-2.5 text-[10px] text-zinc-400 space-y-1">
            {/* Blueprint info if available — currently not loaded from overview. Show placeholder. */}
            <p>Template: {overview?.blueprint?.name ?? "Creator"}</p>
          </div>
        </div>

        {/* Live Score */}
        {overview && (
          <div className="rounded-lg border border-white/5 bg-zinc-900/50">
            <div className="px-2.5 py-1.5 border-b border-white/5 flex items-center justify-between">
              <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
                Live Score
              </p>
              <span className={cn(
                "text-[10px] font-bold",
                completionPct >= 80 ? "text-emerald-400" : completionPct >= 50 ? "text-amber-400" : "text-zinc-500"
              )}>
                {passed}/{total}
              </span>
            </div>
            <div className="p-1.5 space-y-0.5">
              {SCORE_ITEMS.map((item) => {
                const ok = item.check(overview);
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] transition-colors",
                      ok
                        ? "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                        : "text-amber-500/70 hover:bg-amber-500/5 hover:text-amber-400"
                    )}
                  >
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      ok ? "bg-emerald-500" : "bg-amber-500"
                    )} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {ok ? (
                      <span className="text-[8px] text-emerald-600 shrink-0">Done</span>
                    ) : (
                      <span className="text-[8px] text-amber-600 shrink-0">Missing</span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="rounded-lg border border-white/5 bg-zinc-900/50">
          <div className="px-2.5 py-1.5 border-b border-white/5">
            <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Quick Actions</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {[
              { label: "Edit Products", href: "/admin/products" },
              { label: "Edit Gallery", href: "/admin/gallery" },
              { label: "Edit Hero", href: "/admin/settings" },
              { label: "Edit SEO", href: "/admin/seo" },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              >
                <span className="flex-1 truncate">{action.label}</span>
                <span className="text-zinc-700 shrink-0">&rarr;</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
