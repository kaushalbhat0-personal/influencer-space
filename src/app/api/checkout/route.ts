import { NextResponse } from "next/server";
import { getRazorpayInstance } from "@/lib/razorpay";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PLANS } from "@/modules/billing/domain/plan-catalog";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const planId: string = body.planId;
    const amount: number = body.amount;
    const guestEmail: string | undefined = body.email;

    if (!planId || !amount) {
      return NextResponse.json({ error: "planId and amount are required" }, { status: 400 });
    }

    // Resolve plan from v2 catalog (falls back to legacy map)
    const plan = PLANS.find((p) => p.code === planId);
    if (!plan) {
      return NextResponse.json({ error: `Unknown plan: ${planId}` }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    if (!userId && !guestEmail) {
      return NextResponse.json({ error: "Login required or provide an email for guest checkout" }, { status: 400 });
    }

    const razorpay = getRazorpayInstance();
    const orderAmount = Math.round(plan.price * 100);

    const notes: Record<string, string | number> = {
      planId: plan.code,
      planName: plan.name,
      price: plan.price,
      currency: plan.currency,
    };
    if (userId) notes.userId = userId;
    if (guestEmail) notes.email = guestEmail;

    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: plan.currency,
      receipt: `rcpt_${Date.now()}`,
      notes,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Checkout order creation failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
