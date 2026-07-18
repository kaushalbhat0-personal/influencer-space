"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SignupForm } from "./signup-form";

interface SignupModalProps {
  children: React.ReactNode;
}

export function SignupModal({ children }: SignupModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </span>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="mb-6 text-center">
                <h2 className="text-lg font-bold text-white">Start Your Free Tier</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  One free website builder. No credit card required.
                </p>
              </div>

              <SignupForm />

              <p className="mt-4 text-center text-[11px] text-zinc-600">
                Already have an account?{" "}
                <a href="/admin/login" className="text-s8ul-cyan hover:underline">
                  Sign in
                </a>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
