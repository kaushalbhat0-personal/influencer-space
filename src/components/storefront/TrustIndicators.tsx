"use client";

import { Award, Heart, Globe2, ShieldCheck, Users, Mail } from "lucide-react";
import type { ReactNode } from "react";

/**
 * RCCF-INTEGRATION-01 Phase 7 — Storefront Trust Indicators.
 * Renders ONLY creator-verified declared facts from the knowledge_completion
 * setting. Never AI-generated facts. When no facts exist, renders nothing.
 */
export function TrustIndicators({ declaredFacts }: { declaredFacts?: Record<string, unknown> | null }) {
  if (!declaredFacts || Object.keys(declaredFacts).length === 0) return null;

  const items: Array<{ icon: ReactNode; label: string; value: string }> = [];

  const push = (key: string, label: string, icon: ReactNode, fallback = "") => {
    const raw = declaredFacts[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      items.push({ icon, label, value: raw });
    } else if (Array.isArray(raw) && raw.length > 0) {
      items.push({ icon, label, value: (raw as string[]).join(", ") });
    } else if (raw === true && fallback) {
      items.push({ icon, label, value: fallback });
    }
  };

  push("trust_achievements", "Achievements", <Award className="h-4 w-4" />);
  push("brand_mission", "Mission", <Heart className="h-4 w-4" />);
  push("contact_languages", "Languages", <Globe2 className="h-4 w-4" />);
  push("refund_policy", "Refund policy", <ShieldCheck className="h-4 w-4" />);
  push("community_hub", "Community", <Users className="h-4 w-4" />);
  push("newsletter_enabled", "Newsletter", <Mail className="h-4 w-4" />, "Join the newsletter");

  if (items.length === 0) return null;

  return (
    <div
      className="border-y border-[var(--border,rgba(255,255,255,0.06))] bg-[var(--surface-card,#18181B)]/40 backdrop-blur-sm"
      data-testid="trust-indicators"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="mb-5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted,#71717A)]">Creator-verified</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-xl border border-[var(--border,rgba(255,255,255,0.06))] bg-[var(--surface-root,#09090b)]/40 px-4 py-3">
              <span className="mt-0.5 rounded-lg bg-[var(--brand-primary,#6366F1)]/10 p-1.5 text-[var(--brand-primary,#6366F1)]">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted,#71717A)]">{item.label}</p>
                <p className="mt-0.5 text-sm leading-snug text-[var(--text-secondary,#A1A1AA)] line-clamp-2">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
