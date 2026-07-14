import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export interface LinkedAccountResult {
  razorpayAccountId: string;
}

export const RazorpayService = {
  async createLinkedAccount(
    tenantId: string,
    email: string,
    name: string,
  ): Promise<LinkedAccountResult> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error("Tenant not found");
    if (tenant.razorpayAccountId) {
      throw new Error("Tenant already has a linked Razorpay account");
    }

    const account: { id: string } = await new Promise((resolve, reject) => {
      razorpay.accounts.create(
        {
          email,
          phone: "",
          type: "route",
          legal_business_name: name,
          business_type: "individual",
          contact_name: name,
          profile: { category: "other" },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        },
      );
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        razorpayAccountId: account.id,
        razorpaySetupComplete: false,
      },
    });

    return { razorpayAccountId: account.id };
  },

  async getLinkedAccount(tenantId: string): Promise<{
    razorpayAccountId: string | null;
    razorpaySetupComplete: boolean;
  }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { razorpayAccountId: true, razorpaySetupComplete: true },
    });
    if (!tenant) throw new Error("Tenant not found");
    return tenant;
  },

  async markSetupComplete(tenantId: string): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { razorpaySetupComplete: true },
    });
  },
};
