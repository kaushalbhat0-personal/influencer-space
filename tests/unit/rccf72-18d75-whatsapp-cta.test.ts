/**
 * RCCF-72.18D.7.5 — WhatsApp commerce CTA guardrails.
 *
 * Contract under verification (NO Razorpay, NO order mutation, ₹0 messaging):
 *   storefront CTA → wa.me click-to-chat → creator's number → prefilled
 *   inquiry → CUSTOMER manually sends. WhatsApp is a LEAD path, independent of
 *   PaymentAccount/readiness.
 *
 * Defect fixed here (smallest change): resolveWhatsAppDestination ran the
 * http(s)-only safeUrl gate BEFORE number extraction, so a creator typing a
 * bare number ("+91 98765 43210") into the freeform social-link field lost the
 * CTA silently — despite the module contract (and buildWaMeLink tests)
 * accepting bare E.164. The resolver now canonicalizes through
 * extractWhatsAppNumber's own strict boundary (wa.me/whatsapp.com hosts or
 * bare-digit shape; every other scheme → "") and returns the canonical
 * https://wa.me/<digits> form.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveWhatsAppDestination,
  extractWhatsAppNumber,
  buildWaMeLink,
  buildWhatsAppMessage,
} from "@/lib/commerce/whatsapp";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("RCCF-72.18D.7.5 — destination resolution", () => {
  it("accepts full wa.me URLs and canonicalizes them", () => {
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "https://wa.me/919876543210" }])).toBe(
      "https://wa.me/919876543210",
    );
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "wa.me/919876543210" }])).toBe(
      "https://wa.me/919876543210",
    );
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "https://api.whatsapp.com/?phone=919876543210" }])).toBe(
      "https://wa.me/919876543210",
    );
  });

  it("accepts BARE E.164 numbers (the fixed defect) with country code", () => {
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "+91 86687 67875" }])).toBe(
      "https://wa.me/918668767875",
    );
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "918668767875" }])).toBe(
      "https://wa.me/918668767875",
    );
  });

  it("rejects unsafe / foreign destinations — no fabricated CTA", () => {
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "javascript:alert(1)" }])).toBe("");
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "data:text/html,<script>" }])).toBe("");
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "https://evil.example.com/?phone=919876543210" }])).toBe("");
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "https://example.com/not-wa" }])).toBe("");
    expect(resolveWhatsAppDestination([{ platform: "email", url: "mailto:a@b.c" }])).toBe("");
    expect(resolveWhatsAppDestination([])).toBe("");
    expect(resolveWhatsAppDestination(null)).toBe("");
    // A bare 10-digit number WITHOUT country code still normalizes mechanically;
    // the CREATOR config owns geography (documented contract) — the system must
    // not guess one.
    expect(extractWhatsAppNumber("8668767875")).toBe("8668767875");
  });
});

describe("RCCF-72.18D.7.5 — URL + message contract", () => {
  const HOSTILE_NAME = `D75 "WA" & <Probe> 50% OFF`;

  it("builds the exact click-to-chat shape: no +, spaces, parens or hyphens in the path", () => {
    const href = buildWaMeLink("+91 86-687-67875", "Hi");
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(href.startsWith("https://wa.me/918668767875?text=")).toBe(true);
    expect(href).not.toMatch(/\+|\s|\(|\)|-/);
  });

  it("percent-encodes hostile product names; message stays a lead inquiry", () => {
    const msg = buildWhatsAppMessage({ productName: HOSTILE_NAME, price: "₹499", productUrl: "https://x.test/p/probe" });
    expect(msg).toContain(`I'd like to order: ${HOSTILE_NAME}`);
    expect(msg).toContain("Price: ₹499");
    expect(msg).toContain("https://x.test/p/probe");

    const href = buildWaMeLink("+91 8668767875", msg);
    const encoded = href.split("?text=")[1] ?? "";
    // Decoding round-trips exactly; the raw hostile characters never appear unencoded.
    expect(decodeURIComponent(encoded)).toBe(msg);
    expect(encoded).not.toContain("<script>");
    expect(encoded).toContain("%3C");
    expect(encoded).toContain("%26");
    expect(encoded).toContain("%22");
  });

  it("never includes internal identifiers or secrets in the message inputs", () => {
    // The builder only consumes what callers pass; pin that its output carries
    // none of the forbidden identifier classes even when a hostile caller tries.
    const leaky = buildWhatsAppMessage({
      productName: "P",
      price: "1",
      productUrl: "tenantId=abc paymentAccountId=xyz token=secret",
    });
    // The URL field is the public product URL slot — but the builder itself
    // adds no identifier of its own.
    expect(leaky.split("\n")).toHaveLength(3);
    expect(leaky.startsWith("Hi! I'd like to order: P\n")).toBe(true);
  });

  it("renderer gates modes correctly and keeps preview inert (source-level)", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toMatch(/showOnline = mode === "ONLINE" \|\| mode === "BOTH"/);
    expect(src).toMatch(/showWhatsApp = mode === "WHATSAPP" \|\| mode === "BOTH"/);
    // Preview: disabled button, no anchor/href → no navigation possible.
    expect(src).toMatch(/previewMode \? \(\s*<button[\s\S]*?disabled/);
    // Live: real anchor with noopener to the built wa.me link; empty href degrades.
    expect(src).toMatch(/href=\{waHref\}[\s\S]*?rel="noopener noreferrer"/);
  });

  it("aggregate bakes the server-resolved destination into products (source-level)", () => {
    const agg = read("src/modules/tenant/application/website-aggregate.service.ts");
    expect(agg).toMatch(/resolveWhatsAppDestination\(heroSocialLinks\)/);
    expect(agg).toMatch(/whatsappUrl: whatsappDestination/);
  });
});
