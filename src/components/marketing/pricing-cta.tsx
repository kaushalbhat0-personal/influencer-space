"use client";

import Link from "next/link";
import { CheckoutButton } from "./checkout-button";

interface PricingCTAProps {
  planId: string;
  amount: number;
  label: string;
  href: string;
  className?: string;
}

export function PricingCTA({ planId, amount, label, href, className }: PricingCTAProps) {
  if (amount === 0) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return <CheckoutButton planId={planId} amount={amount} label={label} className={className} />;
}
