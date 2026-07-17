"use client";

import { useState, useCallback } from "react";
import { createCheckoutOrder, verifyPayment } from "@/actions/checkout.actions";

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

export function BuyNowButton({
  productId,
  tenantId,
  productName,
  imageUrl,
  themeColor = "#00f5ff",
}: {
  productId: string;
  tenantId: string;
  productName: string;
  imageUrl?: string | null;
  themeColor?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  async function handleBuy() {
    setLoading(true);
    setToast(null);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      showToast("error", "Failed to load payment gateway. Please try again.");
      setLoading(false);
      return;
    }

    const result = await createCheckoutOrder(productId, tenantId);
    if (!result.success || !result.orderId) {
      showToast("error", result.error || "Failed to initiate payment");
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
      order_id: result.orderId,
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
        disabled={loading}
        className="mt-1.5 w-full rounded-lg bg-white/10 py-2 text-xs font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
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
