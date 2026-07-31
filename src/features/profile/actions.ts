"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { profileService } from "./service";
import { profileUpdateSchema } from "./validators";
import type { ProfileUpdate } from "./validators";
import { afterContentChange } from "@/lib/publishing/content-change";

export async function getProfile() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return profileService.getProfile(tenantId);
}

export async function updateProfile(input: ProfileUpdate) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = profileUpdateSchema.parse(input);
  const result = await profileService.updateProfile(tenantId, parsed as Parameters<typeof profileService.updateProfile>[1]);
  revalidatePath("/admin/profile");
  await afterContentChange(tenantId, { revalidateDashboard: true });
  return result;
}
