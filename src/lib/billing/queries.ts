import { prisma } from "@/lib/prisma";
import type { BillingSubscription, BillingInvoice, InvoiceFilter } from "./types";
import { mapSubscription } from "./mapper";
import { mapInvoice } from "./invoice-engine";

const invoiceCache = new Map<string, { data: BillingInvoice[]; timestamp: number }>();
const CACHE_TTL = 30_000;

function getCached<T>(cache: Map<string, { data: T; timestamp: number }>, key: string, ttl: number): T | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) return entry.data;
  cache.delete(key);
  return undefined;
}

function setCache<T>(cache: Map<string, { data: T; timestamp: number }>, key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 100) {
    const entries = Array.from(cache.entries());
    if (entries.length > 0) cache.delete(entries[0][0]);
  }
}

export async function getSubscription(accountId: string): Promise<BillingSubscription | null> {
  const sub = await prisma.billingSubscription.findFirst({
    where: { accountId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  return sub ? mapSubscription(sub) : null;
}

export async function getSubscriptionByWorkspace(workspaceId: string): Promise<BillingSubscription | null> {
  const sub = await prisma.billingSubscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });
  return sub ? mapSubscription(sub) : null;
}

export async function getInvoices(
  accountId: string,
  filter?: InvoiceFilter,
  limit = 50,
): Promise<BillingInvoice[]> {
  const cacheKey = `${accountId}-${JSON.stringify(filter)}-${limit}`;
  const cached = getCached(invoiceCache, cacheKey, CACHE_TTL);
  if (cached) return cached;

  const where: Record<string, unknown> = { accountId };
  if (filter?.status) where.status = filter.status;
  if (filter?.dateFrom || filter?.dateTo) {
    const issuedAtFilter: Record<string, Date> = {};
    if (filter.dateFrom) issuedAtFilter.gte = new Date(filter.dateFrom);
    if (filter.dateTo) issuedAtFilter.lte = new Date(filter.dateTo);
    where.issuedAt = issuedAtFilter;
  }

  const invoices = await prisma.billingInvoice.findMany({
    where: where as Record<string, unknown>,
    orderBy: { issuedAt: "desc" },
    take: limit,
  });

  const result = invoices.map(mapInvoice);
  setCache(invoiceCache, cacheKey, result);
  return result;
}

export async function getInvoiceCount(accountId: string): Promise<number> {
  return prisma.billingInvoice.count({ where: { accountId } });
}

export async function getTotalRevenue(accountId: string): Promise<number> {
  const result = await prisma.billingInvoice.aggregate({
    where: { accountId, status: "PAID" },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function getUsageCounts(tenantId: string): Promise<{ products: number; gallery: number; orders: number }> {
  const [products] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
  ]);
  return { products, gallery: 0, orders: 0 };
}

export async function getRecentEvents(accountId: string, limit = 10) {
  return prisma.billingEvent.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, createdAt: true, payload: true },
  });
}

export function invalidateInvoiceCache(accountId?: string): void {
  if (accountId) {
    Array.from(invoiceCache.keys()).forEach((key) => {
      if (key.startsWith(accountId)) invoiceCache.delete(key);
    });
  } else {
    invoiceCache.clear();
  }
}
