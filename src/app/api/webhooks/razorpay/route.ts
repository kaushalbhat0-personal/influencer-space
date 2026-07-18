import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SEAT_QUOTAS: Record<string, { plan: string; seats: number }> = {
  freelancer: { plan: "FREELANCER", seats: 5 },
  growth: { plan: "GROWTH", seats: 20 },
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

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

  const payload = JSON.parse(rawBody);
  const event = payload.event;

  if (event === "payment.captured") {
    const notes = payload.payload?.payment?.entity?.notes || {};
    const planId: string = notes.planId;
    const seats: number = notes.seats ? parseInt(notes.seats, 10) : (SEAT_QUOTAS[planId]?.seats || 5);
    const plan: string = SEAT_QUOTAS[planId]?.plan || "FREELANCER";
    let userId: string = notes.userId || "";
    const guestEmail: string = notes.email || "";

    if (!planId) {
      console.warn("Webhook received without planId in notes");
      return NextResponse.json({ ok: true });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // ─── Guest checkout: create user if they don't exist ───
        if (!userId && guestEmail) {
          const existingUser = await tx.user.findUnique({
            where: { email: guestEmail },
            select: { id: true },
          });

          if (existingUser) {
            userId = existingUser.id;
          } else {
            const randomPassword = crypto.randomBytes(16).toString("hex");
            const hashedPassword = await bcrypt.hash(randomPassword, 12);

            const newUser = await tx.user.create({
              data: {
                email: guestEmail,
                password: hashedPassword,
                name: guestEmail.split("@")[0],
                role: "AGENCY_ADMIN",
              },
            });
            userId = newUser.id;
            console.log(`Webhook: created guest user ${userId} for ${guestEmail}`);
          }
        }

        if (!userId) {
          throw new Error("No userId available after guest/user resolution");
        }

        // ─── Provision: WebsiteAgency + AgencySubscription ───
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, agencyId: true, name: true, email: true },
        });
        if (!user) throw new Error(`User ${userId} not found`);

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

          await tx.user.update({
            where: { id: userId },
            data: { agencyId, role: "AGENCY_ADMIN" },
          });
        }

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

      console.log(`Webhook: provisioned ${plan} with ${seats} seats for user ${userId || guestEmail}`);
    } catch (error) {
      console.error("Webhook provisioning failed:", error);
    }
  }

  return NextResponse.json({ ok: true });
}
