"use client";

import { useState, useCallback } from "react";
import { createCheckout, verifyPayment } from "@/actions/checkout.actions";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  prefill?: { email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: () => void) => void;
}

async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window !== "undefined" && typeof window.Razorpay !== "undefined") {
    return true;
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BuyNowButton({
  productId,
  productName,
  imageUrl,
  themeColor = "#00f5ff",
  previewMode = false,
}: {
  productId: string;
  productName: string;
  imageUrl?: string | null;
  themeColor?: string;
  /** RCCF-LAUNCH-TRACK-06 (Phase 9): in the Builder preview this button is
   * inert — it never calls createCheckout (no Prisma rows, no Razorpay). */
  previewMode?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // RCCF-67.2 (P1): the buyer email is collected here, before checkout, so the
  // stored order always carries the buyer's real email (guest lookup, customer
  // grouping and fulfillment access depend on it).
  const [buyerEmail, setBuyerEmail] = useState("");
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pin, setPin] = useState("");

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  async function runCheckout(email: string, shipping?: { name: string; phone: string; line1: string; city: string; state: string; pin: string; country: string }) {
    setLoading(true);
    setToast(null);

    const result = await createCheckout(productId, email, undefined, shipping, 1);

    // VALIDATION-01 V-028: free products / 100%-off coupons are fulfilled
    // without Razorpay — show success directly.
    if (result.free) {
      showToast("success", "It's on us — enjoy your free purchase!");
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch {}
      setLoading(false);
      return;
    }

    // RCCF-IMPLEMENTATION-74: DIRECT_CREATOR — redirect to the hosted checkout
    // on the creator's own payment account (CreatorStore is not in the money flow).
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }

    if (!result.success || !result.razorpayOrderId) {
      showToast("error", result.error || "Failed to initiate payment");
      setLoading(false);
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      showToast("error", "Failed to load payment gateway. Please try again.");
      setLoading(false);
      return;
    }

    const options: RazorpayOptions = {
      key: result.keyId!,
      amount: result.amount!,
      currency: result.currency!,
      name: productName,
      description: `Purchase from ${productName}`,
      image: imageUrl || undefined,
      order_id: result.razorpayOrderId,
      prefill: { email },
      handler: async function (response) {
        const vr = await verifyPayment(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature,
        );

        if (vr.success) {
          showToast("success", "Payment successful! Thank you for your purchase.");
          try {
            const confetti = (await import("canvas-confetti")).default;
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          } catch {}
        } else {
          showToast("error", vr.error || "Payment verification failed");
        }

        setLoading(false);
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
      theme: { color: themeColor },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  function handleBuy() {
    if (previewMode) return; // never initiate production checkout in preview
    setAwaitingEmail(true);
  }

  const shippingValid = buyerName.trim().length >= 2 && /^\d{10}$/.test(phone) && line1.trim().length >= 5 && city.trim().length >= 2 && stateVal.trim().length >= 2 && /^\d{6}$/.test(pin) && EMAIL_RE.test(buyerEmail.trim());
  if (awaitingEmail && !previewMode) {
    return (
      <>
        {toast && (
          <div
            className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
              toast.type === "success"
                ? "bg-emerald-500/90 text-black"
                : "bg-red-500/90 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}
        <div className="mt-1.5 w-full space-y-2">
          <p className="text-center text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted,#71717A)]">
            Shipping details &amp; receipt
          </p>
          <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit phone" className="w-full rounded-lg border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <input type="text" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Address line 1" className="w-full rounded-lg border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="rounded-lg border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
            <input type="text" value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="State" className="rounded-lg border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          </div>
          <input type="text" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit PIN" className="w-full rounded-lg border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <button
            onClick={() => void runCheckout(buyerEmail.trim(), { name: buyerName.trim(), phone: phone.trim(), line1: line1.trim(), city: city.trim(), state: stateVal.trim(), pin: pin.trim(), country: "IN" })}
            disabled={loading || !shippingValid}
            className="w-full rounded-lg bg-[var(--button-primary-bg,#00f5ff)] py-2 text-xs font-semibold text-[var(--button-primary-fg,#09090b)] transition-all hover:bg-[var(--button-primary-hover,#00d9f2)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Processing…" : "Continue to payment"}
          </button>
          <button onClick={() => setAwaitingEmail(false)} disabled={loading} className="w-full py-1 text-center text-[11px] text-[var(--text-muted,#71717A)] hover:text-[var(--text-secondary,#A1A1AA)]">
            Cancel
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-emerald-500/90 text-black"
              : "bg-red-500/90 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <button
        onClick={handleBuy}
        disabled={loading || previewMode}
        title={previewMode ? "Checkout available on your live website" : undefined}
        className="mt-1.5 w-full rounded-lg bg-[var(--button-primary-bg,#00f5ff)] py-2 text-xs font-semibold text-[var(--button-primary-fg,#09090b)] transition-all hover:bg-[var(--button-primary-hover,#00d9f2)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {previewMode ? (
          "Checkout available on your live website"
        ) : loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          "Buy Now"
        )}
      </button>
    </>
  );
}
