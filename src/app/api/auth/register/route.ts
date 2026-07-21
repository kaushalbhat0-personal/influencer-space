import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const FREE_PLAN = { plan: "STARTER", seats: 1, status: "FREE" };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email: string = body.email?.trim().toLowerCase();
    const password: string = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create User + WebsiteAgency + AgencySubscription in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: email.split("@")[0],
          role: "AGENCY_ADMIN",
        },
      });

      const agency = await tx.websiteAgency.create({
        data: {
          name: user.name || email,
          subdomain: `agency_${user.id.slice(0, 8)}`,
          status: "ACTIVE",
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { agencyId: agency.id },
      });

      await tx.agencySubscription.create({
        data: {
          agencyId: agency.id,
          plan: FREE_PLAN.plan,
          maxManagedTenants: FREE_PLAN.seats,
          status: FREE_PLAN.status,
        },
      });

      // Billing v2 — create BillingAccount + Subscription with selected plan
      const billingAccount = await tx.billingAccount.create({
        data: {
          accountType: "agency",
          accountId: agency.id,
        },
      });

      const requestedPlanCode = body.planCode || "creator_free";
      const billingPlan = await tx.billingPlan.findUnique({
        where: { code: requestedPlanCode },
      });

      if (billingPlan) {
        await tx.billingSubscription.create({
          data: {
            accountId: billingAccount.id,
            planId: billingPlan.id,
            status: billingPlan.price === 0 ? "ACTIVE" : "TRIALING",
          },
        });
      }

      return { userId: user.id, agencyId: agency.id };
    });

    return NextResponse.json({
      success: true,
      userId: result.userId,
      email,
    }, { status: 201 });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
