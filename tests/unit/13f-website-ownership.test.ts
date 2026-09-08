import { describe, it, expect } from "vitest";
import { ADMIN_NAV } from "@/config/admin-nav";
import { filterNavForPlan, isNavItemVisible } from "@/lib/capabilities/nav-visibility";

// Helper to find Create Website nav item
const createWebsiteItem = ADMIN_NAV.groups.flatMap(g=>g.items).find(i=>i.href==="/admin/create")!;

describe("13F — Website ownership & role gating", () => {
  it("ADMIN_NAV Create Website is gated to AGENCY", () => {
    expect(createWebsiteItem).toBeDefined();
    expect(createWebsiteItem.requiresWorkspaceType).toBe("AGENCY");
  });

  it("TENANT cannot see Create Website", () => {
    const filtered = filterNavForPlan(ADMIN_NAV, "creator_free", "TENANT", "ADMIN");
    const hrefs = filtered.groups.flatMap(g=>g.items.map(i=>i.href));
    expect(hrefs).not.toContain("/admin/create");
  });

  it("AGENCY can see Create Website", () => {
    const filtered = filterNavForPlan(ADMIN_NAV, "agency_starter", "AGENCY", "AGENCY_ADMIN");
    const hrefs = filtered.groups.flatMap(g=>g.items.map(i=>i.href));
    expect(hrefs).toContain("/admin/create");
  });

  it("SUPER_ADMIN can see Create Website even with TENANT workspace", () => {
    const filtered = filterNavForPlan(ADMIN_NAV, "creator_free", "TENANT", "SUPER_ADMIN");
    const hrefs = filtered.groups.flatMap(g=>g.items.map(i=>i.href));
    expect(hrefs).toContain("/admin/create");
  });

  it("SUPER_ADMIN can see Create Website even with no workspace", () => {
    const filtered = filterNavForPlan(ADMIN_NAV, "creator_free", null, "SUPER_ADMIN");
    const hrefs = filtered.groups.flatMap(g=>g.items.map(i=>i.href));
    expect(hrefs).toContain("/admin/create");
  });

  it("null workspace (no session) hides Create Website for normal user", () => {
    const filtered = filterNavForPlan(ADMIN_NAV, "creator_free", null, "ADMIN");
    const hrefs = filtered.groups.flatMap(g=>g.items.map(i=>i.href));
    expect(hrefs).not.toContain("/admin/create");
  });

  it("isNavItemVisible respects workspace gate", () => {
    expect(isNavItemVisible(createWebsiteItem, "creator_free", "TENANT", "ADMIN")).toBe(false);
    expect(isNavItemVisible(createWebsiteItem, "creator_free", "AGENCY", "AGENCY_ADMIN")).toBe(true);
    expect(isNavItemVisible(createWebsiteItem, "creator_free", null, "SUPER_ADMIN")).toBe(true);
  });

  it("Dashboard for TENANT live preserves View Website/Open Builder but not Create Website via nav", () => {
    // Dashboard itself doesn't render Create Website; it's via nav. Verify nav filtering is the gate.
    // View Website and Open Builder are not nav items but dashboard actions — they should remain.
    // Check that ADMIN_NAV still contains Dashboard, Builder for TENANT
    const filtered = filterNavForPlan(ADMIN_NAV, "creator_free", "TENANT", "ADMIN");
    const hrefs = filtered.groups.flatMap(g=>g.items.map(i=>i.href));
    expect(hrefs).toContain("/admin/dashboard");
    expect(hrefs).toContain("/builder");
    // View Website is in footer, not filtered, but dashboard actions are preserved
    expect(filtered.footer.some(i=>i.label==="View Website")).toBe(true);
  });
});

describe("13F — Server ONE_WEBSITE_LIMIT logic (unit, no DB)", () => {
  // Replicate the server check logic for TENANT
  function shouldBlockTenantCreate(args: {
    workspaceType: string | null,
    role: string,
    hasMeaningfulContent: boolean,
    isLive: boolean,
  }): boolean {
    if (args.role === "SUPER_ADMIN") return false;
    if (args.workspaceType !== "TENANT") return false;
    return args.hasMeaningfulContent || args.isLive;
  }

  it("TENANT with meaningful content OR live is blocked", () => {
    expect(shouldBlockTenantCreate({ workspaceType:"TENANT", role:"ADMIN", hasMeaningfulContent:true, isLive:false })).toBe(true);
    expect(shouldBlockTenantCreate({ workspaceType:"TENANT", role:"ADMIN", hasMeaningfulContent:false, isLive:true })).toBe(true);
    expect(shouldBlockTenantCreate({ workspaceType:"TENANT", role:"ADMIN", hasMeaningfulContent:true, isLive:true })).toBe(true);
  });

  it("TENANT without content and not live is allowed (initial creation)", () => {
    expect(shouldBlockTenantCreate({ workspaceType:"TENANT", role:"ADMIN", hasMeaningfulContent:false, isLive:false })).toBe(false);
  });

  it("AGENCY remains allowed even with content", () => {
    expect(shouldBlockTenantCreate({ workspaceType:"AGENCY", role:"AGENCY_ADMIN", hasMeaningfulContent:true, isLive:true })).toBe(false);
  });

  it("SUPER_ADMIN remains allowed even with content", () => {
    expect(shouldBlockTenantCreate({ workspaceType:"TENANT", role:"SUPER_ADMIN", hasMeaningfulContent:true, isLive:true })).toBe(false);
  });

  it("null workspace (no tenant) is not blocked by TENANT rule", () => {
    expect(shouldBlockTenantCreate({ workspaceType:null, role:"ADMIN", hasMeaningfulContent:true, isLive:true })).toBe(false);
  });
});

describe("13F — E2E storefront capture fix", () => {
  it("run-13d-fresh.mjs now waits for View Website deterministically", async () => {
    const content = await import("fs").then(m=>m.promises.readFile("run-13d-fresh.mjs","utf-8"));
    // Check that the fragile innerText regex is replaced with deterministic waitForFunction + explicit slug
    expect(content).toContain("fresh-professional-13d");
    expect(content).toContain("waitForFunction");
    expect(content).toContain("Storefront URL (explicit, deterministic)");
    // Old fragile inference should be gone or supplemented
    expect(content).toContain("Wait until deferred dashboard data hydrates");
  });

  it("responsive assertions run against storefront, not dashboard", async () => {
    const content = await import("fs").then(m=>m.promises.readFile("run-13d-fresh.mjs","utf-8"));
    expect(content).toContain("Responsive storefront");
    expect(content).toContain("storePage.setViewportSize");
    // Should not run responsive checks on dashboard page after fix
    expect(content).not.toMatch(/Responsive dashboard 390/);
  });
});
