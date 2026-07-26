import { prisma } from "@/lib/prisma";
import type { DomainData, DNSRecord } from "./types";

const DEFAULT_DNS_RECORDS: DNSRecord[] = [
  { type: "CNAME", name: "www", value: "cname.vercel-dns.com", ttl: 3600 },
  { type: "A", name: "@", value: "76.76.21.21", ttl: 3600 },
];

export const domainService = {
  async get(tenantId: string): Promise<DomainData> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true, customDomain: true },
    });
    if (!tenant) throw new Error("Tenant not found");
    return {
      defaultSubdomain: `${tenant.subdomain}.influencer-space.vercel.app`,
      customDomain: tenant.customDomain,
      sslStatus: tenant.customDomain ? "active" : null,
      verified: !!tenant.customDomain,
      dnsInstructions: DEFAULT_DNS_RECORDS,
    };
  },

  async update(tenantId: string, domain: string): Promise<DomainData> {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: cleanDomain },
    });
    return this.get(tenantId);
  },

  async remove(tenantId: string): Promise<DomainData> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: null },
    });
    return this.get(tenantId);
  },
};
