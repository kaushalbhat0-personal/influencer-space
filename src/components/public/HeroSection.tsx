"use client";

import { motion } from "framer-motion";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { GlassCard } from "@/components/ui/GlassCard";
import type { InfluencerDataType } from "@/config/influencer";

export function HeroSection({
  config,
}: {
  config: InfluencerDataType;
}) {
  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const socialPlatforms = [
    { platform: "instagram" as const, url: config.social.instagram },
    { platform: "youtube" as const, url: config.social.youtube },
    { platform: "twitter" as const, url: config.social.twitter },
    { platform: "tiktok" as const, url: config.social.tiktok },
  ].filter((s) => s.url.length > 0);

  return (
    <section className="relative min-h-[90vh] w-full overflow-hidden bg-black/95">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/90 to-amber-950/30" />
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl" />

      <div className="relative z-10 flex h-full min-h-[90vh] items-center justify-center px-4">
        <div className="max-w-4xl text-center">
          {config.profileImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-6 flex justify-center"
            >
              <img
                src={config.profileImage}
                alt={config.name}
                className="h-28 w-28 rounded-full border-2 border-amber-400/50 object-cover shadow-lg shadow-amber-400/20 sm:h-36 sm:w-36"
              />
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-4 text-4xl font-bold text-white sm:text-6xl lg:text-7xl"
          >
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              {config.name}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mx-auto mb-8 max-w-2xl px-2 text-base text-white/70 sm:text-xl"
          >
            {config.tagline}
          </motion.p>

          {socialPlatforms.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mb-10 flex flex-wrap justify-center gap-4"
            >
              {socialPlatforms.map((s) => (
                <SocialIcon key={s.platform} platform={s.platform} href={s.url} />
              ))}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <GlassCard
              withGoldBorder
              className="w-full cursor-pointer px-6 py-3 transition-all hover:shadow-amber-400/20 sm:w-auto sm:px-8 sm:py-4"
              onClick={scrollToProducts}
            >
              <span className="text-base font-semibold text-white sm:text-lg">
                Shop Now
              </span>
            </GlassCard>

            <GlassCard
              className="w-full cursor-pointer px-6 py-3 transition-all hover:shadow-white/10 sm:w-auto sm:px-8 sm:py-4"
              onClick={() => (window.location.href = "/contact")}
            >
              <span className="text-base font-semibold text-white/80 sm:text-lg">
                Contact
              </span>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
