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
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId, amount }),
      });

      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!res.ok) {
        alert("Failed to create order. Please try again.");
        setLoading(false);
        return;
      }

      const order = await res.json();

      // Load Razorpay checkout script
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
        document.body.appendChild(script);
      });

      // Open Razorpay modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "CreatorStore",
        description: `${planId} plan — Agency Seat`,
        order_id: order.id,
        handler: function (_response: RazorpayPaymentResponse) {
          void _response;
          // Webhook handles provisioning — no client-side action needed
          window.location.href = "/agency";
        },
        prefill: {
          email: "",
          contact: "",
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
