// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// RCCF-71.4.1 P2 — "Build Manually → Continue to Theme Selection" stayed on
// /onboarding for 30s. Root cause: the provider card auto-fired provisioning
// AND the continuation CTA navigated to /admin/create independently. Clicking
// the CTA while provisioning was in flight hit the lifecycle before the
// session refresh (token still AUTHENTICATED, no tenantId), so middleware
// silently bounced /admin/create → /onboarding — no visible error, no
// navigation.
//
// Fix: the CTA is the SINGLE trigger (card click no longer auto-provisions),
// it is disabled while provisioning runs (visible spinner), errors render, and
// on success it performs a FULL document navigation to /admin/create (Theme
// Selection) so the on-demand compile never aborts a soft navigation.
//
// Guardrails pinned here:
//   CORRECT: card click no longer calls handleBuildManually(); CTA is
//     disabled={loading}; CTA shows a spinner while loading; success does
//     window.location.href = "/admin/create".
//   WRONG:   no `router.push("/admin/create")` and no card-click auto-fire
//     (`p.inputType === "none"` + handleBuildManually in the card onClick).
//   PRESERVED: createManualWebsite + refresh-session are still invoked.

describe("RCCF-71.4.1 P2 — Build Manually continuation no longer races provisioning", () => {
  const src = readFileSync("src/app/onboarding/page.tsx", "utf8");

  it("card click selects the provider but does NOT auto-fire provisioning", () => {
    const cardBlock = src.slice(src.indexOf("providers.map((p: ImportProvider) =>"), src.indexOf('inputType !== "none" && ('));
    expect(cardBlock).toContain("setSelectedProvider(p)");
    // WRONG token absent: the card onClick no longer triggers the async
    // provisioning, so the CTA below stays the single explicit continuation.
    expect(cardBlock).not.toContain("handleBuildManually()");
    expect(cardBlock).not.toContain("void handleBuildManually");
  });

  it("Continue to Theme Selection is gated on loading with a visible spinner", () => {
    const ctaBlock = src.slice(src.indexOf('inputType === "none" && ('), src.indexOf("{step === \"preview\""));
    expect(ctaBlock).toContain("Continue to Theme Selection");
    expect(ctaBlock).toContain("disabled={loading}");
    expect(ctaBlock).toContain("Loader2");
    expect(ctaBlock).toContain("Preparing your website");
    // WRONG token absent: the CTA no longer performs an ungated soft push that
    // bounced back to /onboarding mid-provision.
    expect(ctaBlock).not.toContain('router.push("/admin/create")');
  });

  it("provisions via createManualWebsite, refreshes the session, then full-navigates to Theme Selection", () => {
    const buildBlock = src.slice(src.indexOf("const handleBuildManually"), src.indexOf("const handleRetryPublish"));
    expect(buildBlock).toContain("createManualWebsite()");
    expect(buildBlock).toContain('fetch("/api/auth/refresh-session"');
    // CORRECT token: full document navigation waits for the route compile.
    expect(buildBlock).toContain('window.location.href = "/admin/create"');
    // WRONG token absent: the old soft replace to the dashboard is gone.
    expect(buildBlock).not.toContain('router.replace("/admin/dashboard")');
    expect(buildBlock).not.toContain('router.push("/admin/create")');
  });

  it("keeps failures visible on the onboarding page", () => {
    const buildBlock = src.slice(src.indexOf("const handleBuildManually"), src.indexOf("const handleRetryPublish"));
    expect(buildBlock).toContain('setError(res.error || "We couldn\'t create your website. Please try again.")');
    expect(buildBlock).toContain('setError("We couldn\'t create your website. Please try again.")');
    // The error block is already rendered below the CTA (visible failure state).
    expect(src).toContain("{error && (");
  });
});
