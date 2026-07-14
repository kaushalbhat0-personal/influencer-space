"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SocialIcon } from "@/components/ui/SocialIcon";
import type { InfluencerDataType } from "@/config/influencer";

interface VideoHeroProps {
  config: InfluencerDataType;
}

export function VideoHero({ config }: VideoHeroProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const socialPlatforms = [
    { platform: "instagram" as const, url: config.social.instagram },
    { platform: "youtube" as const, url: config.social.youtube },
    { platform: "twitter" as const, url: config.social.twitter },
    { platform: "tiktok" as const, url: config.social.tiktok },
  ].filter((s) => s.url.length > 0);

  const scrollToJourney = () => {
    document.getElementById("journey")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {!videoError ? (
        <video
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          poster="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&h=1080&fit=crop"
          onError={() => setVideoError(true)}
        >
          <source
            src="https://res.cloudinary.com/demo/video/upload/v1/sample-video"
            type="video/mp4"
          />
        </video>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-s8ul-purple via-black to-s8ul-purple/40" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/30" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(45,27,105,0.2),_transparent_70%)]" />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-s8ul-cyan to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-s8ul-pink to-transparent opacity-50" />

      <div className="absolute top-6 left-6 z-10">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
          </div>
          <span className="font-gaming text-[10px] uppercase tracking-[0.15em] text-white/70">
            S8UL Esports
          </span>
        </div>
      </div>

      {!videoError && (
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute bottom-8 right-8 z-20 rounded-full bg-black/60 p-3 text-s8ul-cyan backdrop-blur-sm transition-all hover:bg-black/80 hover:shadow-[0_0_15px_rgba(0,245,255,0.3)]"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      )}

      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-4xl text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-4 flex items-center justify-center gap-2"
          >
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-s8ul-cyan opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-s8ul-cyan" />
            </span>
            <span className="font-gaming text-xs uppercase tracking-[0.2em] text-s8ul-cyan">
              Live on YouTube
            </span>
          </motion.div>

          {config.profileImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-6 flex justify-center"
            >
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-s8ul-cyan via-s8ul-pink to-s8ul-cyan opacity-75 blur-sm" />
                <img
                  src={config.profileImage}
                  alt={config.name}
                  className="relative h-24 w-24 rounded-full border-2 border-s8ul-cyan object-cover sm:h-28 sm:w-28"
                />
                <div className="absolute -bottom-1 -right-1 rounded-full bg-s8ul-pink p-1.5 shadow-[0_0_10px_rgba(255,0,229,0.5)]">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21.5 12.5c0 1.5-.8 2.8-2 3.4l-12 7c-1.2.7-2.5 0-2.5-1.5V6.6c0-1.5 1.3-2.2 2.5-1.5l12 7c1.2.6 2 1.9 2 3.4z" />
                  </svg>
                </div>
              </div>
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-1 font-gaming text-5xl font-bold text-white sm:text-6xl lg:text-7xl"
          >
            <span className="bg-gradient-to-r from-s8ul-cyan via-white to-s8ul-pink bg-clip-text text-transparent">
              Raj &apos;Snax&apos; Varma
            </span>
          </motion.h1>

          <p className="mb-1 text-lg text-white/70 sm:text-xl">
            {config.tagline}
          </p>

          <p className="mx-auto mb-2 max-w-xl text-sm text-white/40 sm:text-base">
            Hyderabad ki energy — global level ka game.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://youtube.com/@SnaxGaming"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-s8ul-pink to-s8ul-purple px-6 py-3 font-gaming text-xs font-bold uppercase tracking-wider text-white transition-all hover:shadow-[0_0_25px_rgba(255,0,229,0.5)]"
            >
              Subscribe
            </a>
            <a
              href="https://instagram.com/snaxgaming"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-s8ul-cyan/30 bg-s8ul-cyan/10 px-6 py-3 font-gaming text-xs font-bold uppercase tracking-wider text-s8ul-cyan backdrop-blur-sm transition-all hover:bg-s8ul-cyan/20 hover:shadow-[0_0_20px_rgba(0,245,255,0.3)]"
            >
              Follow on IG
            </a>
          </div>

          {socialPlatforms.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mb-8 mt-6 flex flex-wrap justify-center gap-4"
            >
              {socialPlatforms.map((s) => (
                <SocialIcon key={s.platform} platform={s.platform} href={s.url} />
              ))}
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            onClick={scrollToJourney}
            className="group inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-s8ul-cyan"
          >
            <span>Explore the Journey</span>
            <svg className="h-4 w-4 transition-transform group-hover:translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
            </svg>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
