"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * RCCF-19 P1-C: server-authoritative tenant verification for public
 * Contact/Newsletter submissions. The tenantId is injected into the section
 * config by the storefront renderer from the resolved tenant — a tampered
 * form must not be able to target another tenant. When the request carries
 * the storefront tenant host (set by middleware), the submitted tenantId must
 * match the tenant served at that host; in all cases the tenantId must resolve
 * to a real tenant with a storefront.
 */
async function verifyTenantContext(submittedTenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: submittedTenantId },
    select: { subdomain: true, customDomain: true },
  });
  if (!tenant || (!tenant.subdomain && !tenant.customDomain)) return false;

  try {
    const hostSlug = headers().get("x-tenant-host");
    if (hostSlug) {
      const hosted = await prisma.tenant.findFirst({
        where: { OR: [{ subdomain: hostSlug }, { customDomain: hostSlug }] },
        select: { id: true },
      });
      if (hosted && hosted.id !== submittedTenantId) return false;
    }
  } catch {
    // header unavailable — the existence check above is the fallback
  }

  return true;
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

