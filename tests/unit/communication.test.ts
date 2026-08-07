import { describe, it, expect } from "vitest";
import { renderTemplate, validateTemplate } from "@/modules/communication";
import { COMMUNICATION_REGISTRY, COMMUNICATION_BY_ID } from "@/modules/communication";
import { getAdapter } from "@/modules/communication";
import { NOTIFICATION_CATEGORIES } from "@/modules/communication";

describe("RCCF-TRACK-02 — template runtime", () => {
  it("renders {{variables}} and leaves unknown placeholders untouched", () => {
    expect(renderTemplate("Hello {{name}}, plan {{plan}}", { name: "Ana", plan: "Growth" })).toBe("Hello Ana, plan Growth");
    expect(renderTemplate("₹{{amount}}", { amount: 699 })).toBe("₹699");
    expect(renderTemplate("missing {{x}}", {})).toBe("missing {{x}}");
  });

  it("reports missing template variables", () => {
    expect(validateTemplate("{{a}} and {{b}}", { a: 1 })).toEqual(["b"]);
    expect(validateTemplate("{{a}}", { a: 1 })).toEqual([]);
  });
});

describe("RCCF-TRACK-02 — communication registry", () => {
  it("declares canonical communications with complete surfaces", () => {
    expect(COMMUNICATION_REGISTRY.length).toBeGreaterThan(5);
    for (const c of COMMUNICATION_REGISTRY) {
      expect(typeof c.id).toBe("string");
      expect(["creator", "agency", "super_admin"]).toContain(c.audience);
      expect(["email", "in_app", "alert", "sms", "whatsapp", "push"]).toContain(c.channel);
      expect(typeof c.template.subject).toBe("string");
      expect(typeof c.template.body).toBe("string");
      expect(c.retries).toBeGreaterThanOrEqual(0);
    }
  });

  it("has unique ids and the order/billing/admin alerts", () => {
    const ids = COMMUNICATION_REGISTRY.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(COMMUNICATION_BY_ID["order.confirmed"]).toBeDefined();
    expect(COMMUNICATION_BY_ID["subscription.trial_ending"]).toBeDefined();
    expect(COMMUNICATION_BY_ID["alert.failed_generation"]).toBeDefined();
    expect(COMMUNICATION_BY_ID["commission.ready"]?.audience).toBe("agency");
  });
});

describe("RCCF-TRACK-02 — provider adapters", () => {
  it("routes channels to the right adapter", () => {
    expect(getAdapter("email")?.channel).toBe("email");
    expect(getAdapter("in_app")?.channel).toBe("in_app");
    expect(getAdapter("alert")?.channel).toBe("alert");
    expect(getAdapter("sms")).toBeNull(); // future channel, no adapter yet
  });
});

describe("RCCF-TRACK-02 — notification preferences", () => {
  it("covers the canonical categories", () => {
    for (const c of ["commerce", "orders", "payments", "builder", "website", "recommendations", "business_health", "billing", "security", "marketing", "customer_success", "system"]) {
      expect(NOTIFICATION_CATEGORIES).toContain(c);
    }
  });
});
