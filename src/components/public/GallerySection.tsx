"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { TiltCard } from "@/components/ui/TiltCard";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description: string;
  category: string;
}

const defaultImages: GalleryImage[] = [
  {
    id: "1",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=600&fit=crop",
    title: "BGMI Pro Scrims",
    description: "Clutch round in ranked scrims",
    category: "bgmi",
  },
  {
    id: "2",
    url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&h=600&fit=crop",
    title: "Tournament Champions",
    description: "Lifting the trophy with S8UL",
    category: "tournament",
  },
  {
    id: "3",
    url: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=600&h=600&fit=crop",
    title: "S8UL Squad",
    description: "The team behind the empire",
    category: "s8ul",
  },
  {
    id: "4",
    url: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&h=600&fit=crop",
    title: "Stream Setup",
    description: "Behind the scenes of a live stream",
    category: "behind-scenes",
  },
  {
    id: "5",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=600&fit=crop",
    title: "BGMI Rank Push",
    description: "The Conqueror grind never stops",
    category: "bgmi",
  },
  {
    id: "6",
    url: "https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=600&h=600&fit=crop",
    title: "Esports Awards 2025",
    description: "Content Creator of the Year Nominee",
    category: "tournament",
  },
  {
    id: "7",
    url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop",
    title: "EWC Riyadh 2025",
    description: "Representing India at Esports World Cup",
    category: "s8ul",
  },
  {
    id: "8",
    url: "https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&h=600&fit=crop",
    title: "DreamHack Hyderabad 2022",
    description: "The day Snax joined S8UL",
    category: "tournament",
  },
];

interface GallerySectionProps {
  images?: GalleryImage[];
}

export function GallerySection({ images }: GallerySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const galleryImages = images && images.length > 0 ? images : defaultImages;

  const categories = [
    { key: null, label: "All" },
    { key: "bgmi", label: "BGMI" },
    { key: "tournament", label: "Tournaments" },
    { key: "s8ul", label: "S8UL" },
    { key: "behind-scenes", label: "Behind the Scenes" },
  ];

  const filtered = selectedCategory
    ? galleryImages.filter((img) => img.category === selectedCategory)
    : galleryImages;

  return (
    <section id="hall-of-fame" className="relative px-4 py-16 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 50%, rgba(0,245,255,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(255,0,229,0.08) 0%, transparent 50%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="mb-2 inline-block font-gaming text-xs uppercase tracking-[0.2em] text-s8ul-cyan">
            Highlights
          </span>
          <h2 className="font-gaming text-4xl font-bold text-white sm:text-5xl">
            Hall of Fame
          </h2>
          <p className="mt-4 text-white/50">
            The best moments from streams, tournaments, and the S8UL journey
          </p>
        </motion.div>

        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                "rounded-full px-4 py-2 font-gaming text-xs uppercase tracking-wider transition-all",
                selectedCategory === cat.key
                  ? "bg-s8ul-cyan text-black shadow-[0_0_15px_rgba(0,245,255,0.3)]"
                  : "border border-white/10 bg-white/5 text-white/60 hover:border-s8ul-cyan/30 hover:text-s8ul-cyan",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filtered.slice(0, 8).map((image, index) => {
              const isFeatured = index === 0;
              return (
                <motion.div
                  key={image.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  onClick={() => setSelectedImage(image)}
                  className={cn(
                    "cursor-pointer overflow-hidden rounded-xl",
                    isFeatured && "col-span-2 row-span-2",
                  )}
                >
                  <TiltCard
                    tiltDegree={5}
                    className="group relative h-full overflow-hidden"
                  >
                    <div
                      className={cn(
                        "overflow-hidden bg-white/5",
                        isFeatured ? "aspect-square sm:aspect-auto sm:h-full" : "aspect-square",
                      )}
                    >
                      <img
                        src={image.url}
                        alt={image.title}
                        className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <h3 className="text-sm font-bold text-white">
                          {image.title}
                        </h3>
                        <p className="text-xs text-white/60">
                          {image.description}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-s8ul-cyan backdrop-blur-sm">
                      {image.category}
                    </div>
                  </TiltCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-s8ul-cyan to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-s8ul-pink to-transparent" />
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="h-auto max-h-[70vh] w-full object-contain"
              />
              <div className="border-t border-s8ul-cyan/20 bg-black/90 p-4 backdrop-blur-sm">
                <h3 className="font-gaming text-lg font-bold text-white">
                  {selectedImage.title}
                </h3>
                <p className="text-sm text-white/50">
                  {selectedImage.description}
                </p>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="mt-2 font-gaming text-xs uppercase tracking-wider text-s8ul-cyan transition-colors hover:text-white"
                >
                  Close ✕
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
