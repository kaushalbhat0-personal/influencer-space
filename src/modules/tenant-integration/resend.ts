// ── Tenant Resend Integration — Server-side runtime ─────────────────
// RCCF-INTEGRATIONS-03. Tenant-owned Resend for order.customer_confirmed.
// Additive only — does not touch PaymentAccount or Tenant social columns.
// Credentials encrypted via src/lib/crypto; metadata holds non-secrets only.
// Never returns raw apiKey to callers.

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { logAction } from "@/lib/audit";
import { captureError } from "@/lib/observability/error-tracker";

export type TenantResendView = {
  id: string;
  tenantId: string;
  provider: string;
  status: string; // pending | verified | failed | disconnected
  verificationStatus: string; // unverified | verified | failed
  emailFrom: string | null;
  domain: string | null;
  domainVerified: boolean;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CredentialsJson = { apiKey?: string };
type MetadataJson = { emailFrom?: string; domain?: string; domainVerified?: boolean };

const PROVIDER = "resend";

// ── Helpers ────────────────────────────────────────────────────────

function extractEmail(emailFrom: string): string | null {
  const trimmed = emailFrom.trim();
  // "Name <email@domain>" or "email@domain"
  const m = trimmed.match(/<([^>]+)>/);
  const raw = m ? m[1].trim() : trimmed;
  // basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return null;
  return raw;
}

function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const d = email.slice(at + 1).toLowerCase().trim();
  if (!d || d.includes(" ") || !d.includes(".")) return null;
  return d;
}

function maskKey(apiKey: string): string {
  if (apiKey.length <= 8) return "••••••••";
  return `••••${apiKey.slice(-4)}`;
}

