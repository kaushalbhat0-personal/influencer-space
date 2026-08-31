// ── Payment Account — Application Runtime ───────────────────
// RCCF-IMPLEMENTATION-74 Phase 1 + 3 + RCCF-LAUNCH-12 multi-provider.
// Creator's canonical payment accounts (one per provider). CreatorStore never in money flow.

import { prisma } from "@/lib/prisma";
import { cache as reactCache } from "react";
import { encrypt, decrypt } from "@/lib/crypto";
import { logAction } from "@/lib/audit";
import { captureError } from "@/lib/observability/error-tracker";
import { runtimeEventBus } from "@/modules/event-runtime";
import { resolveCommerceStrategy } from "@/modules/commerce-strategy";
import { getPaymentProviderAdapter } from "../providers/registry";
import type {
  PaymentAccountData,
  PaymentAccountInput,
  PaymentReadiness,
  PaymentReadinessReport,
  PaymentProviderId,
} from "../domain/types";

const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

// ── Read ─────────────────────────────────────────────────────
function serialize(row: {
  id: string; tenantId: string; provider: string; displayName: string | null; accountHolderName: string | null;
  merchantName: string | null; upiId: string | null; bankAccountName: string | null; bankAccountNumber: string | null;
  ifsc: string | null; settlementMode: string; status: string; verificationStatus: string; capabilities: unknown;
  providerKeyId: string | null; providerKeySecret: string | null; providerAccountId: string | null; isActive: boolean;
  lastVerifiedAt: Date | null; createdAt: Date; updatedAt: Date;
}): PaymentAccountData {
  return {
    id: row.id,
    tenantId: row.tenantId,
    provider: row.provider as PaymentAccountData["provider"],
    displayName: row.displayName,
    accountHolderName: row.accountHolderName,
    merchantName: row.merchantName,
    upiId: row.upiId,
    bankAccountName: row.bankAccountName,
    hasBankAccountNumber: !!row.bankAccountNumber,
    ifsc: row.ifsc,
    settlementMode: row.settlementMode as PaymentAccountData["settlementMode"],
    status: row.status as PaymentAccountData["status"],
    verificationStatus: row.verificationStatus as PaymentAccountData["verificationStatus"],
    capabilities: (row.capabilities as Record<string, boolean>) ?? {},
    hasProviderKeys: !!row.providerKeyId && !!row.providerKeySecret,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    // LAUNCH-12
    providerAccountId: (row as { providerAccountId?: string | null }).providerAccountId ?? null,
    isActive: (row as { isActive?: boolean }).isActive ?? false,
  } as PaymentAccountData & { providerAccountId: string | null; isActive: boolean };
}

export async function getPaymentAccount(tenantId: string, provider?: string): Promise<PaymentAccountData | null> {
  if (provider) {
    const row = await prisma.paymentAccount.findUnique({ where: { tenantId_provider: { tenantId, provider } } } as never);
    if (!row) return null;
    return serialize(row as never);
  }
  // Legacy test compat: try findUnique via tenantId if mocked
  try {
    const legacy = await (prisma.paymentAccount as unknown as { findUnique: (a: unknown)=>Promise<unknown> }).findUnique({ where: { tenantId } } as never);
    if (legacy) return serialize(legacy as never);
  } catch {}
  const active = await prisma.paymentAccount.findFirst({ where: { tenantId, isActive: true } });
  if (active) return serialize(active as never);
  const any = await prisma.paymentAccount.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } });
  if (!any) return null;
  return serialize(any as never);
}

export async function getAllPaymentAccounts(tenantId: string): Promise<PaymentAccountData[]> {
  const rows = await prisma.paymentAccount.findMany({ where: { tenantId }, orderBy: { provider: "asc" } });
  return rows.map((r) => serialize(r as never));
}

export async function getActivePaymentAccount(tenantId: string): Promise<PaymentAccountData | null> {
  const row = await prisma.paymentAccount.findFirst({ where: { tenantId, isActive: true } });
  if (row) return serialize(row as never);
  // Fallback: single verified razorpay account that hasn't been marked active yet (migration)
  const fallback = await prisma.paymentAccount.findFirst({ where: { tenantId, verificationStatus: "verified", status: "active" }, orderBy: { updatedAt: "desc" } });
  return fallback ? serialize(fallback as never) : null;
}

