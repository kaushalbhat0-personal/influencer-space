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
  const visibleSections = sections.filter((s) => s.visible);

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
    if (item.type === "external") {
      window.open(item.href, item.target || "_blank", "noopener noreferrer");
      return;
    }
    if (item.type === "anchor") {
      const targetId = item.href.replace("#", "");
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <>
      {/* Desktop sticky nav */}
      <nav className="sticky top-0 z-40 hidden md:block border-b border-[var(--border,rgba(255,255,255,0.06))] bg-[var(--surface-root,#09090b)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-1 px-4 py-2">
          {visibleSections.map((s) => {
            const isExternal = s.type === "external";
            const anchorId = s.type === "anchor" ? s.href.replace("#", "") : "";
            return (
              <a
                key={s.id}
                href={isExternal ? s.href : undefined}
                target={isExternal ? s.target || "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={(e) => {
                  if (!isExternal) { e.preventDefault(); handleClick(s); }
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  !isExternal && activeSection === anchorId ? "bg-[var(--brand-primary,#6366F1)]/10 text-[var(--text-primary,#FAFAFA)]" : "text-[var(--text-muted,#71717A)] hover:text-[var(--text-secondary,#D4D4D8)]"
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[var(--border,rgba(255,255,255,0.06))] bg-[var(--surface-root,#09090b)]/90 backdrop-blur-xl">
        <div className="flex items-center justify-around py-2 px-2">
          {visibleSections.slice(0, 5).map((s) => {
            const isExternal = s.type === "external";
            return (
              <a
                key={s.id}
                href={isExternal ? s.href : undefined}
                target={isExternal ? s.target || "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={(e) => {
                  if (!isExternal) { e.preventDefault(); handleClick(s); }
                }}
                className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 min-w-[48px] min-h-[44px] justify-center transition-colors"
                aria-label={s.label}
              >
                {NAV_ICON[s.id] || <Link2 className="h-4 w-4" />}
                <span className="text-[10px] font-medium">{s.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}

