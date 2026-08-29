"use client";

import { useState, useEffect, type JSX } from "react";
import { Home, ShoppingBag, Image as ImageIcon, User, Mail, ExternalLink, Gamepad2, MessageSquare, HelpCircle, Trophy, Rss, Link2 } from "lucide-react";

const NAV_ICON: Record<string, JSX.Element> = {
  hero: <Home className="h-4 w-4" />,
  about: <User className="h-4 w-4" />,
  products: <ShoppingBag className="h-4 w-4" />,
  gallery: <ImageIcon className="h-4 w-4" />,
  links: <Link2 className="h-4 w-4" />,
  contact: <Mail className="h-4 w-4" />,
  testimonials: <MessageSquare className="h-4 w-4" />,
  faq: <HelpCircle className="h-4 w-4" />,
  timeline: <Trophy className="h-4 w-4" />,
  games: <Gamepad2 className="h-4 w-4" />,
  contentFeed: <Rss className="h-4 w-4" />,
};

interface NavItem {
  id: string;
  label: string;
  href: string;
  type: "page" | "anchor" | "external";
  visible: boolean;
  target?: "_self" | "_blank";
  icon?: string | null;
}

export function StorefrontNav({ sections }: { sections: NavItem[] }) {
  const [activeSection, setActiveSection] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleSections = sections.filter((s) => s.visible);
  // RCCF-07C: derive primary vs overflow from reconciliation, not hardcode.
  // Max 5 touch targets comfortably fits 390px; beyond that use More affordance.
  const MAX_PRIMARY = 5;
  const needsOverflow = visibleSections.length > MAX_PRIMARY;
  const PRIMARY_COUNT = needsOverflow ? MAX_PRIMARY - 1 : MAX_PRIMARY;
  const primarySections = visibleSections.slice(0, PRIMARY_COUNT);
  const overflowSections = needsOverflow ? visibleSections.slice(PRIMARY_COUNT) : [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.3, rootMargin: "-80px 0px 0px 0px" },
    );

    const anchorItems = visibleSections.filter((s) => s.type === "anchor");
    for (const s of anchorItems) {
      const targetId = s.href.replace("#", "");
      const el = document.getElementById(targetId);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [visibleSections]);

  function handleClick(item: NavItem) {
    setMoreOpen(false);
    if (item.type === "external") {
      window.open(item.href, item.target || "_blank", "noopener noreferrer");
      return;
    }
    if (item.type === "anchor") {
      const targetId = item.href.replace("#", "");
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
    if (item.type === "page") {
      window.location.href = item.href;
    }
  }
  return (
    <>
      {/* Desktop sticky nav */}
      <nav className="sticky top-0 z-40 hidden md:block border-b border-[var(--border,rgba(255,255,255,0.06))] bg-[var(--surface-root,#09090b)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-1 px-4 py-2">
          {visibleSections.map((s) => {
            const isExternal = s.type === "external";
            const isAnchor = s.type === "anchor";
            const anchorId = isAnchor ? s.href.replace("#", "") : "";
            return (
              <a
                key={s.id}
                href={isAnchor ? undefined : s.href}
                target={isExternal ? s.target || "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={(e) => {
                  if (isAnchor) { e.preventDefault(); handleClick(s); }
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  !isAnchor && activeSection === anchorId ? "bg-[var(--brand-primary,#6366F1)]/10 text-[var(--text-primary,#FAFAFA)]" : "text-[var(--text-muted,#71717A)] hover:text-[var(--text-secondary,#D4D4D8)]"
                }`}
              >
                {NAV_ICON[s.id] || null}
                {s.label}
                {isExternal && <ExternalLink className="h-3 w-3 opacity-50" />}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom nav — RCCF-07C: fixed, derived from canonical navigation, More affordance, safe-area */}
      <nav aria-label="Mobile navigation" className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[var(--border,rgba(255,255,255,0.06))] bg-[var(--surface-root,#09090b)]/95 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {moreOpen && overflowSections.length > 0 && (
          <div className="border-b border-[var(--border,rgba(255,255,255,0.06))] bg-[var(--surface-root,#09090b)] px-2 py-2">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {overflowSections.map((s) => {
                const isExternal = s.type === "external";
                const isAnchor = s.type === "anchor";
                const anchorId = isAnchor ? s.href.replace("#", "") : "";
                const isActive = isAnchor && activeSection === anchorId;
                return (
                  <a
                    key={s.id}
                    href={!isAnchor ? s.href : undefined}
                    target={isExternal ? s.target || "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      if (isAnchor) { e.preventDefault(); handleClick(s); }
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus,#6366F1)] ${isActive ? "bg-[var(--brand-primary,#6366F1)] text-white" : "bg-[var(--surface-card,#18181B)] text-[var(--text-secondary,#A1A1AA)] hover:text-[var(--text-primary,#FAFAFA)]"}`}
                  >
                    {NAV_ICON[s.id] || <Link2 className="h-3.5 w-3.5" />}
                    {s.label}
                    {isExternal && <ExternalLink className="h-3 w-3 opacity-50" />}
                  </a>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-center justify-around py-1 px-1 h-[var(--mobile-nav-height,3.75rem)]">
          {primarySections.map((s) => {
            const isExternal = s.type === "external";
            const isAnchor = s.type === "anchor";
            const anchorId = isAnchor ? s.href.replace("#", "") : "";
            const isActive = isAnchor && activeSection === anchorId;
            return (
              <a
                key={s.id}
                href={!isAnchor ? s.href : undefined}
                target={isExternal ? s.target || "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={(e) => {
                  if (isAnchor) { e.preventDefault(); handleClick(s); }
                }}
                aria-label={s.label}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 min-w-[44px] min-h-[44px] justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus,#6366F1)] ${isActive ? "text-[var(--brand-primary,#6366F1)]" : "text-[var(--text-muted,#71717A)] hover:text-[var(--text-secondary,#D4D4D8)]"}`}
              >
                {NAV_ICON[s.id] || <Link2 className="h-4 w-4" />}
                <span className="text-[10px] font-medium leading-tight">{s.label}</span>
              </a>
            );
          })}
          {needsOverflow && (
            <button
              type="button"
              aria-label="More navigation options"
              aria-expanded={moreOpen}
              aria-haspopup="true"
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 min-w-[44px] min-h-[44px] justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus,#6366F1)] ${moreOpen ? "text-[var(--brand-primary,#6366F1)]" : "text-[var(--text-muted,#71717A)] hover:text-[var(--text-secondary,#D4D4D8)]"}`}
            >
              <span className="h-4 w-4 flex items-center justify-center text-[10px] font-bold leading-none border rounded-sm border-current">{moreOpen ? "×" : "…"}</span>
              <span className="text-[10px] font-medium leading-tight">More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

