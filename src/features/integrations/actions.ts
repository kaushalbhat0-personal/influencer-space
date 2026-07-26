"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { integrationService } from "./service";

export async function listIntegrations() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return integrationService.list(tenantId);
}
