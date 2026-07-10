"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

const videos = [
  {
    id: "1",
    title: "Home Workout for Postpartum Recovery 🏋️‍♀️",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "2",
    title: "Hormonal Balance Meal Prep Tips 🥗",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "3",
    title: "Strength Training at Home 💪",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "4",
    title: "Mind-Body Connection for Fitness 🧘‍♀️",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
];

export function VideoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextVideo = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const prevVideo = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  return (
    <section className="relative px-4 py-12 sm:py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black to-black/90" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-2 text-center text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Fitness Videos
            </span>
          </h2>
          <p className="mb-8 text-center text-sm text-white/50 sm:mb-12">
            Watch and learn with Sapna 📹
          </p>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard withGoldBorder className="aspect-video overflow-hidden p-0">
                <iframe
                  src={videos[currentIndex].embedUrl}
                  className="h-full w-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  title={videos[currentIndex].title}
                />
              </GlassCard>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={prevVideo}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/70 hover:scale-110 sm:left-4"
            aria-label="Previous video"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextVideo}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/70 hover:scale-110 sm:right-4"
            aria-label="Next video"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="mb-4 text-base font-medium text-white sm:text-lg">
            {videos[currentIndex].title}
          </p>
          <div className="flex justify-center gap-2">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "w-8 bg-amber-400"
                    : "w-2 bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Go to video ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