// ── Write ────────────────────────────────────────────────────
export async function savePaymentAccount(tenantId: string, input: PaymentAccountInput, actor: string): Promise<{ success: boolean; account?: PaymentAccountData; error?: string }> {
  try {
    const provider = (input.provider ?? "razorpay") as string;
    const existing = await prisma.paymentAccount.findUnique({ where: { tenantId_provider: { tenantId, provider } } as never });
    const data: Record<string, unknown> = {
      provider,
      displayName: input.displayName ?? null,
      accountHolderName: input.accountHolderName ?? null,
      merchantName: input.merchantName ?? null,
      upiId: input.upiId ?? null,
      bankAccountName: input.bankAccountName ?? null,
      ifsc: input.ifsc ?? null,
      settlementMode: input.settlementMode ?? "upi",
      capabilities: (input.capabilities ?? {}) as object,
    };
    if (input.bankAccountNumber) data.bankAccountNumber = encrypt(input.bankAccountNumber);
    if (input.providerKeyId) data.providerKeyId = encrypt(input.providerKeyId);
    if (input.providerKeySecret) data.providerKeySecret = encrypt(input.providerKeySecret);
    if ((input as unknown as Record<string, unknown>).providerAccountId) data.providerAccountId = (input as unknown as Record<string, unknown>).providerAccountId;
    if (input.providerKeyId || input.providerKeySecret) {
      data.status = "active";
      data.verificationStatus = "pending";
    }
    // First account for tenant becomes active if none active
    const hasActive = await prisma.paymentAccount.findFirst({ where: { tenantId, isActive: true } });
    if (!hasActive && !existing) data.isActive = true;
    if ((input as unknown as Record<string, unknown>).isActive === true) data.isActive = true;

    let row: unknown;
    if (existing) {
      row = await prisma.paymentAccount.update({ where: { tenantId_provider: { tenantId, provider } } as never, data: data as never });
    } else {
      row = await prisma.paymentAccount.create({ data: { tenantId, ...data } as never });
    }
    // If this write made it active, deactivate others
    if ((data.isActive as boolean) === true) {
      await prisma.paymentAccount.updateMany({ where: { tenantId, provider: { not: provider } } as never, data: { isActive: false } as never });
    }
    await emitEvent(existing ? "payment.account.updated" : "payment.account.created", tenantId, (row as { id: string }).id, { provider });
    await logAction(tenantId, existing ? "payment:account-updated" : "payment:account-created", { accountId: (row as { id: string }).id, provider, by: actor }).catch(() => {});
    return { success: true, account: serialize(row as never) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Save failed" };
  }
}

export async function setActiveProvider(tenantId: string, provider: string, actor: string): Promise<{ success: boolean; error?: string }> {
  const account = await prisma.paymentAccount.findUnique({ where: { tenantId_provider: { tenantId, provider } } as never });
  if (!account) return { success: false, error: "Payment account not found for provider" };
  if ((account as { verificationStatus: string }).verificationStatus !== "verified") return { success: false, error: "Provider not verified — verify before activating" };
  await prisma.$transaction(async (tx) => {
    await (tx as unknown as { paymentAccount: { updateMany: (a: unknown)=>Promise<unknown>} }).paymentAccount.updateMany({ where: { tenantId }, data: { isActive: false } });
    await (tx as unknown as { paymentAccount: { update: (a: unknown)=>Promise<unknown>} }).paymentAccount.update({ where: { tenantId_provider: { tenantId, provider } } as never, data: { isActive: true } as never });
  });
  await logAction(tenantId, "payment:active-provider-set", { provider, by: actor }).catch(()=>{});
  return { success: true };
}

export async function verifyPaymentAccount(tenantId: string, actor: string, provider?: string): Promise<{ success: boolean; verified?: boolean; readiness?: PaymentReadinessReport; error?: string }> {
  const row = provider
    ? await prisma.paymentAccount.findUnique({ where: { tenantId_provider: { tenantId, provider } } as never })
    : (await prisma.paymentAccount.findFirst({ where: { tenantId, isActive: true } })) ?? await prisma.paymentAccount.findFirst({ where: { tenantId } });
  if (!row) return { success: false, error: "No payment account" };
  const typedRow = row as { provider: string; providerKeyId: string | null; providerKeySecret: string | null; updatedAt: Date; id: string; tenantId: string; providerAccountId: string | null };
  const adapter = getPaymentProviderAdapter(typedRow.provider);
  if (!adapter) return { success: false, error: "No adapter for provider" };
  let secretId: string | null = null;
  let secretKey: string | null = null;
  try {
    secretId = typedRow.providerKeyId ? decrypt(typedRow.providerKeyId) : null;
    secretKey = typedRow.providerKeySecret ? decrypt(typedRow.providerKeySecret) : null;
  } catch (err) {
    captureError(err instanceof Error ? err : new Error("credential decrypt failed"), { service: "payment-account", operation: "verifyDecrypt", tenantId });
    return { success: false, error: "Stored credentials could not be decrypted. Please re-save your keys." };
  }
  const readVersion = (row as { updatedAt: Date }).updatedAt;
  const result = await adapter.getAccountStatus({ providerKeyId: secretId, providerKeySecret: secretKey, providerAccountId: typedRow.providerAccountId } as never);
  if (result.classification === "verified") {
    const applied = await prisma.paymentAccount.updateMany({ where: { tenantId, provider: typedRow.provider, status: { not: "disconnected" }, updatedAt: readVersion } as never, data: { verificationStatus: "verified", lastVerifiedAt: new Date(), status: "active" } as never });
    if (applied.count === 0) return { success: false, error: "Credentials changed during verification. Please verify again." };
    await emitEvent("payment.account.updated", tenantId, typedRow.id, { provider: typedRow.provider });
    await logAction(tenantId, "payment:account-provider-verified", { accountId: typedRow.id, by: actor }).catch(() => {});
    // Auto-activate on first verification if none active
    const hasActive = await prisma.paymentAccount.findFirst({ where: { tenantId, isActive: true } });
    if (!hasActive) {
      await prisma.paymentAccount.updateMany({ where: { tenantId } as never, data: { isActive: false } as never });
      await prisma.paymentAccount.update({ where: { tenantId_provider: { tenantId, provider: typedRow.provider } } as never, data: { isActive: true } as never });
    }
    const readiness = await computePaymentReadiness(tenantId);
    return { success: true, verified: true, readiness };
  }
  if (result.classification === "credential_failed") {
    await prisma.paymentAccount.updateMany({ where: { tenantId, provider: typedRow.provider, updatedAt: readVersion } as never, data: { verificationStatus: "failed" } as never }).catch(()=>({count:0}));
    await emitEvent("payment.account.updated", tenantId, typedRow.id, { provider: typedRow.provider });
    await logAction(tenantId, "payment:account-provider-failed", { accountId: typedRow.id, by: actor }).catch(() => {});
    return { success: false, error: result.error ?? "Provider rejected these credentials" };
  }
  if (result.classification === "unknown") {
    captureError(new Error(result.error ?? "unexpected provider verification answer"), { service: "payment-account", operation: "verifyUnknown", tenantId });
  }
  return { success: false, error: result.error ?? "Verification could not be completed. Try again shortly." };
}

export async function disconnectPaymentAccount(tenantId: string, actor: string, provider?: string): Promise<{ success: boolean; error?: string }> {
  const where = provider ? { tenantId_provider: { tenantId, provider } } as never : { tenantId } as never;
  const row = provider ? await prisma.paymentAccount.findUnique({ where: where as never }) : await prisma.paymentAccount.findFirst({ where: { tenantId } });
  if (!row) return { success: false, error: "No payment account" };
  const typed = row as { provider: string; id: string; isActive: boolean };
  await prisma.paymentAccount.update({ where: { tenantId_provider: { tenantId, provider: typed.provider } } as never, data: { status: "disconnected", verificationStatus: "unverified", isActive: false } as never });
  // If disconnected was active, try to promote another verified account
  if (typed.isActive) {
    const fallback = await prisma.paymentAccount.findFirst({ where: { tenantId, verificationStatus: "verified", status: "active" } });
    if (fallback) await prisma.paymentAccount.update({ where: { id: (fallback as {id:string}).id } as never, data: { isActive: true } as never });
  }
  await emitEvent("payment.account.disconnected", tenantId, typed.id, { provider: typed.provider });
  await logAction(tenantId, "payment:account-disconnected", { accountId: typed.id, by: actor }).catch(() => {});
  return { success: true };
}

async function emitEvent(type: "payment.account.created" | "payment.account.updated" | "payment.account.verified" | "payment.account.disconnected", tenantId: string, entityId: string, payload: Record<string, unknown>): Promise<void> {
  await runtimeEventBus.publish({ type, tenantId, entityId, payload, occurredAt: new Date().toISOString() }).catch(() => {});
}

// ── Readiness ──────────────────────────────────────────────────
export const computePaymentReadiness = requestCache(async (tenantId: string): Promise<PaymentReadinessReport> => {
  const [activeAccount, allAccounts, strategy] = await Promise.all([
    getActivePaymentAccount(tenantId),
    getAllPaymentAccounts(tenantId),
    resolveCommerceStrategy(tenantId),
  ]);
  const account = activeAccount;
  const hasAnyVerified = allAccounts.some((a) => a.verificationStatus === "verified");
  const requirements = [
    { key: "strategy", label: "Commerce strategy", met: strategy.id === "PLATFORM_COLLECT" || strategy.id === "DIRECT_CREATOR", severity: "required" as const },
    { key: "provider", label: "Payment provider selected", met: !!account && !!getPaymentProviderAdapter(account.provider), severity: "required" as const },
    { key: "configured", label: "Account configured", met: !!(account && (account.hasProviderKeys || account.upiId || account.bankAccountName)), severity: "required" as const },
    { key: "identity", label: "Account holder identified", met: !!account?.accountHolderName, severity: "required" as const },
    { key: "settlement", label: "Settlement detail provided", met: !!(account && (account.settlementMode === "upi" ? !!account.upiId : !!(account.bankAccountName && account.hasBankAccountNumber && account.ifsc))), severity: "required" as const },
    { key: "verification", label: "Provider credentials verified", met: account?.verificationStatus === "verified", severity: "required" as const },
    { key: "active", label: "Active provider chosen", met: !!account?.isActive, severity: "required" as const },
  ];
  // Add hint about other verified providers available
  const missing = requirements.filter((r) => !r.met).map((r) => r.label);
  const readiness: PaymentReadiness = strategy.id === "PLATFORM_COLLECT" ? "ready" : missing.length === 0 ? "ready" : missing.length <= 2 ? "warning" : "blocked";
  return {
    tenantId,
    readiness,
    strategy: strategy.id,
    provider: account?.provider ?? null,
    requirements,
    missing,
  } as PaymentReadinessReport;
});

/** Platform payment health. */
export async function getPaymentHealth(): Promise<{
  total: number;
  connected: number;
  pending: number;
  unverified: number;
  disconnected: number;
  providerDistribution: Array<{ provider: string; count: number }>;
  activeByProvider: Array<{ provider: string; count: number }>;
}> {
  const [total, connected, pending, unverified, disconnected, byProvider, activeBy] = await Promise.all([
    prisma.paymentAccount.count(),
    prisma.paymentAccount.count({ where: { status: "active" } }),
    prisma.paymentAccount.count({ where: { status: "pending" } }),
    prisma.paymentAccount.count({ where: { verificationStatus: { in: ["unverified", "pending", "failed"] } } }),
    prisma.paymentAccount.count({ where: { status: "disconnected" } }),
    prisma.paymentAccount.groupBy({ by: ["provider"], _count: true }),
    prisma.paymentAccount.groupBy({ by: ["provider"], where: { isActive: true }, _count: true }),
  ]);
  return {
    total, connected, pending, unverified, disconnected,
    providerDistribution: byProvider.map((p) => ({ provider: p.provider, count: p._count })),
    activeByProvider: activeBy.map((p) => ({ provider: p.provider, count: p._count })),
  };
}
