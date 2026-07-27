"use client";

import { useState, useEffect, type JSX } from "react";
import { Home, ShoppingBag, Image as ImageIcon, User, Mail } from "lucide-react";

const NAV_ICON: Record<string, JSX.Element> = {
  hero: <Home className="h-4 w-4" />,
  products: <ShoppingBag className="h-4 w-4" />,
  gallery: <ImageIcon className="h-4 w-4" />,
  about: <User className="h-4 w-4" />,
  contact: <Mail className="h-4 w-4" />,
};

interface NavSection {
  id: string;
  label: string;
  enabled: boolean;
}

export function StorefrontNav({ sections }: { sections: NavSection[] }) {
  const [activeSection, setActiveSection] = useState("");
  const visibleSections = sections.filter((s) => s.enabled);

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

    for (const s of visibleSections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [visibleSections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Desktop sticky nav */}
      <nav className="sticky top-0 z-40 hidden md:block border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-1 px-4 py-2">
          {visibleSections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSection === s.id ? "text-white bg-white/10" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl">
        <div className="flex items-center justify-around py-2 px-2">
          {visibleSections.slice(0, 5).map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 min-w-[48px] min-h-[44px] justify-center transition-colors ${
                activeSection === s.id ? "text-indigo-400" : "text-zinc-500"
              }`}
              aria-label={s.label}
            >
              {NAV_ICON[s.id]}
              <span className="text-[10px] font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
