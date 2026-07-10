"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { incrementAffiliateClicks } from "@/actions/affiliate.actions";
import type { AffiliateData } from "@/services/affiliate.service";

interface AffiliateGridProps {
  affiliates: AffiliateData[];
}

export function AffiliateGrid({ affiliates }: AffiliateGridProps) {
  const handleClick = async (id: string, url: string) => {
    try {
      await incrementAffiliateClicks(id);
    } catch (error) {
      console.error("Failed to increment clicks:", error);
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (affiliates.length === 0) {
    return (
      <div className="text-center text-white/60">
        <p className="text-xl">No affiliate products yet.</p>
        <p className="text-sm">Coming soon!</p>
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
          <GlassCard
            withGoldBorder
            className="group w-full cursor-pointer transition-all hover:shadow-amber-400/20"
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
              <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-amber-500/20 px-4 py-2 text-sm text-amber-300 sm:w-auto">
                <span>Visit Store</span>
                <span className="text-xl">→</span>
              </div>
              <p className="mt-2 text-xs text-white/30">
                {affiliate.clicks} clicks
              </p>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
