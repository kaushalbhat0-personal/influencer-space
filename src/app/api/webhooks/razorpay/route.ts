import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SEAT_QUOTAS: Record<string, { plan: string; seats: number }> = {
  freelancer: { plan: "FREELANCER", seats: 5 },
  growth: { plan: "GROWTH", seats: 20 },
};

export async function POST(req: Request) {
  // 1. Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  // 2. Verify webhook signature
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Parse payload
  const payload = JSON.parse(rawBody);
  const event = payload.event;

  // 4. Handle payment.captured (the event that fires when payment succeeds)
  if (event === "payment.captured") {
    const notes = payload.payload?.payment?.entity?.notes;
    if (!notes?.userId || !notes?.planId) {
      console.warn("Webhook received without userId or planId in notes");
      return NextResponse.json({ ok: true });
    }

    const userId: string = notes.userId;
    const planId: string = notes.planId;
    const seats = notes.seats ? parseInt(notes.seats, 10) : SEAT_QUOTAS[planId]?.seats || 5;
    const plan = SEAT_QUOTAS[planId]?.plan || "FREELANCER";

    try {
      // 5. Provision: create WebsiteAgency + set user role + create AgencySubscription
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, agencyId: true, name: true, email: true },
        });
        if (!user) throw new Error(`User ${userId} not found`);

        // Create WebsiteAgency if user doesn't have one
        let agencyId = user.agencyId;
        if (!agencyId) {
          const agency = await tx.websiteAgency.create({
            data: {
              name: user.name || user.email,
              subdomain: `agency_${userId.slice(0, 8)}`,
              status: "ACTIVE",
            },
          });
          agencyId = agency.id;

          // Link user to agency + upgrade role
          await tx.user.update({
            where: { id: userId },
            data: {
              agencyId,
              role: "AGENCY_ADMIN",
            },
          });
        }

        // Create or update AgencySubscription with seat quota
        await tx.agencySubscription.upsert({
          where: { agencyId },
          update: {
            plan,
            maxManagedTenants: { increment: seats },
            status: "ACTIVE",
          },
          create: {
            agencyId,
            plan,
            maxManagedTenants: seats,
            status: "ACTIVE",
          },
        });
      });

      console.log(`Webhook: provisioned ${plan} plan with ${seats} seats for user ${userId}`);
    } catch (error) {
      console.error("Webhook provisioning failed:", error);
      // Still return 200 OK — Razorpay will not retry, but we log the failure
    }
  }

  // 6. Always return 200 OK to prevent Razorpay webhook retries
  return NextResponse.json({ ok: true });
}
