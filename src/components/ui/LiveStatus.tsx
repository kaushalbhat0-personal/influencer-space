"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface LiveStatusData {
  isLive: boolean;
  title: string;
  platform: "youtube" | "twitch" | "instagram";
  url: string;
  viewerCount?: number;
}

export function LiveStatus() {
  const [status, setStatus] = useState<LiveStatusData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/live-status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // silent fail — banner just won't show
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!status?.isLive || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <Link
          href={status.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <div className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 via-red-500 to-red-600 px-4 py-2.5 text-white shadow-lg">
            <span className="flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider sm:text-sm">
              LIVE NOW
            </span>
            <span className="hidden truncate text-sm font-medium sm:block">
              {status.title}
            </span>
            {status.viewerCount && (
              <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-xs sm:block">
                {status.viewerCount.toLocaleString()} watching
              </span>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDismissed(true);
              }}
              className="ml-2 rounded-full p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
