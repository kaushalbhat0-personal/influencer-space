"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TrustCTA } from "@/lib/marketing/trust/types";

interface StickyCTAProps {
  readonly cta: TrustCTA;
  readonly secondaryCta?: TrustCTA;
  readonly threshold?: number;
}

export function StickyCTA({
  cta,
  secondaryCta,
  threshold = 300,
}: StickyCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.06] bg-[var(--surface-root)]/95 backdrop-blur-xl transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <p className="hidden text-sm text-zinc-400 sm:block">
          {cta.description ?? "Start building your creator business free."}
        </p>
        <div className="flex w-full gap-3 sm:w-auto">
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="flex-1 rounded-lg border border-white/[0.06] px-4 py-2 text-center text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 sm:flex-initial"
            >
              {secondaryCta.label}
            </Link>
          )}
          <Link
            href={cta.href}
            className="btn-primary flex-1 text-center text-sm sm:flex-initial"
          >
            {cta.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
