"use server";

import { AffiliateService } from "@/services/affiliate.service";

export async function incrementAffiliateClicks(id: string): Promise<void> {
  await AffiliateService.incrementClicks(id);
}
