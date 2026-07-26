"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyticsService } from "./service";

export async function getAnalytics() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return analyticsService.getData(tenantId);
}
