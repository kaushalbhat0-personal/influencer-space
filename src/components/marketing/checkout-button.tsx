"use client";

import { useState } from "react";

interface CheckoutButtonProps {
  planId: string;
  amount: number;
  label: string;
  className?: string;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export function CheckoutButton({ planId, amount, label, className }: CheckoutButtonProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  if (showEmail) {
    return (
      <div className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-s8ul-cyan/50 focus:outline-none"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && email && handleCheckout()}
        />
        <button
          onClick={handleCheckout}
          disabled={loading || !email}
          className={className}
        >
          {loading ? "Processing..." : "Continue to Payment"}
        </button>
      </div>
    );
  }

  async function handleCheckout() {
    if (!email) {
      setShowEmail(true);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, amount, email }),
      });

      if (!res.ok) {
        alert("Failed to create order. Please try again.");
        setLoading(false);
        return;
      }

      const order = await res.json();

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
        document.body.appendChild(script);
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "CreatorStore",
        description: `${planId} plan — Agency Seat`,
        order_id: order.id,
        prefill: { email, contact: "" },
        handler: function (_response: RazorpayPaymentResponse) {
          void _response;
          window.location.href = "/agency";
        },
        theme: { color: "#00f5ff" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function () {
        setLoading(false);
      });
      rzp.open();
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button onClick={handleCheckout} disabled={loading} className={className}>
      {loading ? "Processing..." : label}
    </button>
  );
}
