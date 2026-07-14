"use client";

import { motion } from "framer-motion";

interface MobileSidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileSidebarToggle({ isOpen, onToggle }: MobileSidebarToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.9 }}
      className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-s8ul-cyan/20 to-s8ul-purple/20 text-s8ul-cyan shadow-lg shadow-s8ul-cyan/10 backdrop-blur-xl lg:hidden"
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </motion.button>
  );
}
