// src/services/razorpay-route.service.ts
import { prisma } from "@/lib/prisma";

interface RouteSplit {
  total: number;
  platformCut: number;
  agencyCut: number;
  creatorCut: number;
}

interface RouteTransfer {
  accountId: string;
  amount: number;
  note: string;
}

const DEFAULT_PLATFORM_FEE = 5;

export async function calculateRouteSplit(
  tenantId: string,
  amount: number,
): Promise<{ split: RouteSplit; transfers: RouteTransfer[] }> {
  const mapping = await prisma.agencyTenant.findUnique({
    where: { tenantId },
    include: {
      agency: { select: { razorpayAccountId: true } },
      tenant: { select: { razorpayAccountId: true } },
    },
  });

  const platformCut = Math.round(amount * (DEFAULT_PLATFORM_FEE / 100));
  const agencyCut = mapping
    ? Math.round(amount * (mapping.productRevSharePercent / 100))
    : 0;
  const creatorCut = amount - platformCut - agencyCut;

  const transfers: RouteTransfer[] = [];

  if (agencyCut > 0 && mapping?.agency.razorpayAccountId) {
    transfers.push({
      accountId: mapping.agency.razorpayAccountId,
      amount: agencyCut,
      note: `Agency rev-share (${mapping.productRevSharePercent}%)`,
    });
  }

  if (creatorCut > 0 && mapping?.tenant.razorpayAccountId) {
    transfers.push({
      accountId: mapping.tenant.razorpayAccountId,
      amount: creatorCut,
      note: "Creator sale",
    });
  }

  return {
    split: { total: amount, platformCut, agencyCut, creatorCut },
    transfers,
  };
}
