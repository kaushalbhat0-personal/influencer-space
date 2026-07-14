"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type InstagramPost = {
  id: string;
  media_url: string;
  caption: string;
  permalink: string;
  media_type: string;
};

const demoPosts: InstagramPost[] = [
  {
    id: "1",
    media_url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop",
    caption: "S8UL vibes only! 🔥",
    permalink: "#",
    media_type: "IMAGE",
  },
  {
    id: "2",
    media_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop",
    caption: "Another day, another win 🏆",
    permalink: "#",
    media_type: "IMAGE",
  },
  {
    id: "3",
    media_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
    caption: "Grind never stops 💯",
    permalink: "#",
    media_type: "IMAGE",
  },
  {
    id: "4",
    media_url: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=400&h=400&fit=crop",
    caption: "Squad goals with S8UL 🎯",
    permalink: "#",
    media_type: "IMAGE",
  },
  {
    id: "5",
    media_url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop",
    caption: "Grinding everyday 💪",
    permalink: "#",
    media_type: "IMAGE",
  },
  {
    id: "6",
    media_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
    caption: "Hyderabadi energy 🇮🇳",
    permalink: "#",
    media_type: "IMAGE",
  },
];

export function InstagramFeed({
  instagramUrl,
}: {
  instagramUrl: string;
}) {
  const [posts, setPosts] = useState<InstagramPost[]>(demoPosts);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchInstagram() {
      try {
        const res = await fetch(
          `/api/instagram?url=${encodeURIComponent(instagramUrl)}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.posts?.length > 0) {
            setPosts(data.posts.slice(0, 6));
          }
        }
      } catch {
        // fallback to demo
      }
    }

    fetchInstagram();
  }, [instagramUrl]);

  return (
    <section className="relative px-4 py-12 sm:py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-2 text-center text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-transparent">
              Latest from Instagram
            </span>
          </h2>
          <p className="mb-8 text-center text-sm text-white/50 sm:mb-12">
            Follow{" "}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-s8ul-cyan hover:underline"
            >
               {instagramUrl.split("/").pop() || "snaxgaming"}
            </a>{" "}
            for daily gaming content 🎮
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {posts.map((post, index) => (
            <motion.a
              key={post.id}
              href={post.permalink !== "#" ? post.permalink : instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              whileHover={{ scale: 1.05, y: -6 }}
              whileTap={{ scale: 0.95 }}
              className="group relative overflow-hidden rounded-xl"
            >
              <div className="aspect-square w-full overflow-hidden bg-white/5">
                {!loaded && index < 3 && (
                  <div className="absolute inset-0 animate-pulse bg-white/5" />
                )}
                <img
                  src={post.media_url}
                  alt={post.caption}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  onLoad={() => setLoaded(true)}
                />
                <div className="absolute bottom-2 right-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <svg
                    className="h-5 w-5 text-white drop-shadow-lg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
