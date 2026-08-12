"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * RCCF-19 P1-C / RCCF-25: server-authoritative tenant verification for public
 * Contact/Newsletter submissions. The tenantId is injected into the section
 * config by the storefront renderer from the resolved tenant.
 *
 * The SUBMITTED tenantId must equal the tenant served at the trusted
 * middleware-derived storefront host (`x-tenant-host`). There is no
 * existence-only fallback: a missing header, an unresolvable host, or a
 * mismatch is rejected (fail-closed), so a tampered form can never target a
 * tenant other than the storefront page being viewed.
 */
async function verifyTenantContext(submittedTenantId: string): Promise<boolean> {
  let hostSlug: string | null = null;
  try {
    hostSlug = headers().get("x-tenant-host");
  } catch {
    return false;
  }
  if (!hostSlug) return false;

  const hosted = await prisma.tenant.findFirst({
    where: { OR: [{ subdomain: hostSlug }, { customDomain: hostSlug }] },
    select: { id: true },
  });
  if (!hosted) return false;

  return hosted.id === submittedTenantId;
}

const contactSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

const newsletterSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email("Invalid email address"),
  name: z.string().max(200).optional(),
});

export type ContactActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitStorefrontContact(
  _prevState: ContactActionResult,
  formData: FormData,
): Promise<ContactActionResult> {
  const parsed = contactSchema.safeParse({
    tenantId: formData.get("tenantId"),
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!(await verifyTenantContext(parsed.data.tenantId))) {
    return { success: false, error: "Invalid tenant" };
  }

  try {
    await prisma.contactSubmission.create({
      data: {
        tenantId: parsed.data.tenantId,
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to send message. Please try again." };
  }
}

export async function subscribeNewsletter(
  _prevState: ContactActionResult,
  formData: FormData,
): Promise<ContactActionResult> {
  const parsed = newsletterSchema.safeParse({
    tenantId: formData.get("tenantId"),
    email: formData.get("email"),
    name: formData.get("name") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!(await verifyTenantContext(parsed.data.tenantId))) {
    return { success: false, error: "Invalid tenant" };
  }

  try {
    await prisma.newsletterSubscriber.upsert({
      where: {
        tenantId_email: {
          tenantId: parsed.data.tenantId,
          email: parsed.data.email,
        },
      },
      update: { name: parsed.data.name ?? undefined },
      create: {
        tenantId: parsed.data.tenantId,
        email: parsed.data.email,
        name: parsed.data.name,
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to subscribe. Please try again." };
  }
}

