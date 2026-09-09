/**
 * RCCF-OBS-03 — Vercel business events bridge.
 * Bridges internal analytics to official Vercel Analytics track() API.
 * Strict allowlist: no email, payment amount, tokens, credentials, raw bodies.
 * TenantId must be server-derived, sampling for high-volume.
 */

import { track as vercelTrack } from "@vercel/analytics";

type VercelEventProps = Record<string, string | number | boolean | null>;

function sanitizeProps(props: VercelEventProps): VercelEventProps {
  const out: VercelEventProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    // Allowlist keys — drop anything sensitive
    if (/email|token|secret|password|key|amount|price|payment|credential|body|content|payload/i.test(k)) continue;
    if (typeof v === "string" && v.includes("@")) continue;
    if (typeof v === "string" && v.length > 200) out[k] = v.slice(0, 200);
    else out[k] = v;
  }
  return out;
}

function safeTrack(event: string, props: VercelEventProps = {}) {
  try {
    const clean = sanitizeProps(props);
    // Fire-and-forget, never throw
    vercelTrack(event, clean as never);
  } catch {}
}

// 13-event taxonomy — business milestones only
export const VercelEvents = {
  signupCompleted: (p: { persona?: string; tenantId?: string }) =>
    safeTrack("signup_completed", { persona: p.persona ?? null, tenantId: p.tenantId ?? null }),
  onboardingStarted: (p: { platform?: string; tenantId?: string }) =>
    safeTrack("onboarding_started", { platform: p.platform ?? null, tenantId: p.tenantId ?? null }),
  generationStarted: (p: { tenantId?: string; correlationId?: string }) =>
    safeTrack("generation_started", { tenantId: p.tenantId ?? null, correlationId: p.correlationId ?? null }),
  generationCompleted: (p: { tenantId?: string; durationMs?: number }) =>
    safeTrack("generation_completed", { tenantId: p.tenantId ?? null, durationMs: p.durationMs ?? null }),
  websitePublished: (p: { tenantId?: string; version?: number }) =>
    safeTrack("website_published", { tenantId: p.tenantId ?? null, version: p.version ?? null }),
  storefrontViewed: (p: { tenantId?: string }) => {
    // Sample high-volume: 10% (like flood sampling)
    if (Math.random() > 0.1) return;
    safeTrack("storefront_viewed", { tenantId: p.tenantId ?? null });
  },
  builderEdit: (p: { tenantId?: string }) => safeTrack("builder_edit", { tenantId: p.tenantId ?? null }),
  agencyCreated: (p: { agencyId?: string }) => safeTrack("agency_created", { agencyId: p.agencyId ?? null }),
  clientWebsiteCreated: (p: { agencyId?: string; tenantId?: string }) => safeTrack("client_website_created", { agencyId: p.agencyId ?? null, tenantId: p.tenantId ?? null }),
  claimCompleted: (p: { tenantId?: string }) => safeTrack("claim_completed", { tenantId: p.tenantId ?? null }),
  integrationConnected: (p: { provider?: string; tenantId?: string }) => safeTrack("integration_connected", { provider: p.provider ?? null, tenantId: p.tenantId ?? null }),
  checkoutStarted: (p: { tenantId?: string; provider?: string; strategy?: string }) => safeTrack("checkout_started", { tenantId: p.tenantId ?? null, provider: p.provider ?? null, strategy: p.strategy ?? null }),
  checkoutCompleted: (p: { tenantId?: string; provider?: string }) => safeTrack("checkout_completed", { tenantId: p.tenantId ?? null, provider: p.provider ?? null }),
};

// Server-side variant for server actions (uses same track, works in server)
export async function trackServer(event: string, props: VercelEventProps = {}) {
  try {
    const { track: serverTrack } = await import("@vercel/analytics/server");
    const clean = sanitizeProps(props);
    await (serverTrack as unknown as (e: string, p: VercelEventProps) => Promise<void>)(event, clean);
  } catch {
    safeTrack(event, props);
  }
}
