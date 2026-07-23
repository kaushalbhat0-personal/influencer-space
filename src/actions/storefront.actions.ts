"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
