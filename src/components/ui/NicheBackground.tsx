"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { nicheIcons } from "@/lib/niche-icons";
import type { Niche } from "@/lib/niche-icons";

type FloatingIcon = {
  id: number;
  path: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  rotate: number;
};

const ICON_COUNT = 8;

function generateIcons(paths: string[], seed: number): FloatingIcon[] {
  const icons: FloatingIcon[] = [];
  for (let i = 0; i < ICON_COUNT; i++) {
    const hash = (seed * (i + 1) * 2654435761) % 2 ** 32;
    icons.push({
      id: i,
      path: paths[i % paths.length],
      x: 5 + ((hash * 13) % 90),
      y: 5 + ((hash * 17) % 90),
      size: 16 + ((hash * 7) % 16),
      duration: 15 + ((hash * 3) % 10),
      delay: (hash * 0.618) % 5,
      rotate: (hash % 360) - 180,
    });
  }
  return icons;
}

export function NicheBackground({ niche = "fitness" }: { niche?: string }) {
  const pathname = usePathname();

  const isAdmin = pathname?.startsWith("/admin");

  const icons = useMemo(() => {
    const key = (niche as Niche) in nicheIcons ? (niche as Niche) : "fitness";
    const paths = nicheIcons[key];
    return generateIcons(paths, key.length + paths.length);
  }, [niche]);

  if (isAdmin) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {icons.map((icon) => (
        <motion.div
          key={icon.id}
          className="absolute"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            width: icon.size,
            height: icon.size,
            willChange: "transform",
          }}
          initial={{ opacity: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [0.04, 0.08, 0.04],
            y: [0, -30, 0],
            rotate: [0, icon.rotate, 0],
          }}
          transition={{
            duration: icon.duration,
            delay: icon.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-full h-full text-white"
          >
            <path d={icon.path} />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
