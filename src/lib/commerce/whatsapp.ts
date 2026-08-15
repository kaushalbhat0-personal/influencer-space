// ── WhatsApp Commerce — URL + Message Helpers ────────────────
// RCCF-66.2. Thin client-side CTA channel only. NO order creation, NO Razorpay,
// NO payment processing. Builds a safe, prefilled wa.me link from the creator's
// canonical WhatsApp destination (hero_data.socialLinks platform="whatsapp").
//
// Security contract:
//   - accepts a wa.me URL (with or without protocol) or a bare E.164 number
//   - rejects javascript:, data:, file: and arbitrary schemes
//   - message content is encodeURIComponent'd
//   - never includes tenantId / product id / PII / secrets

import { safeUrl } from "@/lib/registry/components/safe-url";

export interface WhatsAppMessageInput {
  productName: string;
  price?: string;
  productUrl?: string;
}

export interface WhatsAppSocialLink {
  platform?: string;
  url?: string;
}

/**
 * Resolve the creator's canonical WhatsApp destination from hero_data
 * socialLinks (platform === "whatsapp"). Server-side only — the storefront
 * client never supplies this. Returns the validated destination or "" so the
 * renderer can degrade gracefully.
 */
export function resolveWhatsAppDestination(socialLinks: WhatsAppSocialLink[] | null | undefined): string {
  const link = (socialLinks ?? []).find((l) => (l.platform ?? "").toLowerCase() === "whatsapp");
  if (!link?.url) return "";
  const safe = safeUrl(link.url);
  if (!safe) return "";
  // The destination must be a wa.me-style URL or a bare number we can build
  // from; otherwise no CTA is rendered.
  return extractWhatsAppNumber(safe) ? safe : "";
}

/**
 * Build the informational order-intent message shown in WhatsApp.
 * The price is DISPLAY ONLY — it is never authoritative and no payment runs.
 */
export function buildWhatsAppMessage(input: WhatsAppMessageInput): string {
  const lines = [`Hi! I'd like to order: ${input.productName}`];
  if (input.price) lines.push(`Price: ${input.price}`);
  if (input.productUrl) lines.push(input.productUrl);
  return lines.join("\n");
}

/**
 * Extract a normalized E.164-ish number from a wa.me URL (with or without
 * protocol) or a bare number. Returns "" for anything unsafe.
 */
export function extractWhatsAppNumber(waUrlOrNumber: string): string {
  const raw = (waUrlOrNumber ?? "").trim();
  if (!raw) return "";

  // Bare number (digits, optional leading +, spaces/dashes ignored).
  const bareDigits = raw.replace(/[^\d]/g, "");
  if (/^\+?[\d\s-]{6,17}$/.test(raw)) {
    return bareDigits.length >= 7 && bareDigits.length <= 15 ? bareDigits : "";
  }

  // URL form: normalise protocol-less wa.me / whatsapp.com URLs, then validate.
  const withScheme = /^https?:\/\//i.test(raw)
    ? raw
    : raw.startsWith("wa.me/") || raw.startsWith("whatsapp.com/")
      ? `https://${raw}`
      : raw;
  const safe = safeUrl(withScheme);
  if (!safe) return "";

  try {
    const url = new URL(safe);
    const host = url.hostname.toLowerCase();
    if (host === "wa.me" || host.endsWith(".wa.me")) {
      const num = url.pathname.replace(/^\/+/, "").split("?")[0].replace(/[^\d]/g, "");
      return num.length >= 7 && num.length <= 15 ? num : "";
    }
    if (host === "api.whatsapp.com" || host === "wa.me" || host.endsWith(".whatsapp.com")) {
      const phone = url.searchParams.get("phone");
      const num = (phone ?? "").replace(/[^\d]/g, "");
      return num.length >= 7 && num.length <= 15 ? num : "";
    }
  } catch {
    return "";
  }
  return "";
}

/**
 * Build a safe prefilled WhatsApp link:
 *   https://wa.me/<number>?text=<encoded message>
 * Returns "" for an invalid destination so the storefront never renders a
 * broken / dangerous link.
 */
export function buildWaMeLink(waUrlOrNumber: string, message: string): string {
  const number = extractWhatsAppNumber(waUrlOrNumber);
  if (!number) return "";
  const text = encodeURIComponent((message ?? "").trim());
  return `https://wa.me/${number}?text=${text}`;
}
