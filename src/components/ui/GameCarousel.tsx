"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Game {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  genre?: string;
}

const defaultGames: Game[] = [
  { id: "bgmi", name: "BGMI", logoUrl: "🏆", description: "Battlegrounds Mobile India — 100 players, one winner.", genre: "Battle Royale" },
  { id: "pubg", name: "PUBG Mobile", logoUrl: "🪂", description: "The original battle royale experience.", genre: "Battle Royale" },
  { id: "gta5", name: "GTA V", logoUrl: "💵", description: "Los Santos never sleeps. Roleplay, heists, and chaos.", genre: "Open World / RP" },
  { id: "valo", name: "Valorant", logoUrl: "🔫", description: "Tactical shooter with agents and abilities.", genre: "Tactical FPS" },
  { id: "minecraft", name: "Minecraft", logoUrl: "⛏️", description: "Building, surviving, and creating entire worlds.", genre: "Sandbox / Survival" },
  { id: "codm", name: "Call of Duty Mobile", logoUrl: "🎯", description: "Console-quality FPS on mobile.", genre: "FPS" },
];

interface GameCarouselProps {
  games?: Game[];
}

export function GameCarousel({ games }: GameCarouselProps) {
  const featuredGames = games && games.length > 0 ? games : defaultGames;
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const paginate = useCallback(
    (dir: number) => {
      setDirection(dir);
      setCurrent((prev) => (prev + dir + featuredGames.length) % featuredGames.length);
    },
    [featuredGames.length],
  );

  useEffect(() => {
    const interval = setInterval(() => paginate(1), 5000);
    return () => clearInterval(interval);
  }, [paginate]);

  const game = featuredGames[current];

  return (
    <section className="relative px-4 py-16 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/95 to-black/90" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="mb-2 inline-block font-gaming text-xs uppercase tracking-[0.2em] text-neon-green">
            Game Library
          </span>
          <h2 className="font-gaming text-4xl font-bold text-white sm:text-5xl">
            Games I Play
          </h2>
          <p className="mt-4 text-white/50">
            From battle royales to open-world adventures
          </p>
        </motion.div>

        <div className="relative mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={game.id}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 200 : -200 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -200 : 200 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="p-8 sm:p-12"
              >
                <div className="flex flex-col items-center text-center">
                  <span className="mb-4 text-6xl">{game.logoUrl || "🎮"}</span>
                  <h3 className="mb-2 font-gaming text-2xl font-bold text-white sm:text-3xl">
                    {game.name}
                  </h3>
                  {game.genre && (
                    <span className="mb-4 inline-block rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1 font-gaming text-[10px] uppercase tracking-wider text-neon-cyan">
                      {game.genre}
                    </span>
                  )}
                  <p className="max-w-md text-sm text-white/50">
                    {game.description || "Featured game"}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => paginate(-1)}
              className="rounded-full border border-white/10 bg-white/5 p-2.5 text-white/60 transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
              aria-label="Previous game"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex gap-2">
              {featuredGames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > current ? 1 : -1);
                    setCurrent(i);
                  }}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === current
                      ? "w-6 bg-neon-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]"
                      : "bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to game ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => paginate(1)}
              className="rounded-full border border-white/10 bg-white/5 p-2.5 text-white/60 transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
              aria-label="Next game"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