function serialize(row: {
  id: string;
  tenantId: string;
  provider: string;
  status: string;
  verificationStatus: string;
  credentials: unknown;
  metadata: unknown;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TenantResendView {
  const cred = (row.credentials as CredentialsJson | null) ?? null;
  const meta = (row.metadata as MetadataJson | null) ?? {};
  const hasApiKey = !!cred?.apiKey;
  // Do not decrypt for view — mask from metadata or placeholder
  const masked = hasApiKey ? (meta.domain ? `re_••••${meta.domain.slice(0, 2)}` : "••••••••") : null;
  // Try to derive masked from decrypted length? No — keep masked placeholder
  // If we have stored maskedApiKey in metadata, prefer it; else generic
  const storedMask = (meta as unknown as Record<string, unknown>)["maskedApiKey"] as string | undefined;
  return {
    id: row.id,
    tenantId: row.tenantId,
    provider: row.provider,
    status: row.status,
    verificationStatus: row.verificationStatus,
    emailFrom: (meta.emailFrom as string) ?? null,
    domain: (meta.domain as string) ?? null,
    domainVerified: !!meta.domainVerified,
    hasApiKey,
    maskedApiKey: storedMask ?? masked,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Public API ─────────────────────────────────────────────────────

/** View for creator UI — never includes raw apiKey. */
export async function getTenantResendIntegration(tenantId: string): Promise<TenantResendView | null> {
  const row = await prisma.tenantIntegration.findUnique({
    where: { tenantId_provider: { tenantId, provider: PROVIDER } },
  });
  if (!row) return null;
  return serialize(row as never);
}

/**
 * Internal helper for communication adapter — returns decrypted apiKey + from
 * only when status is verified. Returns null otherwise so caller falls back to
 * log provider (not platform global) for tenant-owned templates.
 */
export async function getTenantResendConfig(tenantId: string): Promise<{ apiKey: string; emailFrom: string; domain: string } | null> {
  const row = await prisma.tenantIntegration.findUnique({
    where: { tenantId_provider: { tenantId, provider: PROVIDER } },
  });
  if (!row) return null;
  const typed = row as unknown as {
    status: string;
    verificationStatus: string;
    credentials: CredentialsJson | null;
    metadata: MetadataJson | null;
  };
  if (typed.status !== "verified" || typed.verificationStatus !== "verified") return null;
  const enc = typed.credentials?.apiKey;
  const emailFrom = typed.metadata?.emailFrom;
  const domain = typed.metadata?.domain;
  if (!enc || !emailFrom || !domain) return null;
  if (!typed.metadata?.domainVerified) return null;
  try {
    const apiKey = decrypt(enc);
    if (!apiKey || !emailFrom) return null;
    return { apiKey, emailFrom, domain };
  } catch {
    return null;
  }
}

/**
 * Save/connect Resend credentials. Validates shape, encrypts apiKey,
 * stores metadata (non-secret), marks pending, audits. Does not auto-verify
 * beyond storing — caller should call verifyResendIntegration next.
 */
export async function saveResendIntegration(
  tenantId: string,
  input: { apiKey: string; emailFrom: string },
  actor: string,
): Promise<{ success: boolean; integration?: TenantResendView; error?: string }> {
  const apiKey = input.apiKey?.trim();
  const emailFrom = input.emailFrom?.trim();

  if (!apiKey || apiKey.length < 10) return { success: false, error: "API key is required" };
  if (!apiKey.startsWith("re_")) return { success: false, error: "Resend API key must start with re_" };
  if (!emailFrom) return { success: false, error: "Sender address is required" };

  const email = extractEmail(emailFrom);
  if (!email) return { success: false, error: "Sender must be a valid email (e.g. Store <noreply@yourdomain.com>)" };
  const domain = extractDomain(email);
  if (!domain) return { success: false, error: "Could not extract domain from sender address" };

  try {
    const encrypted = encrypt(apiKey);
    const masked = maskKey(apiKey);
    const metadata: Record<string, unknown> = { emailFrom, domain, domainVerified: false, maskedApiKey: masked };

    const existing = await prisma.tenantIntegration.findUnique({
      where: { tenantId_provider: { tenantId, provider: PROVIDER } },
    });

    let row: unknown;
    if (existing) {
      row = await prisma.tenantIntegration.update({
        where: { tenantId_provider: { tenantId, provider: PROVIDER } },
        data: {
          status: "pending",
          verificationStatus: "unverified",
          credentials: { apiKey: encrypted } as unknown as object,
          metadata: metadata as object,
          lastVerifiedAt: null,
        },
      });
    } else {
      row = await prisma.tenantIntegration.create({
        data: {
          tenantId,
          provider: PROVIDER,
          status: "pending",
          verificationStatus: "unverified",
          credentials: { apiKey: encrypted } as unknown as object,
          metadata: metadata as object,
        },
      });
    }

    await logAction(tenantId, "integration:resend-connected", { provider: PROVIDER, domain, by: actor }).catch(() => {});
    return { success: true, integration: serialize(row as never) };
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { service: "tenant-integration", operation: "saveResend" });
    // Never echo apiKey
    return { success: false, error: err instanceof Error && err.message.includes("TOKEN_ENCRYPTION_KEY") ? "Encryption configuration error" : "Failed to save integration" };
  }
}

/**
 * Verify credentials and domain against Resend API.
 * Checks: API key validity + domain verified status.
 * Docs: GET https://api.resend.com/domains — bearer apiKey.
 * Never invents HMAC.
 */
export async function verifyResendIntegration(
  tenantId: string,
  actor: string,
): Promise<{ success: boolean; verified?: boolean; integration?: TenantResendView; error?: string }> {
  const row = await prisma.tenantIntegration.findUnique({
    where: { tenantId_provider: { tenantId, provider: PROVIDER } },
  });
  if (!row) return { success: false, error: "No Resend integration to verify" };

  const typed = row as unknown as {
    id: string;
    credentials: CredentialsJson | null;
    metadata: MetadataJson | null;
  };
  const enc = typed.credentials?.apiKey;
  const emailFrom = typed.metadata?.emailFrom;
  const domain = typed.metadata?.domain;
  if (!enc || !emailFrom || !domain) return { success: false, error: "Integration is incomplete — re-save your API key and sender" };

  let apiKey: string;
  try {
    apiKey = decrypt(enc);
  } catch {
    await prisma.tenantIntegration.update({
      where: { tenantId_provider: { tenantId, provider: PROVIDER } },
      data: { status: "failed", verificationStatus: "failed" },
    });
    return { success: false, error: "Stored credentials could not be decrypted — please re-save your API key" };
  }

  // Extract domain again to guard against metadata drift
  const email = extractEmail(emailFrom);
  const expectedDomain = email ? extractDomain(email) : domain;
  if (!expectedDomain) return { success: false, error: "Sender domain is invalid" };

  try {
    const res = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 || res.status === 403) {
      await prisma.tenantIntegration.update({
        where: { tenantId_provider: { tenantId, provider: PROVIDER } },
        data: { status: "failed", verificationStatus: "failed", metadata: { ...(typed.metadata as object), domainVerified: false } as never },
      });
      await logAction(tenantId, "integration:resend-verify-failed", { provider: PROVIDER, reason: "unauthorized", by: actor }).catch(() => {});
      return { success: false, error: "Resend rejected the API key — check that it starts with re_ and is active" };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      await logAction(tenantId, "integration:resend-verify-failed", { provider: PROVIDER, status: res.status, by: actor }).catch(() => {});
      return { success: false, error: `Resend verification failed (${res.status}): ${text.slice(0, 200)}` };
    }

    const body = (await res.json()) as { data?: Array<{ name?: string; status?: string }> } | Array<{ name?: string; status?: string }>;
    const domains: Array<{ name?: string; status?: string }> = Array.isArray(body) ? body : (body?.data ?? []);

    const match = domains.find((d) => (d.name ?? "").toLowerCase() === expectedDomain.toLowerCase());

    if (!match) {
      await prisma.tenantIntegration.update({
        where: { tenantId_provider: { tenantId, provider: PROVIDER } },
        data: {
          status: "failed",
          verificationStatus: "failed",
          metadata: { ...(typed.metadata as object), domain: expectedDomain, domainVerified: false } as never,
        },
      });
      return { success: false, error: `Domain ${expectedDomain} not found in your Resend account — add and verify it in resend.com/domains` };
    }

    const verified = (match.status ?? "").toLowerCase() === "verified";

    if (!verified) {
      await prisma.tenantIntegration.update({
        where: { tenantId_provider: { tenantId, provider: PROVIDER } },
        data: {
          status: "failed",
          verificationStatus: "failed",
          metadata: { ...(typed.metadata as object), domain: expectedDomain, domainVerified: false } as never,
        },
      });
      await logAction(tenantId, "integration:resend-verify-failed", { provider: PROVIDER, domain: expectedDomain, status: match.status, by: actor }).catch(() => {});
      return { success: false, error: `Domain ${expectedDomain} is ${match.status ?? "not verified"} — verify DNS in Resend before sending` };
    }

    const updated = await prisma.tenantIntegration.update({
      where: { tenantId_provider: { tenantId, provider: PROVIDER } },
      data: {
        status: "verified",
        verificationStatus: "verified",
        lastVerifiedAt: new Date(),
        metadata: { ...(typed.metadata as object), domain: expectedDomain, domainVerified: true } as never,
      },
    });

    await logAction(tenantId, "integration:resend-verified", { provider: PROVIDER, domain: expectedDomain, by: actor }).catch(() => {});
    return { success: true, verified: true, integration: serialize(updated as never) };
  } catch (err) {
    // Network/timeout etc — do not mark failed permanently, keep pending so retry is possible
    captureError(err instanceof Error ? err : new Error(String(err)), { service: "tenant-integration", operation: "verifyResend" });
    return { success: false, error: err instanceof Error ? err.message.slice(0, 300) : "Verification could not be completed — try again" };
  }
}

export async function disconnectResendIntegration(
  tenantId: string,
  actor: string,
): Promise<{ success: boolean; error?: string }> {
  const row = await prisma.tenantIntegration.findUnique({
    where: { tenantId_provider: { tenantId, provider: PROVIDER } },
  });
  if (!row) return { success: false, error: "No Resend integration to disconnect" };

  await prisma.tenantIntegration.update({
    where: { tenantId_provider: { tenantId, provider: PROVIDER } },
    data: {
      status: "disconnected",
      verificationStatus: "unverified",
      credentials: null as never,
      metadata: {} as never,
      lastVerifiedAt: null,
    },
  });

  await logAction(tenantId, "integration:resend-disconnected", { provider: PROVIDER, by: actor }).catch(() => {});
  return { success: true };
}

// Test-only export for helpers
export const __testables = { extractEmail, extractDomain, maskKey, PROVIDER };
