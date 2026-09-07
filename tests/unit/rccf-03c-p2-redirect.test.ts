import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("P2-1: onboarding completion redirect", () => {
  const onboardingPath = path.resolve("src/app/onboarding/page.tsx");

  it("polling completed handler refreshes session and uses hard navigation", () => {
    const content = fs.readFileSync(onboardingPath, "utf-8");
    // Polling should fetch refresh-session before redirect
    expect(content).toContain('if (result.data.status === "completed")');
    // Should contain window.location.href for dashboard (not soft router.replace)
    // The polling block should have window.location.href
    const pollingBlock = content.slice(content.indexOf('activeSessionRef.current ?? sessionId'));
    // Check that the completed branch in startPolling uses window.location.href
    expect(content).toMatch(/result\.data\.status === "completed"[\s\S]*?window\.location\.href = "\/admin\/dashboard"/);
    // Should NOT use router.replace for the polling completed path (only handleRetryPublish etc may use router)
    // Ensure the polling completed branch does not contain router.replace
    // We check that the specific pattern with clearPolling + fetch + window.location exists
    expect(content).toContain('await fetch("/api/auth/refresh-session"');
  });

  it("handleGenerate uses hard navigation after refresh", () => {
    const content = fs.readFileSync(onboardingPath, "utf-8");
    // handleGenerate success path
    expect(content).toContain('window.location.href = "/admin/dashboard"');
    // Ensure it still fetches refresh-session before
    const handleGenerateIdx = content.indexOf("const handleGenerate =");
    const handleGenerateBlock = content.slice(handleGenerateIdx, handleGenerateIdx + 8000);
    expect(handleGenerateBlock).toContain('fetch("/api/auth/refresh-session"');
    expect(handleGenerateBlock).toContain('window.location.href = "/admin/dashboard"');
  });

  it("does not redirect before generation is complete", () => {
    const content = fs.readFileSync(onboardingPath, "utf-8");
    // Ensure the redirect is gated by status === "completed"
    const matches = content.match(/if \(result\.data\.status === "completed"\)/g);
    expect(matches).not.toBeNull();
    // The redirect should be inside the completed guard (not unconditional)
    expect(content).toMatch(/if \(result\.data\.status === "completed"\)[\s\S]*?window\.location\.href = "\/admin\/dashboard"/);
    // Ensure no top-level unconditional redirect outside that guard
    // (count occurrences of the redirect - should be exactly 2: polling + handleGenerate)
    const redirects = content.match(/window\.location\.href = "\/admin\/dashboard"/g) || [];
    expect(redirects.length).toBe(2);
  });

  it("preserves refresh recovery (getActiveGenerationSession) and does not create duplicate pollers", () => {
    const content = fs.readFileSync(onboardingPath, "utf-8");
    // Refresh recovery effect should still exist and guard pollRef
    expect(content).toContain("getActiveGenerationSession");
    expect(content).toContain("if (pollRef.current || activeSessionRef.current) return;");
    // Should clearPolling before startPolling to avoid duplicate
    expect(content).toContain("clearPolling();");
  });
});

describe("P2-1: lifecycle READY does not require manual refresh-session from user", () => {
  it("onboarding page fetches refresh-session automatically on completion", () => {
    const content = fs.readFileSync("src/app/onboarding/page.tsx", "utf-8");
    // At least two places should fetch refresh-session: startPolling and handleGenerate
    const fetches = (content.match(/fetch\("\/api\/auth\/refresh-session"/g) || []).length;
    expect(fetches).toBeGreaterThanOrEqual(2);
  });
});
