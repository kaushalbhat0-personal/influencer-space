// ── RCCF-71.4.3 — Growth entitlement: signup-plan mismatch + premium_themes ─
// Guardrails that (a) self-serve signup remains FREE-only (RCCF-LAUNCH-01) and
// the wizard only offers registration-provisionable plans (no paid plans at
// signup, no paid TRIALING granted), and (b) premium_themes is unlocked only
// by a legitimately ACTIVE/PAID plan code via the canonical Capability Runtime
// — never hardcoded in the Builder and never driven by client-side logic.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSignupEligiblePlans, getPlansByFamily, entitlementService } from "@/lib/capabilities";

const repoRoot = resolve(process.cwd());

function read(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

// ── Signup is FREE-only: the wizard offers only provisionable plans ────────

describe("RCCF-71.4.3 — signup plan step only offers registration-provisionable plans", () => {
  it("creator signup offers exactly the free Creator Launch plan", () => {
    const codes = getSignupEligiblePlans("creator").map((p) => p.code);
    expect(codes).toEqual(["creator_launch"]);
  });

  it("agency signup offers exactly the free Partner Launch plan", () => {
    const codes = getSignupEligiblePlans("agency").map((p) => p.code);
    expect(codes).toEqual(["partner_free"]);
  });

  it("paid creator plans are NOT offered at signup (checkout-only)", () => {
    const signup = new Set(getSignupEligiblePlans("creator").map((p) => p.code));
    for (const p of getPlansByFamily("creator")) {
      if (p.ctaType === "checkout") {
        expect(signup.has(p.code)).toBe(false);
      }
    }
  });

  it("the signup form filters the plan step through getSignupEligiblePlans", () => {
    const src = read("src/components/auth/signup/SignupForm.tsx");
    expect(src).toContain("getSignupEligiblePlans(state.persona === \"agency\" ? \"agency\" : \"creator\")");
  });

  it("the signup form rejects a paid plan code in the URL (falls back to no pre-selection)", () => {
    const src = read("src/components/auth/signup/SignupForm.tsx");
    expect(src).toContain("getSignupEligiblePlans(personaForPlan === \"agency\" ? \"agency\" : \"creator\").some");
  });

  it("the signup form no longer lists enterprise/contact plans as selectable", () => {
    const src = read("src/components/auth/signup/SignupForm.tsx");
    expect(src).not.toContain("const enterprise = plans.filter((p) => p.ctaType === \"contact\")");
  });

  it("the registry-driven helper is exported from the capabilities index", () => {
    expect(read("src/lib/capabilities/index.ts")).toContain("getSignupEligiblePlans");
  });
});

// ── Registration stays FREE-only (RCCF-LAUNCH-01) ─────────────────────────

describe("RCCF-71.4.3 — register route never grants a paid plan at signup", () => {
  it("creator registration hardcodes the free Creator Launch plan", () => {
    const src = read("src/app/api/auth/register/route.ts");
    expect(src).toContain('const requestedPlanCode = "creator_launch"');
  });

  it("agency registration hardcodes the free Partner Launch plan", () => {
    const src = read("src/app/api/auth/register/route.ts");
    expect(src).toContain('const requestedPlanCode = "partner_free"');
  });

  it("registration never reads body.planCode (client input has no plan authority)", () => {
    const src = read("src/app/api/auth/register/route.ts");
    expect(src).not.toMatch(/body\.planCode|body\?\.planCode/);
  });

  it("no paid plan is granted as a TRIALING subscription at signup", () => {
    const src = read("src/app/api/auth/register/route.ts");
    expect(src).not.toMatch(/creator_grow|creator_scale|creator_enterprise/);
    // Subscriptions created at signup are always TRIALING (free-trial lifecycle);
    // a paid plan must never be dropped straight into ACTIVE at registration.
    const subscriptionBlock = src.slice(src.indexOf("billingSubscription.create"));
    expect(subscriptionBlock).toContain('status: "TRIALING"');
    expect(subscriptionBlock).not.toContain('status: "ACTIVE"');
  });

  it("the signup form still posts planCode (server decides; client is not authoritative)", () => {
    const src = read("src/components/auth/signup/SignupForm.tsx");
    expect(src).toContain("planCode: state.selectedPlan");
  });
});

// ── premium_themes via the canonical Capability Runtime ───────────────────

describe("RCCF-71.4.3 — premium_themes is plan-code driven by the Capability Runtime", () => {
  it("Launch (free) does NOT unlock premium_themes", () => {
    expect(entitlementService.has("creator_launch", "premium_themes")).toBe(false);
  });

  it("a legitimately paid/active Growth plan unlocks premium_themes", () => {
    expect(entitlementService.has("creator_grow", "premium_themes")).toBe(true);
  });

  it("Scale unlocks premium_themes (no regression)", () => {
    expect(entitlementService.has("creator_scale", "premium_themes")).toBe(true);
  });

  it("an unknown plan code never unlocks premium_themes", () => {
    expect(entitlementService.has("unknown_plan", "premium_themes")).toBe(false);
  });

  it("the Builder gate still derives premiumThemes from the server capability runtime", () => {
    const src = read("src/actions/builder-overview.actions.ts");
    expect(src).toContain('entitlementService.has(planResolved.code, "premium_themes")');
    expect(src).toContain("capabilities: { premiumThemes, advancedBuilder }");
  });

  it("the Builder never hardcodes premium_themes per plan code", () => {
    const canvas = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(canvas).not.toMatch(/creator_launch|creator_grow|creator_scale/i);
    const panel = read("src/features/builder/components/appearance-panel.tsx");
    expect(panel).not.toMatch(/creator_launch|creator_grow|creator_scale/i);
  });
});
