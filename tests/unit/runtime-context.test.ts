import { describe, it, expect, vi } from "vitest";

import {
  makePreviewSnapshot,
  computeOnboardingPreview,
} from "@/modules/runtime-context";
import { applyGoalSectionPriority } from "@/modules/goals-runtime";
import type { GoalProfile } from "@/modules/goals-runtime";
import { runtimeEventBus } from "@/modules/event-runtime";
import { INTELLIGENCE_EVENT_TYPES } from "@/modules/event-runtime";

function profileOf(...weights: Array<[string, number]>): GoalProfile {
  return {
    weights: weights.map(([goalId, weight]) => ({ goalId, weight }) as never),
    updatedAt: "",
    source: "manual",
    entityType: "creator",
  };
}

describe("Runtime Context — Onboarding Preview (Phase 2)", () => {
  it("builds a synthetic snapshot from an imported profile", () => {
    const snapshot = makePreviewSnapshot({
      name: "Rahul Fitness",
      bio: "Certified coach",
      category: "fitness",
      platform: "youtube",
      socialLinks: [{ platform: "youtube", url: "https://youtube.com/@rahul" }],
    });
    expect(snapshot.entityType).toBe("fitness");
    expect(snapshot.identity.name).toBe("Rahul Fitness");
    expect(snapshot.social.socialLinkCount).toBe(1);
  });

  it("computes knowledge score + a weighted goal profile + top recommendations", () => {
    const preview = computeOnboardingPreview({
      name: "Rahul Fitness",
      bio: "Certified fitness coach helping beginners build sustainable habits.",
      category: "fitness",
      platform: "youtube",
      socialLinks: [{ platform: "youtube", url: "https://youtube.com/@rahul" }],
    });

    const total = preview.goalProfile.weights.reduce((sum, w) => sum + w.weight, 0);
    expect(total).toBe(100);
    expect(preview.goalProfile.weights[0]!.goalId).toBe("GET_BOOKINGS");
    expect(preview.knowledgeScore.overall).toBeGreaterThan(0);
    expect(preview.topRecommendations.length).toBeLessThanOrEqual(3);
    expect(Array.isArray(preview.questions)).toBe(true);
  });

  it("falls back to the creator pack for unknown categories", () => {
    const preview = computeOnboardingPreview({
      name: "Gamer",
      bio: "",
      category: "gaming",
      platform: "twitch",
      socialLinks: [],
    });
    expect(preview.goalProfile.entityType).toBe("creator");
  });
});

describe("Runtime Context — Generation goal ordering (Phase 3)", () => {
  const sections = [
    { type: "hero" },
    { type: "gallery" },
    { type: "products" },
    { type: "testimonials" },
    { type: "footer" },
  ];

  it("orders goal-preferred sections earlier, hero first and footer last", () => {
    const ordered = applyGoalSectionPriority(sections, profileOf(["SELL_PRODUCTS", 100]));
    const order = ordered.map((s) => s.type);
    expect(order[0]).toBe("hero");
    expect(order[order.length - 1]).toBe("footer");
    expect(order.indexOf("products")).toBeLessThan(order.indexOf("gallery"));
  });

  it("is a no-op without a goal profile", () => {
    expect(applyGoalSectionPriority(sections, null)).toBe(sections);
  });
});

describe("Runtime Event Bus (Phase 9)", () => {
  it("publishes to in-memory subscribers and supports unsubscribe", async () => {
    const handler = vi.fn();
    const unsubscribe = runtimeEventBus.subscribe("goal.updated", handler);

    await runtimeEventBus.publish({
      type: "goal.updated",
      tenantId: "t1",
      entityId: "GET_BOOKINGS",
      occurredAt: new Date().toISOString(),
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].type).toBe("goal.updated");
    expect(handler.mock.calls[0][0].tenantId).toBe("t1");

    unsubscribe();
    await runtimeEventBus.publish({
      type: "goal.updated",
      tenantId: "t2",
      occurredAt: new Date().toISOString(),
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("declares the canonical event types", () => {
    for (const expected of [
      "knowledge.completed",
      "goal.updated",
      "recommendation.accepted",
      "recommendation.dismissed",
      "milestone.unlocked",
      "storefront.published",
      "theme.changed",
      "builder.published",
      "commerce.created",
      "booking.received",
      "product.created",
      "generation.completed",
      "onboarding.completed",
    ]) {
      expect(INTELLIGENCE_EVENT_TYPES).toContain(expected);
    }
  });
});
