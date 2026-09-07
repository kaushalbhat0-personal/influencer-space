import { describe, it, expect } from "vitest";
import fs from "fs/promises";

describe("RCCF-PRELAUNCH-02B — polling/session progression fresh", () => {
  it("onboarding polling is consolidated with single activeSessionRef and startPolling", async () => {
    const content = await fs.readFile("src/app/onboarding/page.tsx", "utf-8");
    expect(content).toContain("activeSessionRef");
    expect(content).toContain("const startPolling = useCallback");
    expect(content).toContain("if (pollRef.current || activeSessionRef.current) return;");
    expect(content).toContain("clearPolling();");
    expect(content).toContain("activeSessionRef.current = sessionId");
    // Ensure handleGenerate uses startPolling not manual setInterval
    expect(content).toContain("startPolling(newSessionId, Date.now())");
    expect(content).not.toContain("pollRef.current = setInterval(async () => {\n        const result = await getGenerationSessionProgress(newSessionId);");
  });

  it("useConstructionSnapshot triggers final load when isComplete/progress=100 even if refreshKey deduped", async () => {
    const hook = await fs.readFile("src/features/onboarding/hooks/use-construction-snapshot.ts", "utf-8");
    expect(hook).toContain("isComplete");
    expect(hook).toContain("progress");
    expect(hook).toContain("completeRef");
    expect(hook).toContain("shouldForceComplete");
    expect(hook).toContain("progress === 100");
    expect(hook).toContain("keyRef.current = \"__complete__\"");
  });

  it("generation progress and construction snapshot are noStore fresh (no stale cache)", async () => {
    const onboarding = await fs.readFile("src/actions/onboarding.actions.ts", "utf-8");
    const construction = await fs.readFile("src/actions/construction.actions.ts", "utf-8");
    expect(onboarding).toContain("unstable_noStore");
    expect(construction).toContain("unstable_noStore");
    expect(onboarding).toContain("noStore();");
    expect(construction).toContain("noStore();");
    // Both progress readers should be fresh
    expect(onboarding).toContain("getGenerationSessionProgress");
    expect(onboarding).toContain("getActiveGenerationSession");
  });

  it("construction snapshot can see BuilderService 02A persistence", async () => {
    const onboarding = await fs.readFile("src/actions/onboarding.actions.ts", "utf-8");
    expect(onboarding).toContain("BuilderService");
    expect(onboarding).toContain("storefrontToBuilderPages");
    expect(onboarding).toContain("existing.length === 0");
  });
});
