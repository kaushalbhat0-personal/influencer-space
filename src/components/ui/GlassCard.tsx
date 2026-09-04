"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  withGoldBorder?: boolean;
}

export function GlassCard({
  children,
  className,
  withGoldBorder = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      suppressHydrationWarning
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "rounded-[var(--radius-card-elevated)] bg-white/10 p-4 backdrop-blur-md backdrop-saturate-150 sm:p-6",
        "shadow-[var(--shadow-card)]",
        "border border-white/20",
        withGoldBorder && "border-amber-400/50 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
