import { NextResponse } from "next/server";
import { getRazorpayInstance } from "@/lib/razorpay";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SEAT_QUOTAS: Record<string, { plan: string; seats: number }> = {
  freelancer: { plan: "FREELANCER", seats: 5 },
  growth: { plan: "GROWTH", seats: 20 },
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized — please log in" }, { status: 401 });
    }

    const body = await req.json();
    const planId: string = body.planId;
    const amount: number = body.amount;

    if (!planId || !amount) {
      return NextResponse.json({ error: "planId and amount are required" }, { status: 400 });
    }

    if (!SEAT_QUOTAS[planId]) {
      return NextResponse.json({ error: `Unknown planId: ${planId}` }, { status: 400 });
    }

    const razorpay = getRazorpayInstance();
    const orderAmount = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        planId,
        userId: session.user.id,
        seats: SEAT_QUOTAS[planId].seats,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Checkout order creation failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
