import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { isFlagEnabled, getPlatformConfig } from "@/lib/platform/platform-config";

export async function POST(req: Request) {
  // VALIDATION-04: honor the `enableNewRegistrations` platform flag. This is a
  // kill-switch: absent/true = open registration, explicit false = closed.
  if ((await getPlatformConfig()).enableNewRegistrations === false) {
    return NextResponse.json({ error: "Registration is temporarily disabled." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "register";
  const rateCheck = checkRateLimit(`register:${ip}`, "/api/auth/register");
  if (!rateCheck.allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

  try {
    const body = await req.json();
    const email: string = body.email?.trim().toLowerCase();
    const password: string = body.password;
    const persona: string = body.persona || "creator";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    if (persona === "agency") {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name: body.name || email.split("@")[0],
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

        const billingAccount = await tx.billingAccount.create({
          data: {
            accountType: "agency",
            accountId: agency.id,
          },
        });

        // VALIDATION-04: self-serve agency signup uses the canonical free plan
        // code (`partner_free`). The legacy `agency_free` alias is NOT a DB
        // row — using it silently skipped subscription creation.
        const requestedPlanCode = "partner_free";
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

      return NextResponse.json({ success: true, userId: result.userId, email }, { status: 201 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: body.name || email.split("@")[0],
          role: "ADMIN",
          tenantId: null,
        },
      });

      // RCCF-LAUNCH-01: self-serve creator signup is FREE-only. The body
      // previously accepted an arbitrary `planCode`, granting a paid plan in
      // TRIALING with no verification — paid plans must come through checkout.
      const requestedPlanCode = "creator_launch";
      const billingPlan = await tx.billingPlan.findUnique({
        where: { code: requestedPlanCode },
      });

      if (billingPlan) {
        const billingAccount = await tx.billingAccount.create({
          data: {
            accountType: "creator",
            accountId: user.id,
          },
        });

        await tx.billingSubscription.create({
          data: {
            accountId: billingAccount.id,
            planId: billingPlan.id,
            status: billingPlan.price === 0 ? "ACTIVE" : "TRIALING",
          },
        });
      }

      return { userId: user.id };
    });

    return NextResponse.json({ success: true, userId: result.userId, email }, { status: 201 });
  } catch (error) {
    // VALIDATION-01 V-014: a concurrent duplicate-email race surfaces as P2002
    // (the unique constraint), not an internal error.
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    captureError(error, { service: "auth-register", operation: "POST" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
