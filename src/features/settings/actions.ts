"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { settingsService } from "./service";
import type { SettingsFormInput } from "./types";

export async function getSettings() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return settingsService.get(tenantId);
}

export async function updateSettings(input: SettingsFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const result = await settingsService.update(tenantId, input);
  revalidatePath("/admin/settings");
  return result;
}
