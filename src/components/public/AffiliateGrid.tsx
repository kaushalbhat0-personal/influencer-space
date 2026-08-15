"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { TiltCard } from "@/components/ui/TiltCard";

// RCCF-65.2: the storefront grid renders the aggregate subset (id, title, url,
// imageUrl, clicks). Full admin rows (AffiliateData) are assignable to it.
export interface AffiliateGridItem {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  clicks: number;
}

interface AffiliateGridProps {
  affiliates: AffiliateGridItem[];
  /** RCCF-67.2: in preview the grid is inert — no click tracking, no window.open. */
  previewMode?: boolean;
}

export function AffiliateGrid({ affiliates, previewMode = false }: AffiliateGridProps) {
  const handleClick = async (id: string, url: string) => {
    // RCCF-67.2 (P1): a live preview must never initiate commerce mutations.
    if (previewMode) return;
    try {
      // RCCF-65.2: lazy-load the server action so importing this client
      // component never pulls the server-side storage/supabase chain into a
      // node test environment at module-load time.
      const { incrementAffiliateClicks } = await import("@/actions/affiliate.actions");
      await incrementAffiliateClicks(id);
    } catch (error) {
      console.error("Failed to increment clicks:", error);
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (affiliates.length === 0) {
    return (
      <div className="text-center text-white/60">
        <p className="font-display text-xl">Gear List Coming Soon</p>
        <p className="mt-1 text-sm">Curating the best peripherals for you</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {affiliates.map((affiliate, index) => (
        <motion.div
          key={affiliate.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08, duration: 0.5 }}
        >
          <TiltCard tiltDegree={4} className="h-full">
          <GlassCard
            className="group w-full cursor-pointer border-neon-purple/30 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
            onClick={() => handleClick(affiliate.id, affiliate.url)}
          >
            <div className="flex flex-col items-center text-center">
              {affiliate.imageUrl && (
                <div className="mb-4 h-32 w-full overflow-hidden rounded-xl bg-white/5">
                  <img
                    src={affiliate.imageUrl}
                    alt={affiliate.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <h3 className="text-base font-semibold text-white sm:text-lg">
                {affiliate.title}
              </h3>
              <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-neon-purple/30 bg-neon-purple/10 px-4 py-2 font-display text-xs uppercase tracking-wider text-neon-purple backdrop-blur-sm sm:w-auto">
                <span>Get Gear</span>
                <span className="text-xl">→</span>
              </div>
              <p className="mt-2 text-xs text-white/30">
                {affiliate.clicks} clicks
              </p>
            </div>
          </GlassCard>
          </TiltCard>
        </motion.div>
      ))}
    </div>
  );
}
