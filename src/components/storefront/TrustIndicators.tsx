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
      className="border-t border-white/5 bg-white/[0.02]"
      data-testid="trust-indicators"
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <span className="mt-0.5 rounded-lg bg-s8ul-cyan/10 p-1.5 text-s8ul-cyan">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{item.label}</p>
                <p className="mt-0.5 text-sm text-zinc-300">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
