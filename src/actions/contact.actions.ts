"use server";
import type { ContactActionState } from "./contact.types";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MESSAGES_ROUTE } from "@/lib/constants";
import { getTenantContext } from "@/lib/tenant";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

/**
 * Public-domain resolution only — used by the storefront contact form where the
 * visitor is NOT authenticated. The tenant is derived from the host so a public
 * visitor's message lands on the correct tenant's inbox.
 */
async function requireTenant(): Promise<string> {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized — no tenant context");
  return tenant.id;
}

/**
 * RCCF-63.2 — authenticated Creator tenant authority for PROTECTED message
 * mutations. Derived from the server session — a client-supplied host/tenant
 * header can never select another Creator's tenant here.
 */
async function requireCreatorTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}

export async function submitContact(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const parsed = contactSchema.safeParse({
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
    const tenantId = await requireTenant();
    await prisma.contactSubmission.create({
      data: {
        tenantId,
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
      },
    });
    revalidatePath(MESSAGES_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to send message. Please try again." };
  }
}

export async function markMessageAsRead(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // RCCF-63.2 — session-authoritative tenant (never a client header).
    const tenantId = await requireCreatorTenant();
    const owned = await prisma.contactSubmission.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!owned) return { success: false, error: "Message not found" };
    await prisma.contactSubmission.update({
      where: { id: owned.id },
      data: { isRead: true },
    });
    revalidatePath(MESSAGES_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark message as read" };
  }
}

export async function deleteMessage(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // RCCF-63.2 — session-authoritative tenant (never a client header).
    const tenantId = await requireCreatorTenant();
    const owned = await prisma.contactSubmission.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!owned) return { success: false, error: "Message not found" };
    await prisma.contactSubmission.delete({ where: { id: owned.id } });
    revalidatePath(MESSAGES_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete message" };
  }
}



