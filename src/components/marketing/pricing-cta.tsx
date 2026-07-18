"use client";

import Link from "next/link";
import { SignupModal } from "./signup-modal";

interface PricingCTAProps {
  planId: string;
  label: string;
  className?: string;
}

export function PricingCTA({ planId, label, className }: PricingCTAProps) {
  if (planId === "growth") {
    return (
      <Link href="/contact" className={className}>
        {label}
      </Link>
    );
  }

  return (
    <SignupModal>
      <button className={className}>{label}</button>
    </SignupModal>
  );
}
