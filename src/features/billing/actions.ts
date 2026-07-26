"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { billingFeatureService } from "./service";

export async function getBilling() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return billingFeatureService.getData(tenantId);
}
