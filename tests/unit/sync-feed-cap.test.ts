import { describe, it, expect } from "vitest";
import { maxNewFeedItems } from "@/app/api/cron/sync-socials/feed-cap";

describe("maxNewFeedItems — RCCF-27 feed cap", () => {
  it("is unbounded for unlimited plans (limit = -1)", () => {
    expect(maxNewFeedItems({ ok: true, limit: -1, used: 3 })).toBe(Number.POSITIVE_INFINITY);
  });

  it("allows only remaining headroom for limited plans", () => {
    expect(maxNewFeedItems({ ok: true, limit: 3, used: 1 })).toBe(2);
    expect(maxNewFeedItems({ ok: true, limit: 3, used: 3 })).toBe(0);
    expect(maxNewFeedItems({ ok: true, limit: 3, used: 5 })).toBe(0);
  });

  it("allows zero new items when the plan is over the limit", () => {
    expect(maxNewFeedItems({ ok: false, limit: 3, used: 3 })).toBe(0);
  });
});