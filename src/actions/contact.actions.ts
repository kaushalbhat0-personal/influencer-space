"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ContactService } from "@/services/contact.service";
import { MESSAGES_ROUTE } from "@/lib/constants";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export type ContactActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

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
    await ContactService.create({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
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
    await ContactService.markAsRead(id);
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
    await ContactService.delete(id);
    revalidatePath(MESSAGES_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete message" };
  }
}
